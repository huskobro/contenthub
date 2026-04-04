"""
Altyazı adımı executor'ı (SubtitleStepExecutor) — M4-C1 Whisper entegrasyonu.

audio_manifest.json + script.json → SRT formatında altyazı dosyası üretir.
Whisper registry'de kayıtlıysa kelime-düzeyi zaman damgaları da çıkartılır.

Zamanlama modları:
  - whisper_word   : Whisper çıktısından gerçek kelime-düzeyi zaman damgaları.
  - whisper_segment: Whisper segment zamanlama kullanılır (kelime yoksa).
  - cursor         : Whisper kayıtlı değil veya ses dosyası eksik → eski cursor-tabanlı fallback.

Artifact'lar:
  - artifacts/subtitles.srt         — SRT formatında altyazı (her zaman üretilir).
  - artifacts/word_timing.json      — Kelime-düzeyi zamanlama verisi (Whisper varsa).
  - artifacts/subtitle_metadata.json — Adım meta verisi + timing modu (her zaman üretilir).

NOT: Subtitle-specific preview (karaoke stil seçimi) M4-C3'te gelecektir.
     Bu executor yalnızca timing verisi ve SRT üretir; render/stil kararı vermez.
     Genel preview altyapısı (kompozisyon, hareket, stil kartları) M6 kapsamındadır.
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
    Altyazı adımı executor'ı — M4-C1 Whisper entegrasyonu ile.

    Whisper registry'de kayıtlıysa:
      - Her sahnenin ses dosyasını Whisper ile transkripte eder.
      - Kelime-düzeyi zaman damgaları içeren word_timing.json üretir.
      - SRT zamanlaması Whisper çıktısından gelir.

    Whisper yoksa (kayıtlı değil):
      - Mevcut cursor-tabanlı zamanlama kullanılır.
      - word_timing.json üretilmez.
      - subtitle_metadata.json'da timing_mode: "cursor" olarak işaretlenir.

    artifact_check: subtitle_metadata.json varsa adımı atlar (idempotency).

    NOT: Subtitle-specific preview (karaoke stil seçimi) M4-C3'te gelecektir.
         Genel preview altyapısı M6 kapsamındadır.
    """

    def __init__(self, registry: "ProviderRegistry | None" = None) -> None:
        """
        Args:
            registry: Provider kayıt defteri. Whisper provider'ı çözümlemek için kullanılır.
                      None ise cursor-tabanlı timing kullanılır.
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
                "language": existing.get("language"),
                "segment_count": existing.get("segment_count", 0),
                "total_duration_seconds": existing.get("total_duration_seconds", 0.0),
                "timing_mode": existing.get("timing_mode", "cursor"),
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

        if whisper_available:
            timing_mode, srt_content, all_word_timings, whisper_trace = (
                await self._run_whisper_mode(
                    workspace_root=workspace_root,
                    job_id=job.id,
                    merged_scenes=merged_scenes,
                )
            )
        else:
            timing_mode = "cursor"
            srt_content = _build_srt_from_scenes(merged_scenes)
            logger.info(
                "SubtitleStepExecutor: Whisper provider kayıtlı değil, "
                "cursor-tabanlı zamanlama kullanılıyor. job=%s",
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
                    "version": "1",
                    "timing_mode": timing_mode,
                    "language": ctx.language.value,
                    "words": all_word_timings,
                    "word_count": len(all_word_timings),
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
            "segment_count": segment_count,
            "total_duration_seconds": round(total_duration, 3),
            "language": language,
            "timing_mode": timing_mode,
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
            "language": language,
            "segment_count": segment_count,
            "total_duration_seconds": round(total_duration, 3),
            "timing_mode": timing_mode,
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
    ) -> tuple[str, str, list[dict], dict]:
        """
        Whisper modunda her sahnenin ses dosyasını transkripte eder.

        Her ses dosyası için Whisper çağrılır; kelime zaman damgaları toplanır.
        SRT Whisper segmentlerinden oluşturulur.

        Args:
            workspace_root: Job workspace kök dizini.
            job_id: Job ID.
            merged_scenes: Birleştirilmiş sahne listesi.

        Returns:
            Tuple: (timing_mode, srt_content, all_word_timings, whisper_trace_summary)
        """
        from app.providers.resolution import resolve_and_invoke

        srt_blocks: list[str] = []
        all_word_timings: list[dict] = []
        srt_index = 1
        cursor_offset = 0.0
        total_whisper_latency = 0
        whisper_provider_id = "local_whisper"
        has_word_level = False

        for scene in merged_scenes:
            narration = scene.get("narration", "").strip()
            duration = float(scene.get("duration_seconds", 0.0))
            audio_relative = scene.get("audio_path")
            scene_number = scene.get("scene_number", 1)

            if not narration or duration <= 0:
                cursor_offset += duration
                continue

            # Ses dosyası yolu çöz
            audio_abs: str | None = None
            if audio_relative and workspace_root:
                candidate = Path(workspace_root) / audio_relative
                if candidate.exists():
                    audio_abs = str(candidate)

            if audio_abs is None:
                # Ses dosyası bulunamadı → bu sahne için cursor-tabanlı blok kullan
                logger.warning(
                    "SubtitleStepExecutor: sahne %d için ses dosyası bulunamadı, "
                    "cursor-tabanlı timing kullanılıyor. job=%s",
                    scene_number,
                    job_id,
                )
                start_t = _seconds_to_srt_time(cursor_offset)
                end_t = _seconds_to_srt_time(cursor_offset + duration)
                srt_blocks.append(
                    f"{srt_index}\n{start_t} --> {end_t}\n{narration}"
                )
                srt_index += 1
                cursor_offset += duration
                continue

            # Whisper çağır
            try:
                t0 = time.monotonic()
                output = await resolve_and_invoke(
                    self._registry,
                    ProviderCapability.WHISPER,
                    {
                        "audio_path": audio_abs,
                        "language": None,  # otomatik algıla
                    },
                )
                total_whisper_latency += int((time.monotonic() - t0) * 1000)
                whisper_provider_id = output.provider_id

                segments = output.result.get("segments", [])

                # Whisper segmentlerinden SRT blokları üret
                scene_blocks = _build_srt_from_whisper(segments, scene_offset=cursor_offset)
                for block in scene_blocks:
                    srt_blocks.append(f"{srt_index}\n{block}")
                    srt_index += 1

                # Kelime zamanlama verisi
                words = _extract_word_timings_from_segments(
                    segments, scene_number=scene_number, scene_offset=cursor_offset
                )
                if words:
                    all_word_timings.extend(words)
                    has_word_level = True

            except Exception as exc:
                # Whisper başarısız → bu sahne için cursor-tabanlı blok
                logger.warning(
                    "SubtitleStepExecutor: Whisper sahne %d için başarısız (%s), "
                    "cursor-tabanlı timing kullanılıyor. job=%s",
                    scene_number,
                    exc,
                    job_id,
                )
                start_t = _seconds_to_srt_time(cursor_offset)
                end_t = _seconds_to_srt_time(cursor_offset + duration)
                srt_blocks.append(
                    f"{srt_index}\n{start_t} --> {end_t}\n{narration}"
                )
                srt_index += 1

            cursor_offset += duration

        timing_mode = "whisper_word" if has_word_level else "whisper_segment"
        srt_content = "\n\n".join(srt_blocks)

        whisper_trace = {
            "whisper_provider_id": whisper_provider_id,
            "whisper_latency_ms": total_whisper_latency,
            "word_count": len(all_word_timings),
        }

        return timing_mode, srt_content, all_word_timings, whisper_trace
