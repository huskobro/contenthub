"""
Altyazı adımı executor'ı (SubtitleStepExecutor) — M4-C1 + Faz 3 script-canonical.

audio_manifest.json + script.json → SRT formatında altyazı dosyası üretir.
Whisper registry'de kayıtlıysa kelime-düzeyi zaman damgaları alınır AMA
altyazı metni HER ZAMAN script canonical'indan gelir.

Faz 3 SABIT:
  - Subtitle metni SCRIPT narration'indan gelir; Whisper transkripti asla
    altyazı olarak gösterilmez (halüsinasyon + Türkçe karakter bozulması +
    marka/ürün ismi kırılması riski var).
  - Whisper'in rolü: script token'larına word-level timing sağlamak.
  - Whisper yoksa → cursor fallback (linear yayılım); timing_mode='cursor'.

Zamanlama modları:
  - script_canonical_whisper : Whisper timing + script metin (Faz 3 default)
  - cursor                    : Whisper yok veya ses dosyası eksik → fallback.

(Eski 'whisper_word' ve 'whisper_segment' modlari kaldirildi; her ikisi de
artik 'script_canonical_whisper' altinda birlesir.)

Artifact'lar:
  - artifacts/subtitles.srt              — SRT formatında altyazı.
  - artifacts/word_timing.json           — Kelime-düzeyi zamanlama verisi.
  - artifacts/subtitle_metadata.json     — Adım meta verisi + timing modu.
  - artifacts/subtitle_alignment_audit.json — Faz 3: per-sahne align istatistigi.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import TYPE_CHECKING

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.providers.capability import ProviderCapability
from app.subtitle.canonical_align import (
    AlignmentResult,
    ScriptToken,
    align_script_to_whisper,
    chunk_tokens_for_srt,
    cues_to_srt,
    extract_whisper_words,
    tokenize_script,
)

from ._helpers import (
    _resolve_artifact_path,
    _write_artifact,
    _write_text_artifact,
    _read_artifact,
)

if TYPE_CHECKING:
    from app.providers.registry import ProviderRegistry

logger = logging.getLogger(__name__)


def _seconds_to_srt_time(seconds: float) -> str:
    """
    Saniye değerini SRT zaman formatına (HH:MM:SS,mmm) çevirir.

    Args:
        seconds: Saniye cinsinden zaman değeri.

    Returns:
        SRT formatında zaman dizesi (örn. '00:00:08,500').
    """
    total_ms = int(round(seconds * 1000))
    ms = total_ms % 1000
    total_s = total_ms // 1000
    s = total_s % 60
    total_m = total_s // 60
    m = total_m % 60
    h = total_m // 60
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _build_srt_from_scenes(scenes: list[dict]) -> str:
    """
    Sahne listesinden cursor-tabanlı SRT formatında altyazı üretir.

    Her sahne bir SRT bloğuna karşılık gelir.
    Narration metni boşsa veya süre sıfırsa blok eklenmez.

    Args:
        scenes: audio_manifest sahne listesi (narration, duration_seconds içermelidir).

    Returns:
        SRT formatında metin.
    """
    blocks: list[str] = []
    cursor = 0.0
    index = 1

    for scene in scenes:
        narration: str = scene.get("narration", "").strip()
        duration: float = float(scene.get("duration_seconds", 0.0))

        if not narration or duration <= 0:
            cursor += duration
            continue

        start_time = _seconds_to_srt_time(cursor)
        end_time = _seconds_to_srt_time(cursor + duration)
        block = f"{index}\n{start_time} --> {end_time}\n{narration}"
        blocks.append(block)

        cursor += duration
        index += 1

    return "\n\n".join(blocks)


def _build_srt_from_whisper(whisper_segments: list[dict], scene_offset: float = 0.0) -> str:
    """
    Whisper segment listesinden SRT formatında altyazı üretir.

    Whisper segmentleri genellikle doğal cümle bölmesi yapar;
    bu fonksiyon her segmenti bir SRT bloğuna çevirir.

    Args:
        whisper_segments: Whisper çıktısı segment listesi ({id, start, end, text, words}).
        scene_offset: Bu segment listesinin ses dosyasındaki zaman ofseti (saniye).

    Returns:
        SRT formatında metin blokları listesi (henüz birleştirilmemiş).
    """
    blocks: list[str] = []
    for seg in whisper_segments:
        text = seg.get("text", "").strip()
        if not text:
            continue
        start = scene_offset + seg.get("start", 0.0)
        end = scene_offset + seg.get("end", 0.0)
        block = f"{_seconds_to_srt_time(start)} --> {_seconds_to_srt_time(end)}\n{text}"
        blocks.append(block)
    return blocks


def _extract_word_timings_from_segments(
    segments: list[dict],
    scene_number: int,
    scene_offset: float,
) -> list[dict]:
    """
    Whisper segment listesinden kelime zamanlama verisi çıkartır.

    Args:
        segments: Whisper segment listesi.
        scene_number: SRT sahne numarası (1-indexed).
        scene_offset: Ses dosyasındaki zaman ofseti (saniye).

    Returns:
        list[dict]: Her biri {scene, word, start, end, probability} içeren kelime listesi.
    """
    word_timings: list[dict] = []
    for seg in segments:
        for word_info in seg.get("words", []):
            word_timings.append({
                "scene": scene_number,
                "word": word_info.get("word", "").strip(),
                "start": round(scene_offset + word_info.get("start", 0.0), 3),
                "end": round(scene_offset + word_info.get("end", 0.0), 3),
                "probability": word_info.get("probability", 1.0),
            })
    return word_timings


# Geriye dönük uyumluluk: M2-C5 testleri bu ismi import ediyor.
_build_srt = _build_srt_from_scenes


class SubtitleStepExecutor(StepExecutor):
    """
    Altyazi adimi executor'i — Faz 3 script-canonical.

    SABIT: Altyazi METNI her zaman SCRIPT narration'indan gelir. Whisper
    transkripti asla altyazi olarak gosterilmez. Whisper'in rolu yalniz
    word-level timing saglamak.

    Whisper registry'de kayitliysa:
      - Her sahnenin ses dosyasi Whisper ile transkripte edilir.
      - align_script_to_whisper ile script token'larina word-level timing atanir.
      - timing_mode='script_canonical_whisper' olarak isaretlenir.
      - word_timing.json (v2, source='script_canonical') uretilir.

    Whisper yoksa (kayitli degil) veya ses dosyasi yoksa:
      - align_script_to_whisper cursor fallback'ini calistirir (linear yayilim).
      - Altyazi metni yine SCRIPT CANONICAL'dir; timing linear uretilir.
      - timing_mode='cursor'.

    Her kosulda uretilen artifactlar:
      - subtitles.srt                    (script-canonical metin + timing)
      - word_timing.json                  (v2, tek source: script_canonical)
      - subtitle_alignment_audit.json     (per-sahne align istatistigi)
      - subtitle_metadata.json            (step-level metadata)

    artifact_check: subtitle_metadata.json varsa adimi atlar (idempotency).

    NOT: Subtitle-specific preview (karaoke stil secimi) M4-C3'te gelecektir.
         Genel preview altyapisi M6 kapsamindadir.
    """

    # Template Context Decision (M14):
    #   NON-CONSUMER — intentional.
    #   Subtitle executor is a timing engine (SRT generation + Whisper transcription).
    #   Style rules (font, color, size) are applied at composition time by
    #   CompositionStepExecutor, which merges style_blueprint.subtitle_rules
    #   into subtitle_style. This executor does not need template context.

    def __init__(self, registry: "ProviderRegistry | None" = None) -> None:
        """
        Args:
            registry: Provider kayıt defteri. Whisper provider'ı çözümlemek için kullanılır.

        Geçiş notu (M4-C3 kararı):
            registry=None kabul edilmeye devam eder; cursor-tabanlı timing kullanılır.
            Bu imza yeni kodda kopyalanmamalıdır.
            Yeni executor veya test kodu her zaman açık bir ProviderRegistry geçirmelidir.
            Dispatcher zaten registry=registry geçiriyor (M4-C1'den itibaren).
            Teknik borç: Gelecekte registry zorunlu hale getirilebilir;
            şimdilik geriye uyumluluk için None kabul ediliyor.
        """
        self._registry = registry

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "subtitle"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Subtitle adımını çalıştırır.

        Adımlar:
          1. artifact_check — subtitle_metadata.json varsa erken dön.
          2. Job input'undan StepExecutionContext oluştur.
          3. audio_manifest.json artifact'ını oku.
          4. script.json artifact'ını oku.
          5. Sahneleri birleştir.
          6a. [Whisper varsa] Her sahnenin ses dosyasını Whisper ile transkripte et.
              word_timing.json artifact'ı üret.
              SRT'yi Whisper segmentlerinden oluştur.
          6b. [Whisper yoksa] Cursor-tabanlı SRT üret.
          7. artifacts/subtitles.srt dosyasına yaz.
          8. subtitle_metadata.json artifact'ını yaz.
          9. Provider trace ile sonuç dön.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, segment_count, total_duration, timing_mode, provider trace.

        Raises:
            StepExecutionError: audio_manifest veya script artifact eksikse.
        """
        from app.modules.step_context import StepExecutionContext

        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        try:
            ctx = StepExecutionContext.from_job_input(
                job_id=job.id,
                module_id="standard_video",
                raw_input=raw_input,
            )
        except Exception as err:
            raise StepExecutionError(
                self.step_key(),
                f"StepExecutionContext oluşturulamadı: {err}",
            )

        workspace_root = ctx.workspace_root or (
            str(job.workspace_path) if getattr(job, "workspace_path", None) else ""
        )

        # artifact_check: metadata zaten varsa adımı atla
        metadata_path = _resolve_artifact_path(workspace_root, job.id, "subtitle_metadata.json")
        if metadata_path.exists():
            logger.info(
                "SubtitleStepExecutor: subtitle_metadata.json mevcut, adım atlanıyor. job=%s",
                job.id,
            )
            existing = json.loads(metadata_path.read_text(encoding="utf-8"))
            return {
                "artifact_path": existing.get("srt_path"),
                "metadata_path": str(metadata_path),
                "word_timing_path": existing.get("word_timing_path"),
                "alignment_audit_path": existing.get("alignment_audit_path"),
                "language": existing.get("language"),
                "segment_count": existing.get("segment_count", 0),
                "total_duration_seconds": existing.get("total_duration_seconds", 0.0),
                "timing_mode": existing.get("timing_mode", "cursor"),
                "text_source": existing.get("text_source", "script_canonical"),
                "skipped": True,
                "step": self.step_key(),
            }

        # audio_manifest.json — zamanlama + ses dosyası yolları
        audio_manifest = _read_artifact(workspace_root, job.id, "audio_manifest.json")
        if audio_manifest is None:
            raise StepExecutionError(
                self.step_key(),
                f"audio_manifest.json bulunamadı: job={job.id}. "
                "TTS adımı önce tamamlanmış olmalı.",
            )

        # script.json — narration metinleri
        script_data = _read_artifact(workspace_root, job.id, "script.json")
        if script_data is None:
            raise StepExecutionError(
                self.step_key(),
                f"script.json bulunamadı: job={job.id}. "
                "Script adımı önce tamamlanmış olmalı.",
            )

        audio_scenes: list[dict] = audio_manifest.get("scenes", [])
        script_scenes: list[dict] = script_data.get("scenes", [])

        if not audio_scenes:
            raise StepExecutionError(
                self.step_key(),
                "audio_manifest.json içinde sahne bulunamadı.",
            )

        # Sahneleri birleştir: audio_manifest'ten süre, script'ten narration
        merged_scenes: list[dict] = []
        for i, audio_scene in enumerate(audio_scenes):
            narration = audio_scene.get("narration", "").strip()
            if not narration and i < len(script_scenes):
                narration = script_scenes[i].get("narration", "").strip()

            merged_scenes.append({
                "scene_number": audio_scene.get("scene_number", i + 1),
                "narration": narration,
                "duration_seconds": float(audio_scene.get("duration_seconds", 0.0)),
                "audio_path": audio_scene.get("audio_path"),
            })

        start_time = time.monotonic()

        # Whisper çalıştırılabilir mi?
        whisper_available = False
        if self._registry is not None:
            try:
                chain = self._registry.get_chain(ProviderCapability.WHISPER)
                whisper_available = len(chain) > 0
            except Exception:
                # ProviderNotFoundError veya başka bir hata → Whisper kayıtlı değil
                whisper_available = False

        timing_mode: str
        srt_content: str
        all_word_timings: list[dict] = []
        whisper_trace: dict = {}
        alignment_audit: list[dict] = []

        if whisper_available:
            (
                timing_mode,
                srt_content,
                all_word_timings,
                whisper_trace,
                alignment_audit,
            ) = await self._run_whisper_mode(
                workspace_root=workspace_root,
                job_id=job.id,
                merged_scenes=merged_scenes,
            )
        else:
            # Faz 3: Whisper yoksa bile SUBTITLE METNI SCRIPT CANONICAL olmali.
            # Sahne bazinda tokenize + cursor-fallback timing uygula, chunkla.
            all_tokens: list[ScriptToken] = []
            cursor_offset = 0.0
            for scene in merged_scenes:
                narration = scene.get("narration", "").strip()
                duration = float(scene.get("duration_seconds", 0.0))
                if not narration or duration <= 0:
                    cursor_offset += duration
                    continue
                align = align_script_to_whisper(
                    narration,
                    [],  # whisper yok → cursor fallback
                    scene_duration_seconds=duration,
                    scene_offset=cursor_offset,
                )
                all_tokens.extend(align.tokens)
                alignment_audit.append({
                    "scene_number": scene.get("scene_number"),
                    "duration_seconds": round(duration, 3),
                    "audio_found": False,
                    "whisper_invoked": False,
                    "whisper_error": None,
                    **align.summary(),
                })
                cursor_offset += duration

            cues = chunk_tokens_for_srt(all_tokens, start_index=1)
            srt_content = cues_to_srt(cues)
            timing_mode = "cursor"
            logger.info(
                "SubtitleStepExecutor: Whisper provider kayitli degil, "
                "script-canonical + cursor fallback timing kullaniliyor. job=%s",
                job.id,
            )

        # artifacts/subtitles.srt dosyasına yaz
        srt_path = _write_text_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="subtitles.srt",
            content=srt_content,
        )

        # word_timing.json — yalnızca Whisper modundaysa üretilir
        word_timing_path: str | None = None
        if all_word_timings:
            word_timing_path = _write_artifact(
                workspace_root=workspace_root,
                job_id=job.id,
                filename="word_timing.json",
                data={
                    "version": "2",  # Faz 3: script-canonical timing schema
                    "timing_mode": timing_mode,
                    "language": ctx.language.value,
                    "source": "script_canonical",
                    "words": all_word_timings,
                    "word_count": len(all_word_timings),
                },
            )

        # Faz 3: subtitle_alignment_audit.json — per-sahne istatistikler
        alignment_audit_path: str | None = None
        if alignment_audit:
            alignment_audit_path = _write_artifact(
                workspace_root=workspace_root,
                job_id=job.id,
                filename="subtitle_alignment_audit.json",
                data={
                    "version": "1",
                    "timing_mode": timing_mode,
                    "rule": "script_canonical_subtitle_text",
                    "scenes": alignment_audit,
                    "totals": {
                        "scenes": len(alignment_audit),
                        "script_token_count": sum(
                            int(a.get("script_token_count", 0)) for a in alignment_audit
                        ),
                        "matched_by_whisper": sum(
                            int(a.get("matched_by_whisper", 0)) for a in alignment_audit
                        ),
                        "fallback_from_cursor": sum(
                            int(a.get("fallback_from_cursor", 0)) for a in alignment_audit
                        ),
                    },
                },
            )

        segment_count = sum(
            1 for s in merged_scenes
            if s.get("narration", "").strip() and float(s.get("duration_seconds", 0.0)) > 0
        )
        total_duration = sum(float(s.get("duration_seconds", 0.0)) for s in merged_scenes)
        language = ctx.language.value

        latency_ms = int((time.monotonic() - start_time) * 1000)

        # subtitle_metadata.json artifact'ı
        metadata: dict = {
            "srt_path": srt_path,
            "word_timing_path": word_timing_path,
            "alignment_audit_path": alignment_audit_path,
            "segment_count": segment_count,
            "total_duration_seconds": round(total_duration, 3),
            "language": language,
            "timing_mode": timing_mode,
            "text_source": "script_canonical",
        }
        metadata_artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="subtitle_metadata.json",
            data=metadata,
        )

        logger.info(
            "SubtitleStepExecutor: job=%s dil=%s segment=%d "
            "toplam_sure=%.1fs timing_mode=%s srt=%s",
            job.id,
            language,
            segment_count,
            total_duration,
            timing_mode,
            srt_path,
        )

        result: dict = {
            "artifact_path": srt_path,
            "metadata_path": metadata_artifact_path,
            "word_timing_path": word_timing_path,
            "alignment_audit_path": alignment_audit_path,
            "language": language,
            "segment_count": segment_count,
            "total_duration_seconds": round(total_duration, 3),
            "timing_mode": timing_mode,
            "text_source": "script_canonical",
            "provider": {
                "provider_id": "builtin_srt_generator",
                "timing_mode": timing_mode,
                "language": language,
                "segment_count": segment_count,
                "total_duration_seconds": round(total_duration, 3),
                "latency_ms": latency_ms,
                **whisper_trace,
            },
            "step": self.step_key(),
        }
        return result

    async def _run_whisper_mode(
        self,
        workspace_root: str,
        job_id: str,
        merged_scenes: list[dict],
    ) -> tuple[str, str, list[dict], dict, list[dict]]:
        """
        Faz 3 script-canonical Whisper modu.

        Her sahne icin:
          1. Script narration tokenize edilir (canonical metin — korunur).
          2. Sahnenin ses dosyasi varsa Whisper cagrilir; word-level timing alinir.
          3. align_script_to_whisper ile scripting token'larina Whisper timing'i
             atanir. Whisper'in metni asla altyazi olmaz.
          4. Ses yoksa veya Whisper basarisizsa, ayni sahne icin cursor
             fallback timing kullanilir (ayni alignment API).
        Tum sahnelerin token'lari job-global timeline'a kaydirilarak biriktirilir;
        en sonda chunk_tokens_for_srt ile tek cue dizisi olusturulup SRT uretilir.

        Args:
            workspace_root: Job workspace kok dizini.
            job_id: Job ID.
            merged_scenes: Birlestirilmis sahne listesi.

        Returns:
            Tuple: (timing_mode, srt_content, word_timings, whisper_trace,
                    alignment_audit)

            alignment_audit: per-sahne AlignmentResult.summary() + ses_var,
            whisper_invoked bilgisi.
        """
        from app.providers.resolution import resolve_and_invoke

        all_tokens: list[ScriptToken] = []
        all_word_timings: list[dict] = []
        alignment_audit: list[dict] = []

        cursor_offset = 0.0
        total_whisper_latency = 0
        whisper_provider_id: str = "local_whisper"
        any_whisper_success = False

        for scene in merged_scenes:
            narration = scene.get("narration", "").strip()
            duration = float(scene.get("duration_seconds", 0.0))
            audio_relative = scene.get("audio_path")
            scene_number = scene.get("scene_number", 1)

            if not narration or duration <= 0:
                cursor_offset += duration
                continue

            # Ses dosyasi yolu coz
            audio_abs: str | None = None
            if audio_relative and workspace_root:
                candidate = Path(workspace_root) / audio_relative
                if candidate.exists():
                    audio_abs = str(candidate)

            whisper_segments: list[dict] = []
            whisper_invoked = False
            whisper_error: str | None = None

            if audio_abs is not None:
                try:
                    t0 = time.monotonic()
                    output = await resolve_and_invoke(
                        self._registry,
                        ProviderCapability.WHISPER,
                        {
                            "audio_path": audio_abs,
                            "language": None,  # otomatik algila
                        },
                    )
                    total_whisper_latency += int((time.monotonic() - t0) * 1000)
                    whisper_provider_id = output.provider_id
                    whisper_segments = output.result.get("segments", []) or []
                    whisper_invoked = True
                    any_whisper_success = True
                except Exception as exc:
                    whisper_error = str(exc)
                    logger.warning(
                        "SubtitleStepExecutor: Whisper sahne %d basarisiz (%s); "
                        "cursor fallback kullanilacak. job=%s",
                        scene_number,
                        exc,
                        job_id,
                    )
            else:
                logger.warning(
                    "SubtitleStepExecutor: sahne %d icin ses dosyasi bulunamadi; "
                    "cursor fallback kullanilacak. job=%s",
                    scene_number,
                    job_id,
                )

            whisper_words = extract_whisper_words(whisper_segments) if whisper_invoked else []

            align = align_script_to_whisper(
                narration,
                whisper_words,
                scene_duration_seconds=duration,
                scene_offset=cursor_offset,
            )
            all_tokens.extend(align.tokens)

            # Per-kelime timing artifact'i (yalniz Whisper'dan timing alanlar)
            for tok in align.tokens:
                if tok.is_punct:
                    continue
                all_word_timings.append({
                    "scene": scene_number,
                    "word": tok.text,
                    "start": round(tok.start, 3),
                    "end": round(tok.end, 3),
                    "timing_from_whisper": tok.timing_from_whisper,
                })

            audit_entry = {
                "scene_number": scene_number,
                "duration_seconds": round(duration, 3),
                "audio_found": audio_abs is not None,
                "whisper_invoked": whisper_invoked,
                "whisper_error": whisper_error,
                **align.summary(),
            }
            alignment_audit.append(audit_entry)

            cursor_offset += duration

        # Tum sahnelerden gelen token'lari tek cue dizisine bol
        cues = chunk_tokens_for_srt(all_tokens, start_index=1)
        srt_content = cues_to_srt(cues)

        # Faz 3: tek timing modu — Whisper varsa scripturl canonical + Whisper timing,
        # yoksa cursor fallback (ama herzaman script metni).
        # Ayrim audit dosyasinda gorunur; dis API 'script_canonical_whisper' tek deger.
        timing_mode = "script_canonical_whisper"

        whisper_trace = {
            "whisper_provider_id": whisper_provider_id if any_whisper_success else None,
            "whisper_latency_ms": total_whisper_latency,
            "word_count": len(all_word_timings),
            "scenes_with_whisper": sum(
                1 for a in alignment_audit if a.get("whisper_invoked")
            ),
            "scenes_with_cursor_fallback": sum(
                1 for a in alignment_audit if not a.get("whisper_invoked")
            ),
        }

        return timing_mode, srt_content, all_word_timings, whisper_trace, alignment_audit
