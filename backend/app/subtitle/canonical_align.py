"""
Script-canonical subtitle alignment — Faz 3 (SABIT).

HARD RULE:
    Subtitle metni HER ZAMAN script narration'indan gelir. Whisper transkripti
    asla altyazi olarak gosterilmez (hallucinasyon, Turkce karakter bozulmasi,
    marka/urun ismi kirilmalari riski var).

Whisper'in rolu tek bir seydir: kelime-duzeyi ZAMANLAMA saglamak.

Algoritma (align_script_to_whisper):
  1. Script narration'i kelime token'larina bolunur — orijinal Unicode,
     Turkce karakterler, markalar, urunler korunur.
  2. Whisper'in word-level timing listesi sira ile okunur.
  3. Her script token'i, sirasi gelen Whisper word'un [start, end] araligina
     atanir. Token sayilari tam esit olmak zorunda degil:
       - Script fazla token → son fazla token'lar son Whisper word'un end
         zamanina collapse edilir.
       - Whisper fazla word (halusinasyon/tekrar) → fazlaliklari yutariz;
         bir script token sadece BIR Whisper word alir.
  4. Noktalama ve markalar token olarak kalir; timing'leri bitisik Whisper
     word'un cevresindeki en yakin degere clamp edilir.
  5. Whisper word yoksa (cursor fallback): sahne suresini script token
     sayisina esit bolup her token'a linear bir araliik atariz.

Chunk'lama (chunk_tokens_for_srt):
  - max_chars_per_cue (default 42) ve max_tokens_per_cue (default 12) esiklerine
    kadar soldan saga biriktir.
  - Noktalama (., !, ?, ;, …) karsilasinca o anki cue sonlanir.
  - Cue basligi: ilk token.start, sonu: son token.end.

Bu modul saf Python — httpx/DB bagimliligi yok. Executor ince bir wrapper'dir.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Iterable, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Veri sinflari
# ---------------------------------------------------------------------------


@dataclass
class ScriptToken:
    """Script narration'indan gelen bir kelime + noktalama parcasi."""

    text: str
    # Alignment sonrasi Whisper'dan kopyalanan timing (saniye, sahne-local).
    start: float = 0.0
    end: float = 0.0
    # Bu token bir noktalama mi? Chunk bolme karari icin kullanilir.
    is_punct: bool = False
    # Bu token Whisper'dan timing aldiysa True; cursor fallback ise False.
    timing_from_whisper: bool = False

    def as_dict(self) -> dict:
        return {
            "text": self.text,
            "start": round(self.start, 3),
            "end": round(self.end, 3),
            "is_punct": self.is_punct,
            "timing_from_whisper": self.timing_from_whisper,
        }


@dataclass
class WhisperWord:
    """Whisper'in tek bir word-level timing kaydi."""

    word: str
    start: float
    end: float
    probability: float = 1.0


@dataclass
class SubtitleCue:
    """SRT bloguna karsilik gelen bir altyazi kuyu."""

    index: int
    start: float
    end: float
    text: str

    def to_srt_block(self) -> str:
        return (
            f"{self.index}\n"
            f"{_seconds_to_srt_time(self.start)} --> {_seconds_to_srt_time(self.end)}\n"
            f"{self.text}"
        )


@dataclass
class AlignmentResult:
    """align_script_to_whisper geri donus yapisi — audit + downstream icin."""

    tokens: list[ScriptToken] = field(default_factory=list)
    # Istatistikler — audit ve preview icin
    script_token_count: int = 0
    whisper_word_count: int = 0
    matched_by_whisper: int = 0
    fallback_from_cursor: int = 0
    script_to_whisper_ratio: float = 0.0

    def summary(self) -> dict:
        return {
            "script_token_count": self.script_token_count,
            "whisper_word_count": self.whisper_word_count,
            "matched_by_whisper": self.matched_by_whisper,
            "fallback_from_cursor": self.fallback_from_cursor,
            "script_to_whisper_ratio": round(self.script_to_whisper_ratio, 3),
        }


# ---------------------------------------------------------------------------
# Tokenizer — script canonical
# ---------------------------------------------------------------------------

# Unicode-aware word + separate punctuation token.
# \w+ kelime (unicode), [.,!?;:…"\'-] noktalama.
_TOKEN_RE = re.compile(
    r"(\w+(?:[’']\w+)*|[.,!?;:…\"\'\-–—(){}\[\]])",
    flags=re.UNICODE,
)
_PUNCT_CHARS = set(".,!?;:…\"'-–—(){}[]")
# Cue'yi sonlandiran "guclu" noktalama isaretleri.
_CUE_BOUNDARY_CHARS = set(".!?…")


def tokenize_script(narration: str) -> list[ScriptToken]:
    """
    Script metni → ScriptToken listesi. Unicode-aware; Turkce + ozel isimler korunur.
    """
    tokens: list[ScriptToken] = []
    for m in _TOKEN_RE.finditer(narration or ""):
        raw = m.group(0)
        is_punct = all(c in _PUNCT_CHARS for c in raw)
        tokens.append(ScriptToken(text=raw, is_punct=is_punct))
    return tokens


# ---------------------------------------------------------------------------
# Alignment — script canonical
# ---------------------------------------------------------------------------


def align_script_to_whisper(
    narration: str,
    whisper_words: list[WhisperWord],
    *,
    scene_duration_seconds: float,
    scene_offset: float = 0.0,
) -> AlignmentResult:
    """
    Script narration'ini Whisper word timing'ine hizala.

    Args:
        narration: Sahnenin TTS'e gonderilen original metni (script canonical).
        whisper_words: Whisper'dan elde edilen word-level timing listesi.
            Bos olabilir (cursor fallback).
        scene_duration_seconds: Sahnenin olculen ses suresi (saniye).
        scene_offset: Tum zamanlamalara eklenecek offset (job-global timeline).

    Returns:
        AlignmentResult — her script token'ina [start, end] atanmis olarak
        doner. Noktalama token'lari da timing alir (onceki kelimenin end'i
        civarinda).

    Notlar:
      - Whisper word'lerinin zamanlamasi zaten sahne-local olmali; scene_offset
        burada eklenir. Cagiran cursor_offset takip etmeli.
      - scene_duration_seconds cursor fallback icin gerekir.
    """
    tokens = tokenize_script(narration)
    result = AlignmentResult(
        tokens=tokens,
        script_token_count=len(tokens),
        whisper_word_count=len(whisper_words),
    )
    if not tokens:
        return result

    non_punct_token_indices = [i for i, t in enumerate(tokens) if not t.is_punct]
    if not non_punct_token_indices:
        # Sadece noktalama var — cursor fallback ile tumunu sahne suresine yay
        _apply_cursor_fallback(
            tokens, scene_duration_seconds=scene_duration_seconds, scene_offset=scene_offset
        )
        result.fallback_from_cursor = len(tokens)
        return result

    if not whisper_words:
        _apply_cursor_fallback(
            tokens, scene_duration_seconds=scene_duration_seconds, scene_offset=scene_offset
        )
        result.fallback_from_cursor = len(tokens)
        return result

    # Her non-punct script token'i, sirasi gelen Whisper word'un timing'ini alir.
    # Whisper word sayisi scriptten kisa olabilir → son word'un timing'i tekrar
    # kullanilir, bu token'lar collapse gibi davranir ama yine de chronolojik
    # olarak bir sonraki segmente akmazlar.
    last_end = scene_offset
    ww_index = 0
    for script_idx in non_punct_token_indices:
        if ww_index < len(whisper_words):
            ww = whisper_words[ww_index]
            ww_index += 1
            start = scene_offset + max(0.0, ww.start)
            end = scene_offset + max(ww.end, ww.start)
            if end <= start:
                end = start + 0.05
            tokens[script_idx].start = start
            tokens[script_idx].end = end
            tokens[script_idx].timing_from_whisper = True
            last_end = end
            result.matched_by_whisper += 1
        else:
            # Whisper words tukenmis — kalan scriptleri son end'e collapse et.
            # Kucuk bir 50ms slot verelim ki SRT valid kalsin.
            tokens[script_idx].start = last_end
            tokens[script_idx].end = min(
                last_end + 0.05,
                scene_offset + scene_duration_seconds,
            )
            tokens[script_idx].timing_from_whisper = False
            last_end = tokens[script_idx].end
            result.fallback_from_cursor += 1

    # Noktalama token'lari: onceki kelimenin end'ine yapis.
    _fill_punctuation_timings(tokens, scene_offset=scene_offset)

    if result.whisper_word_count > 0:
        result.script_to_whisper_ratio = (
            result.script_token_count / result.whisper_word_count
        )

    return result


def _apply_cursor_fallback(
    tokens: list[ScriptToken],
    *,
    scene_duration_seconds: float,
    scene_offset: float,
) -> None:
    """Whisper yokken tokenlari sahne suresine linear olarak yay."""
    if not tokens or scene_duration_seconds <= 0:
        # Yine de timing atamak lazim — SRT formatinin zero duration'i bozuk
        for t in tokens:
            t.start = scene_offset
            t.end = scene_offset + 0.05
            t.timing_from_whisper = False
        return

    # Noktalama olmayan tokenlari say; zamani onlara ayir, noktalamaya yapistir.
    non_punct = [t for t in tokens if not t.is_punct]
    if not non_punct:
        # Sadece noktalama — hepsine tek slot
        for t in tokens:
            t.start = scene_offset
            t.end = scene_offset + scene_duration_seconds
            t.timing_from_whisper = False
        return

    slot = scene_duration_seconds / len(non_punct)
    cursor = scene_offset
    for t in tokens:
        if t.is_punct:
            # Noktalama: onceki slot'un sonuna iliklenir (start=end=cursor)
            t.start = cursor
            t.end = cursor
            t.timing_from_whisper = False
            continue
        t.start = cursor
        t.end = cursor + slot
        t.timing_from_whisper = False
        cursor += slot


def _fill_punctuation_timings(tokens: list[ScriptToken], *, scene_offset: float) -> None:
    """Noktalama token'larina onceki kelimenin end zamanini ata."""
    last_end = scene_offset
    for t in tokens:
        if t.is_punct:
            t.start = last_end
            t.end = last_end  # sifir-genislikli
        else:
            last_end = t.end


# ---------------------------------------------------------------------------
# Chunking — tokenlari SRT cue'larina bol
# ---------------------------------------------------------------------------


def chunk_tokens_for_srt(
    tokens: list[ScriptToken],
    *,
    max_chars_per_cue: int = 42,
    max_tokens_per_cue: int = 12,
    start_index: int = 1,
) -> list[SubtitleCue]:
    """
    ScriptToken listesini SRT cue'larina boler.

    Args:
        tokens: align_script_to_whisper cikardigi token listesi.
        max_chars_per_cue: Bir cue icinde goruntulenecek max karakter.
        max_tokens_per_cue: Bir cue icinde max kelime (noktalama haric).
        start_index: SRT cue numaralandirmasi baslangic degeri.

    Returns:
        SubtitleCue listesi. Her cue'nun text'i script token'larindan rekonstrukte
        edilir — Whisper text'i ASLA girmiyor.
    """
    cues: list[SubtitleCue] = []
    if not tokens:
        return cues

    buffer_tokens: list[ScriptToken] = []
    buffer_word_count = 0
    index = start_index

    def _flush():
        nonlocal buffer_tokens, buffer_word_count, index
        if not buffer_tokens:
            return
        text = _render_cue_text(buffer_tokens)
        if not text.strip():
            buffer_tokens = []
            buffer_word_count = 0
            return
        start_t = buffer_tokens[0].start
        # end: son non-punct token'in end'i, yoksa buffer son token'in start'i
        end_t = _last_effective_end(buffer_tokens)
        if end_t <= start_t:
            end_t = start_t + 0.05
        cues.append(SubtitleCue(index=index, start=start_t, end=end_t, text=text))
        index += 1
        buffer_tokens = []
        buffer_word_count = 0

    for tok in tokens:
        # Buffer bos + noktalama ile baslamaz (estetik).
        if not buffer_tokens and tok.is_punct:
            continue

        buffer_tokens.append(tok)
        if not tok.is_punct:
            buffer_word_count += 1

        rendered_len = len(_render_cue_text(buffer_tokens))
        reached_char = rendered_len >= max_chars_per_cue
        reached_token = buffer_word_count >= max_tokens_per_cue
        is_cue_boundary = tok.is_punct and any(c in _CUE_BOUNDARY_CHARS for c in tok.text)

        if is_cue_boundary or reached_char or reached_token:
            _flush()

    _flush()
    return cues


def _render_cue_text(tokens: list[ScriptToken]) -> str:
    """
    Token listesinden duzgun insan-okur metin uret.

    Kurallar:
      - Kelimeler arasinda bosluk.
      - Noktalama ondeki kelimeye bitisik: "merhaba ," → "merhaba,".
      - Ac parantez ve tirnak ondeki bosluk degil ardindakine yapisir.
    """
    out: list[str] = []
    for i, tok in enumerate(tokens):
        if i == 0:
            out.append(tok.text)
            continue
        prev = tokens[i - 1]
        # Noktalama yapismasi
        if tok.is_punct and tok.text in {",", ".", "!", "?", ";", ":", "…", ")", "]", "}", "’", "'"}:
            out.append(tok.text)
        elif prev.is_punct and prev.text in {"(", "[", "{", "“", "‘"}:
            out.append(tok.text)
        else:
            out.append(" " + tok.text)
    return "".join(out)


def _last_effective_end(tokens: list[ScriptToken]) -> float:
    """Non-punct son token'in end'ini dondur; yoksa son token'in end'ini."""
    for tok in reversed(tokens):
        if not tok.is_punct:
            return tok.end
    return tokens[-1].end


# ---------------------------------------------------------------------------
# SRT format yardimci
# ---------------------------------------------------------------------------


def _seconds_to_srt_time(seconds: float) -> str:
    """Saniye → 'HH:MM:SS,mmm'."""
    if seconds < 0:
        seconds = 0.0
    total_ms = int(round(seconds * 1000))
    ms = total_ms % 1000
    total_s = total_ms // 1000
    s = total_s % 60
    total_m = total_s // 60
    m = total_m % 60
    h = total_m // 60
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def cues_to_srt(cues: Iterable[SubtitleCue]) -> str:
    """Cue listesini '\\n\\n' ile birlestir."""
    return "\n\n".join(c.to_srt_block() for c in cues)


# ---------------------------------------------------------------------------
# Whisper segments → WhisperWord listesi adaptor
# ---------------------------------------------------------------------------


def extract_whisper_words(segments: list[dict]) -> list[WhisperWord]:
    """
    Whisper segment listesinden duz word-level liste cikar.

    Whisper her segmentte 'words' alani verir. Yoksa segmentin kendi start/end
    ve text'i tek bir WhisperWord olarak dondurulur (segment-seviyesi
    degradation).
    """
    words: list[WhisperWord] = []
    for seg in segments or []:
        seg_words = seg.get("words") or []
        if seg_words:
            for w in seg_words:
                raw = (w.get("word") or "").strip()
                if not raw:
                    continue
                words.append(
                    WhisperWord(
                        word=raw,
                        start=float(w.get("start", 0.0)),
                        end=float(w.get("end", 0.0)),
                        probability=float(w.get("probability", 1.0)),
                    )
                )
        else:
            text = (seg.get("text") or "").strip()
            if not text:
                continue
            start = float(seg.get("start", 0.0))
            end = float(seg.get("end", start))
            # Tek bir WhisperWord yaratma yerine metni kabaca kelimelere bol
            parts = [p for p in text.split() if p]
            if not parts:
                continue
            slot = max((end - start) / len(parts), 0.05)
            for i, p in enumerate(parts):
                words.append(
                    WhisperWord(
                        word=p,
                        start=start + i * slot,
                        end=start + (i + 1) * slot,
                        probability=1.0,
                    )
                )
    return words
