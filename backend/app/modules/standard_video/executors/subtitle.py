"""
Altyazı adımı executor'ı (SubtitleStepExecutor) — M2-C5 implementasyonu.

audio_manifest.json + script.json → SRT formatında altyazı dosyası üretir.

NOT: Bu aşamada basit kursor-bazlı zamanlama kullanılır.
Gerçek kelime-düzeyi zamanlama M4'te Whisper entegrasyonuyla gelecektir.
Her sahne = bir SRT bloğu; otomatik sözcük bölmesi bu aşamada yapılmaz.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError

from ._helpers import (
    _resolve_artifact_path,
    _write_artifact,
    _write_text_artifact,
    _read_artifact,
)

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


def _build_srt(scenes: list[dict]) -> str:
    """
    Sahne listesinden SRT formatında altyazı metni üretir.

    Her sahne bir SRT bloğuna karşılık gelir.
    Zamanlamalar audio_manifest'teki duration_seconds değerleriyle hesaplanır.
    Narration metni boşsa o sahne SRT çıktısına dahil edilmez.

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
            # Narration yoksa veya süre sıfırsa zaman kursörünü ilerlet, blok ekleme
            cursor += duration
            continue

        start_time = _seconds_to_srt_time(cursor)
        end_time = _seconds_to_srt_time(cursor + duration)
        block = f"{index}\n{start_time} --> {end_time}\n{narration}"
        blocks.append(block)

        cursor += duration
        index += 1

    return "\n\n".join(blocks)


class SubtitleStepExecutor(StepExecutor):
    """
    Altyazı adımı executor'ı — M2-C5 gerçek implementasyonu.

    audio_manifest.json ve script.json artifact'larından sahne bilgisi okur.
    Her sahne için narration + tahmini ses süresi → SRT formatında altyazı üretir.

    Zamanlama: audio_manifest'teki duration_seconds kullanılır (kümülatif başlangıç).
    Çıktı: artifacts/subtitles.srt + artifacts/subtitle_metadata.json

    artifact_check: subtitle_metadata.json varsa adımı atlar (idempotency).

    NOT: Kelime-düzeyi zamanlama M4'te Whisper entegrasyonuyla gelecektir.
    Bu aşamada her sahne tek SRT bloğu olarak yazılır.
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "subtitle"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Subtitle adımını çalıştırır.

        Adımlar:
          1. artifact_check — subtitle_metadata.json varsa erken dön.
          2. Job input'undan StepExecutionContext oluştur.
          3. audio_manifest.json artifact'ını oku (zamanlama için).
          4. script.json artifact'ını oku (narration metinleri için).
          5. Sahneleri birleştir: audio_manifest'ten süre, script'ten narration.
          6. SRT formatında altyazı üret.
          7. artifacts/subtitles.srt dosyasına yaz.
          8. subtitle_metadata.json artifact'ını yaz.
          9. Provider trace ile sonuç dön.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, segment_count, total_duration, provider trace.

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
                "skipped": True,
                "step": self.step_key(),
            }

        # audio_manifest.json — zamanlama bilgisi
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
        # script sahne sayısı farklıysa audio_manifest önceliklidir (zamanlama kaynağı)
        merged_scenes: list[dict] = []
        for i, audio_scene in enumerate(audio_scenes):
            narration = audio_scene.get("narration", "").strip()
            # Narration audio_manifest'te boşsa script'ten almayı dene
            if not narration and i < len(script_scenes):
                narration = script_scenes[i].get("narration", "").strip()

            merged_scenes.append({
                "narration": narration,
                "duration_seconds": float(audio_scene.get("duration_seconds", 0.0)),
            })

        start_time = time.monotonic()

        # SRT oluştur
        srt_content = _build_srt(merged_scenes)

        # artifacts/subtitles.srt dosyasına yaz
        srt_path = _write_text_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="subtitles.srt",
            content=srt_content,
        )

        # Segment sayısını hesapla (boş narration'lar dahil değil)
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
            "segment_count": segment_count,
            "total_duration_seconds": round(total_duration, 3),
            "language": language,
        }
        metadata_artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="subtitle_metadata.json",
            data=metadata,
        )

        logger.info(
            "SubtitleStepExecutor: job=%s dil=%s segment=%d toplam_sure=%.1fs srt=%s",
            job.id,
            language,
            segment_count,
            total_duration,
            srt_path,
        )

        return {
            "artifact_path": srt_path,
            "metadata_path": metadata_artifact_path,
            "language": language,
            "segment_count": segment_count,
            "total_duration_seconds": round(total_duration, 3),
            "provider": {
                "provider_id": "builtin_srt_generator",
                "language": language,
                "segment_count": segment_count,
                "total_duration_seconds": round(total_duration, 3),
                "latency_ms": latency_ms,
            },
            "step": self.step_key(),
        }
