"""
TTS Faz 3 — Script-canonical subtitle alignment testleri (SABIT).

Kurallar:
  - Subtitle metni SCRIPT canonical'indan gelir; Whisper transkripti ASLA
    altyazi olarak gosterilmez.
  - Turkce karakterler, marka isimleri, urun adlari script'ten gelir —
    Whisper halusinasyonu / karakter bozulmasi altyaziya girmez.
  - Whisper rolu: word-level timing saglamak.
  - Whisper yoksa → cursor-tabanli fallback + timing_mode='cursor'.
  - Whisper word sayisi != script token sayisi durumlari guvenli olarak
    yonetilir (fazla script collapse, fazla whisper yutulur).

Test matrisi:
  - Tokenizer Turkce + marka + URL + noktalama dogru ayirir
  - align_script_to_whisper: happy path (1-1 eslesme)
  - align_script_to_whisper: script fazla token (collapse)
  - align_script_to_whisper: whisper fazla token (yutulur, script yine
    canonical)
  - align_script_to_whisper: whisper bos → cursor fallback
  - Whisper halusine "ContentHab" dese bile cue metni "ContentHub"
    (script canonical)
  - chunk_tokens_for_srt: max_chars + punctuation boundary
  - cues_to_srt: SRT formatinda timing HH:MM:SS,mmm ve blok yapisi
  - extract_whisper_words: segment fallback (words alani yoksa)
"""

from __future__ import annotations

from app.subtitle.canonical_align import (
    AlignmentResult,
    ScriptToken,
    SubtitleCue,
    WhisperWord,
    _seconds_to_srt_time,
    align_script_to_whisper,
    chunk_tokens_for_srt,
    cues_to_srt,
    extract_whisper_words,
    tokenize_script,
)


# ============================================================
# Tokenizer
# ============================================================


def test_tokenize_script_turkish_chars_preserved():
    toks = tokenize_script("Merhaba dünya, şimdi çalışıyor mu?")
    words = [t.text for t in toks if not t.is_punct]
    assert words == ["Merhaba", "dünya", "şimdi", "çalışıyor", "mu"]
    # Noktalama ayri tokenlar olarak gelir
    puncts = [t.text for t in toks if t.is_punct]
    assert "," in puncts
    assert "?" in puncts


def test_tokenize_script_brand_names_preserved():
    toks = tokenize_script("ContentHub kullanıyoruz. Apple iPhone 15 Pro Max çok iyi.")
    words = [t.text for t in toks if not t.is_punct]
    # Marka adlari bozulmadan token olarak cikmali
    assert "ContentHub" in words
    assert "iPhone" in words
    assert "Apple" in words
    assert "Pro" in words
    assert "Max" in words


def test_tokenize_script_turkish_apostrophe_keeps_suffix():
    """Turkce eklerden once apostrof olan isimler tek token kalmali."""
    toks = tokenize_script("ContentHub'ı açıyorum.")
    words = [t.text for t in toks if not t.is_punct]
    # Turkce: Apostrof + ek tek token icinde
    assert "ContentHub'ı" in words or "ContentHub’ı" in words


def test_tokenize_script_empty():
    assert tokenize_script("") == []
    assert tokenize_script("   ") == []


# ============================================================
# align_script_to_whisper — happy path
# ============================================================


def test_align_happy_path_one_to_one():
    narration = "Merhaba dünya şimdi."
    whisper_words = [
        WhisperWord("Merhaba", 0.0, 0.5),
        WhisperWord("dünya", 0.5, 1.0),
        WhisperWord("şimdi", 1.0, 1.5),
    ]
    result = align_script_to_whisper(
        narration,
        whisper_words,
        scene_duration_seconds=1.6,
    )
    non_punct = [t for t in result.tokens if not t.is_punct]
    assert len(non_punct) == 3
    assert non_punct[0].start == 0.0 and non_punct[0].end == 0.5
    assert non_punct[1].start == 0.5
    assert non_punct[2].end == 1.5
    assert all(t.timing_from_whisper for t in non_punct)
    # Noktalama da timing aldi
    punct = [t for t in result.tokens if t.is_punct]
    assert len(punct) == 1
    assert punct[0].start == 1.5  # son kelimenin end'ine iliklendi

    # Summary dogru
    assert result.matched_by_whisper == 3
    assert result.fallback_from_cursor == 0


def test_align_script_longer_than_whisper_collapses_trailing():
    """Script 5 kelime, Whisper 3 word → son 2 kelime collapse (cursor fallback)."""
    narration = "Merhaba dünya şimdi iPhone 15"
    whisper_words = [
        WhisperWord("Merhaba", 0.0, 0.5),
        WhisperWord("dünya", 0.5, 1.0),
        WhisperWord("şimdi", 1.0, 1.5),
    ]
    result = align_script_to_whisper(
        narration, whisper_words, scene_duration_seconds=1.6
    )
    non_punct = [t for t in result.tokens if not t.is_punct]
    assert len(non_punct) == 5
    # Ilk 3 whisper'dan timing aldi
    assert non_punct[0].timing_from_whisper
    assert non_punct[1].timing_from_whisper
    assert non_punct[2].timing_from_whisper
    # Son 2 cursor fallback
    assert non_punct[3].timing_from_whisper is False
    assert non_punct[4].timing_from_whisper is False
    # Cursor fallback tokenlari son whisper end'inden sonra ve sahne duration'i
    # icinde kalmali
    assert non_punct[3].start >= 1.5
    assert non_punct[4].end <= 1.6 + 0.0001
    assert result.matched_by_whisper == 3
    assert result.fallback_from_cursor == 2


def test_align_whisper_longer_than_script_extras_ignored():
    """Script 2 kelime, Whisper 5 word → 3 whisper word yutulur; cue icindeki
    metin yine script canonical kalmali."""
    narration = "Merhaba dünya"
    whisper_words = [
        WhisperWord("Merhaba", 0.0, 0.4),
        WhisperWord("dünya", 0.4, 0.8),
        WhisperWord("halusinasyon", 0.8, 1.0),
        WhisperWord("extra", 1.0, 1.2),
        WhisperWord("noise", 1.2, 1.4),
    ]
    result = align_script_to_whisper(
        narration, whisper_words, scene_duration_seconds=1.5
    )
    non_punct = [t for t in result.tokens if not t.is_punct]
    assert len(non_punct) == 2
    assert [t.text for t in non_punct] == ["Merhaba", "dünya"]  # SCRIPT metni
    assert non_punct[0].timing_from_whisper
    assert non_punct[1].timing_from_whisper
    # Script fazla halusinasyonu yutmamis — ama timing sadece ilk 2 whisper word'den
    assert non_punct[0].end == 0.4
    assert non_punct[1].end == 0.8


def test_align_whisper_empty_uses_cursor_fallback():
    narration = "Merhaba dünya."
    result = align_script_to_whisper(
        narration, whisper_words=[], scene_duration_seconds=1.0
    )
    non_punct = [t for t in result.tokens if not t.is_punct]
    assert len(non_punct) == 2
    assert all(not t.timing_from_whisper for t in non_punct)
    # Linear yayilma: 0..0.5 ve 0.5..1.0
    assert abs(non_punct[0].start - 0.0) < 0.001
    assert abs(non_punct[1].end - 1.0) < 0.001
    # fallback_from_cursor noktalama dahil tum token'lari sayar
    assert result.fallback_from_cursor == len(result.tokens)
    assert result.matched_by_whisper == 0


def test_align_scene_offset_applied():
    narration = "Merhaba"
    whisper_words = [WhisperWord("Merhaba", 0.0, 0.5)]
    result = align_script_to_whisper(
        narration, whisper_words, scene_duration_seconds=0.6, scene_offset=10.0
    )
    tok = result.tokens[0]
    assert tok.start == 10.0
    assert tok.end == 10.5


# ============================================================
# SABIT: Whisper halusinasyonu → SCRIPT canonical kalir
# ============================================================


def test_whisper_hallucination_never_replaces_script_text():
    """
    SABIT: Whisper 'ContentHab' dese bile cue metni script'ten 'ContentHub' olur.
    """
    narration = "ContentHub artık hazır."
    # Whisper yanlis duymus — bozuk transkript
    whisper_words = [
        WhisperWord("ContentHab", 0.0, 0.6),   # halusine
        WhisperWord("artik", 0.6, 0.9),        # bozuk Turkce char (i)
        WhisperWord("hazir", 0.9, 1.2),        # bozuk Turkce char
    ]
    result = align_script_to_whisper(
        narration, whisper_words, scene_duration_seconds=1.3
    )
    cues = chunk_tokens_for_srt(result.tokens)
    assert len(cues) == 1
    # SABIT: Cue text script'ten
    assert "ContentHub" in cues[0].text
    assert "artık" in cues[0].text
    assert "hazır" in cues[0].text
    # Halusine icermemeli
    assert "ContentHab" not in cues[0].text
    assert "artik" not in cues[0].text
    assert "hazir" not in cues[0].text


def test_whisper_turkish_char_corruption_never_in_subtitle():
    narration = "Çalışıyoruz; şahane iş çıkarıyoruz."
    whisper_words = [
        WhisperWord("Calisiyoruz", 0.0, 1.0),
        WhisperWord("sahane", 1.0, 1.5),
        WhisperWord("is", 1.5, 1.7),
        WhisperWord("cikariyoruz", 1.7, 2.5),
    ]
    result = align_script_to_whisper(
        narration, whisper_words, scene_duration_seconds=2.6
    )
    cues = chunk_tokens_for_srt(result.tokens)
    full_text = " ".join(c.text for c in cues)
    # Turkce karakterler korundu
    assert "Çalışıyoruz" in full_text
    assert "şahane" in full_text
    assert "çıkarıyoruz" in full_text
    # ASCII karbonlar asla
    assert "Calisiyoruz" not in full_text
    assert "sahane" not in full_text
    assert "cikariyoruz" not in full_text


# ============================================================
# chunk_tokens_for_srt
# ============================================================


def test_chunk_breaks_on_punctuation_boundary():
    narration = "Merhaba dünya! Nasılsın bugün?"
    whisper_words = [
        WhisperWord("Merhaba", 0.0, 0.5),
        WhisperWord("dünya", 0.5, 1.0),
        WhisperWord("Nasılsın", 1.0, 1.7),
        WhisperWord("bugün", 1.7, 2.2),
    ]
    result = align_script_to_whisper(
        narration, whisper_words, scene_duration_seconds=2.5
    )
    cues = chunk_tokens_for_srt(result.tokens, max_chars_per_cue=100, max_tokens_per_cue=20)
    # 2 cue: "!" ve "?" bolme yapar
    assert len(cues) == 2
    assert cues[0].text.endswith("!")
    assert cues[1].text.endswith("?")


def test_chunk_breaks_on_max_chars():
    narration = "Bir iki üç dört beş altı yedi sekiz dokuz on"
    # Her kelime 0.2s
    whisper_words = [
        WhisperWord(w, i * 0.2, (i + 1) * 0.2)
        for i, w in enumerate(["Bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on"])
    ]
    result = align_script_to_whisper(
        narration, whisper_words, scene_duration_seconds=2.0
    )
    cues = chunk_tokens_for_srt(result.tokens, max_chars_per_cue=20, max_tokens_per_cue=20)
    # Max 20 karakter → birden fazla cue
    assert len(cues) >= 2
    for c in cues:
        assert len(c.text) <= 30, f"cue cok uzun: {c.text}"


def test_chunk_first_cue_not_start_with_punctuation():
    """Cue bufferi bos iken noktalama geldiginde atla."""
    tokens = [
        ScriptToken(text=",", start=0.0, end=0.0, is_punct=True),
        ScriptToken(text="Merhaba", start=0.0, end=0.5, is_punct=False, timing_from_whisper=True),
    ]
    cues = chunk_tokens_for_srt(tokens)
    assert len(cues) == 1
    assert cues[0].text == "Merhaba"


def test_chunk_preserves_timing_boundaries():
    tokens = [
        ScriptToken(text="Merhaba", start=0.0, end=0.5, timing_from_whisper=True),
        ScriptToken(text="dünya", start=0.5, end=1.0, timing_from_whisper=True),
    ]
    cues = chunk_tokens_for_srt(tokens)
    assert len(cues) == 1
    assert cues[0].start == 0.0
    assert cues[0].end == 1.0


def test_chunk_empty_tokens_returns_empty():
    assert chunk_tokens_for_srt([]) == []


# ============================================================
# cues_to_srt formati
# ============================================================


def test_cues_to_srt_formati_dogru():
    cues = [
        SubtitleCue(index=1, start=0.0, end=1.5, text="Merhaba dünya."),
        SubtitleCue(index=2, start=1.5, end=3.2, text="Nasılsın?"),
    ]
    srt = cues_to_srt(cues)
    assert "1\n00:00:00,000 --> 00:00:01,500\nMerhaba dünya." in srt
    assert "2\n00:00:01,500 --> 00:00:03,200\nNasılsın?" in srt
    # Bloklar arasinda cift newline
    assert "\n\n" in srt


def test_seconds_to_srt_time_formati():
    assert _seconds_to_srt_time(0) == "00:00:00,000"
    assert _seconds_to_srt_time(1.5) == "00:00:01,500"
    assert _seconds_to_srt_time(61.25) == "00:01:01,250"
    assert _seconds_to_srt_time(3600) == "01:00:00,000"
    # Negatif guvenli
    assert _seconds_to_srt_time(-1.0) == "00:00:00,000"


# ============================================================
# extract_whisper_words — segment fallback
# ============================================================


def test_extract_whisper_words_from_word_level():
    segments = [
        {
            "text": "Merhaba dünya.",
            "start": 0.0, "end": 1.0,
            "words": [
                {"word": "Merhaba", "start": 0.0, "end": 0.5, "probability": 0.99},
                {"word": "dünya", "start": 0.5, "end": 1.0, "probability": 0.98},
            ],
        }
    ]
    words = extract_whisper_words(segments)
    assert len(words) == 2
    assert words[0].word == "Merhaba"
    assert words[1].word == "dünya"
    assert words[0].probability == 0.99


def test_extract_whisper_words_segment_fallback_no_words_field():
    """Words yoksa segment text'i kabaca word'lere bolunur."""
    segments = [
        {"text": "Merhaba dünya", "start": 0.0, "end": 1.0, "words": []},
    ]
    words = extract_whisper_words(segments)
    assert len(words) == 2
    assert words[0].word == "Merhaba"
    assert words[1].word == "dünya"
    # Linear split: 0-0.5 ve 0.5-1.0
    assert words[0].start == 0.0
    assert words[1].end == 1.0


def test_extract_whisper_words_empty_segments():
    assert extract_whisper_words([]) == []
    assert extract_whisper_words(None) == []  # type: ignore


# ============================================================
# End-to-end smoke test — script canonical happy path
# ============================================================


def test_e2e_script_canonical_srt_output():
    """
    Gercek e2e: script narration → align → chunk → SRT.
    """
    narration = "ContentHub ile hızlıca içerik üretiyoruz! Şimdi denemek ister misin?"
    whisper_words = [
        # Whisper bazen hallucinasyon yapar — hepsi nokta atisi degildir
        WhisperWord("ContentHab", 0.0, 0.6),       # halusine
        WhisperWord("ile", 0.6, 0.8),
        WhisperWord("hizlica", 0.8, 1.3),          # Turkce bozuk
        WhisperWord("icerik", 1.3, 1.7),           # Turkce bozuk
        WhisperWord("uretiyoruz", 1.7, 2.5),       # Turkce bozuk
        WhisperWord("Simdi", 2.5, 2.9),
        WhisperWord("denemek", 2.9, 3.4),
        WhisperWord("ister", 3.4, 3.7),
        WhisperWord("misin", 3.7, 4.1),
    ]
    result = align_script_to_whisper(
        narration, whisper_words, scene_duration_seconds=4.2
    )
    cues = chunk_tokens_for_srt(result.tokens, max_chars_per_cue=50)
    srt = cues_to_srt(cues)

    # SCRIPT canonical — Whisper halusinasyonu ve bozuk Turkce asla SRT'de yok
    assert "ContentHub" in srt
    assert "hızlıca" in srt
    assert "içerik" in srt
    assert "üretiyoruz" in srt
    assert "Şimdi" in srt
    # Bozuk versiyonlar SRT'de olmamali
    assert "ContentHab" not in srt
    assert "hizlica" not in srt
    assert "icerik" not in srt

    # En az 2 cue (noktalama bolmeleri)
    assert srt.count("-->") >= 2


# ============================================================
# AlignmentResult audit summary
# ============================================================


def test_alignment_result_summary_structure():
    narration = "Merhaba dünya"
    whisper_words = [
        WhisperWord("Merhaba", 0.0, 0.5),
        WhisperWord("dünya", 0.5, 1.0),
    ]
    result = align_script_to_whisper(
        narration, whisper_words, scene_duration_seconds=1.1
    )
    summary = result.summary()
    assert summary["script_token_count"] == 2
    assert summary["whisper_word_count"] == 2
    assert summary["matched_by_whisper"] == 2
    assert summary["fallback_from_cursor"] == 0
    assert summary["script_to_whisper_ratio"] == 1.0
