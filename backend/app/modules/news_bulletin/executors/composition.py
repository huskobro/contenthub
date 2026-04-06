"""
Bülten kompozisyon adımı executor'ı (BulletinCompositionExecutor) — M28.

Tüm artifact'ları toplar ve Remotion'a gönderilecek NewsBulletin composition
props yapısını üretir. Sadece composition_props.json yazar — render tetiklemez.

M28 sınır kuralı:
  - Bu executor Remotion CLI çağırmaz
  - Render işlemi ayrı RenderStepExecutor tarafından yapılır (step 6)
  - Bu executor sadece "props_ready" durumunda bırakır

Güvenli composition mapping (CLAUDE.md C-07):
  - composition_id sabit mapping'den gelir (composition_map.py)
  - get_composition_id("news_bulletin") → "NewsBulletin"
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.modules.standard_video.composition_map import get_composition_id

from ._helpers import (
    _resolve_artifact_path,
    _write_artifact,
    _read_artifact,
)

logger = logging.getLogger(__name__)


class BulletinCompositionExecutor(StepExecutor):
    """
    Bülten kompozisyon adımı executor'ı — M28.

    Tüm artifact'ları birleştirerek NewsBulletin composition props üretir.
    artifact_check: composition_props.json varsa adımı atlar (idempotency).

    ÖNEMLİ: Bu executor render yapmaz — sadece props hazırlar.
    """

    def step_key(self) -> str:
        return "composition"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Composition adımını çalıştırır.

        Adımlar:
          1. artifact_check — composition_props.json varsa erken dön.
          2. Tüm artifact'ları oku: bulletin_script.json, audio_manifest.json,
             subtitle_metadata.json, metadata.json.
          3. composition_id güvenli mapping'den al.
          4. NewsBulletin props yapısını oluştur.
          5. artifacts/composition_props.json yaz.

        Returns:
            dict: artifact_path, composition_id, render_status, item_count.

        Raises:
            StepExecutionError: Zorunlu artifact eksikse veya composition_id bulunamazsa.
        """
        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        workspace_root = raw_input.get("workspace_root", "")
        if not workspace_root and hasattr(job, "workspace_path") and job.workspace_path:
            workspace_root = str(job.workspace_path)

        # artifact_check: composition_props zaten varsa adımı atla
        props_path = _resolve_artifact_path(workspace_root, job.id, "composition_props.json")
        if props_path.exists():
            logger.info(
                "BulletinCompositionExecutor: composition_props.json mevcut, adım atlanıyor. job=%s",
                job.id,
            )
            existing = json.loads(props_path.read_text(encoding="utf-8"))
            return {
                "artifact_path": str(props_path),
                "composition_id": existing.get("composition_id"),
                "render_status": existing.get("render_status"),
                "skipped": True,
                "step": self.step_key(),
            }

        # Zorunlu artifact'ları oku
        script_data = _read_artifact(workspace_root, job.id, "bulletin_script.json")
        if script_data is None:
            raise StepExecutionError(
                self.step_key(),
                f"bulletin_script.json bulunamadı: job={job.id}. "
                "Script adımı önce tamamlanmış olmalı.",
            )

        audio_manifest = _read_artifact(workspace_root, job.id, "audio_manifest.json")
        if audio_manifest is None:
            raise StepExecutionError(
                self.step_key(),
                f"audio_manifest.json bulunamadı: job={job.id}. "
                "TTS adımı önce tamamlanmış olmalı.",
            )

        # İsteğe bağlı artifact'lar
        subtitle_metadata = _read_artifact(workspace_root, job.id, "subtitle_metadata.json") or {}
        metadata_data = _read_artifact(workspace_root, job.id, "metadata.json") or {}

        # Güvenli composition mapping (CLAUDE.md C-07)
        try:
            composition_id = get_composition_id("news_bulletin")
        except ValueError as err:
            raise StepExecutionError(
                self.step_key(),
                f"Composition ID çözümlenemedi: {err}",
            )

        language = raw_input.get("language", script_data.get("language", "tr"))

        # Script item'larını ve audio bilgilerini birleştir
        script_items: list[dict] = script_data.get("items", [])
        audio_scenes: list[dict] = audio_manifest.get("scenes", [])

        if len(script_items) != len(audio_scenes):
            logger.warning(
                "BulletinCompositionExecutor: script item sayısı (%d) audio sahne sayısıyla "
                "(%d) uyuşmuyor. job=%s",
                len(script_items),
                len(audio_scenes),
                job.id,
            )

        props_items: list[dict] = []
        for i, script_item in enumerate(script_items):
            audio_scene = audio_scenes[i] if i < len(audio_scenes) else {}

            props_items.append({
                "itemNumber": i + 1,
                "headline": script_item.get("headline", ""),
                "narration": script_item.get("narration", ""),
                "audioPath": audio_scene.get("audio_path"),
                "imagePath": None,  # V1: no per-item visuals
                "durationSeconds": audio_scene.get("duration_seconds", 0.0),
                "category": script_item.get("category"),
            })

        total_duration = sum(item.get("durationSeconds", 0.0) for item in props_items)
        subtitles_srt = subtitle_metadata.get("srt_path")
        word_timing_path = subtitle_metadata.get("word_timing_path")
        timing_mode = subtitle_metadata.get("timing_mode", "cursor")

        start_time = time.monotonic()

        composition_props: dict = {
            "job_id": job.id,
            "module_id": "news_bulletin",
            "language": language,
            "composition_id": composition_id,
            "props": {
                "bulletinTitle": metadata_data.get("title", script_data.get("bulletin_id", "")),
                "items": props_items,
                "subtitlesSrt": subtitles_srt,
                "wordTimingPath": word_timing_path,
                "timingMode": timing_mode,
                "subtitleStyle": {
                    "preset_id": "default",
                    "fontSize": 36,
                    "fontColor": "#FFFFFF",
                    "backgroundColor": "rgba(0,0,0,0.7)",
                    "position": "bottom",
                },
                "totalDurationSeconds": round(total_duration, 3),
                "language": language,
                "metadata": {
                    "title": metadata_data.get("title", ""),
                    "description": metadata_data.get("description", ""),
                    "tags": metadata_data.get("tags", []),
                    "hashtags": metadata_data.get("hashtags", []),
                },
            },
            "render_status": "props_ready",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        latency_ms = int((time.monotonic() - start_time) * 1000)

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="composition_props.json",
            data=composition_props,
        )

        logger.info(
            "BulletinCompositionExecutor: job=%s composition_id=%s items=%d "
            "toplam_sure=%.1fs render_status=props_ready artifact=%s",
            job.id,
            composition_id,
            len(props_items),
            total_duration,
            artifact_path,
        )

        return {
            "artifact_path": artifact_path,
            "composition_id": composition_id,
            "render_status": "props_ready",
            "items_included": len(props_items),
            "timing_mode": timing_mode,
            "total_duration_seconds": round(total_duration, 3),
            "provider": {
                "provider_id": "bulletin_composition_props_builder",
                "composition_id": composition_id,
                "items_included": len(props_items),
                "render_status": "props_ready",
                "timing_mode": timing_mode,
                "latency_ms": latency_ms,
            },
            "step": self.step_key(),
        }
