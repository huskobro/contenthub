"""
Görsel toplama adımı executor'ı (VisualsStepExecutor).

Her sahne için visual_cue → Pexels araması yapar.
Pexels boş veya hatalıysa Pixabay'e fallback yapar.
artifact_check idempotency tipi: visuals_manifest.json varsa adımı atlar.

Kısmi başarı kabul edilir: bazı sahneler null olabilir.
Tüm sahneler başarısızsa StepExecutionError fırlatılır.
"""

from __future__ import annotations

import json
import logging
import shutil
import time
from pathlib import Path

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError

from ._helpers import _resolve_artifact_path, _write_artifact, _read_artifact

logger = logging.getLogger(__name__)


class VisualsStepExecutor(StepExecutor):
    """
    Görsel toplama adımı executor'ı (M2-C4).

    Her sahne için visual_cue → Pexels araması yapar.
    Pexels boş veya hatalıysa Pixabay'e fallback yapar.
    artifact_check idempotency tipi: visuals_manifest.json varsa adımı atlar.

    Kısmi başarı kabul edilir: bazı sahneler null olabilir.
    Tüm sahneler başarısızsa StepExecutionError fırlatılır.
    """

    def __init__(self, pexels_provider, pixabay_provider) -> None:
        """
        Args:
            pexels_provider : PexelsProvider (veya test mock'u).
            pixabay_provider: PixabayProvider (veya test mock'u).
        """
        self._pexels = pexels_provider
        self._pixabay = pixabay_provider

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "visuals"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Visuals adımını çalıştırır.

        Adımlar:
          1. artifact_check — visuals_manifest.json varsa erken dön.
          2. Job input'undan StepExecutionContext oluştur.
          3. script.json artifact'ından visual_cue alanlarını oku.
          4. Her sahne için Pexels ara → bulamazsa Pixabay fallback.
          5. Görseli scene_N.jpg olarak kaydet.
          6. visuals_manifest.json artifact'ını yaz.
          7. Tüm sahneler başarısızsa StepExecutionError fırlat.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, scene_count, provider trace.

        Raises:
            StepExecutionError: Script artifact eksikse veya tüm sahneler başarısızsa.
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

        # artifact_check: manifest zaten varsa adımı atla
        manifest_path = _resolve_artifact_path(workspace_root, job.id, "visuals_manifest.json")
        if manifest_path.exists():
            logger.info(
                "VisualsStepExecutor: visuals_manifest.json mevcut, adım atlanıyor. job=%s", job.id
            )
            existing = json.loads(manifest_path.read_text(encoding="utf-8"))
            return {
                "artifact_path": str(manifest_path),
                "language": existing.get("language"),
                "scene_count": len(existing.get("scenes", [])),
                "skipped": True,
                "step": self.step_key(),
            }

        script_data = _read_artifact(workspace_root, job.id, "script.json")
        if script_data is None:
            raise StepExecutionError(
                self.step_key(),
                f"Script artifact bulunamadı: job={job.id}. Script adımı önce tamamlanmış olmalı.",
            )

        scenes: list[dict] = script_data.get("scenes", [])
        if not scenes:
            raise StepExecutionError(
                self.step_key(),
                "Script artifact'ında sahne bulunamadı.",
            )

        visuals_dir = _resolve_artifact_path(workspace_root, job.id, "visuals").parent / "visuals"
        visuals_dir.mkdir(parents=True, exist_ok=True)

        manifest_scenes: list[dict] = []
        pexels_hits = 0
        pixabay_hits = 0
        not_found = 0
        start_time = time.monotonic()

        for i, scene in enumerate(scenes, start=1):
            visual_cue: str = scene.get("visual_cue", "").strip()
            if not visual_cue:
                manifest_scenes.append({
                    "scene_number": i,
                    "image_path": None,
                    "query": "",
                    "source": "no_cue",
                    "photographer": None,
                    "original_url": None,
                })
                not_found += 1
                continue

            image_filename = f"scene_{i}.jpg"
            image_path = visuals_dir / image_filename
            relative_path = f"artifacts/visuals/{image_filename}"

            found = False
            source = "not_found"
            photographer = None
            original_url = None

            try:
                pexels_output = await self._pexels.invoke({
                    "query": visual_cue,
                    "count": 1,
                    "output_dir": str(visuals_dir),
                })
                pexels_assets: list[dict] = pexels_output.result.get("assets", [])
                if pexels_assets:
                    src_path = Path(pexels_assets[0]["local_path"])
                    if src_path.exists() and src_path != image_path:
                        shutil.move(str(src_path), str(image_path))
                    photographer = pexels_assets[0].get("photographer", "")
                    original_url = pexels_assets[0].get("url", "")
                    source = "pexels"
                    pexels_hits += 1
                    found = True
            except Exception as pexels_err:
                logger.warning(
                    "VisualsStepExecutor: Sahne %d Pexels hatası: %s", i, pexels_err
                )

            if not found:
                try:
                    pixabay_output = await self._pixabay.invoke({
                        "query": visual_cue,
                        "count": 1,
                        "output_dir": str(visuals_dir),
                    })
                    pixabay_assets: list[dict] = pixabay_output.result.get("assets", [])
                    if pixabay_assets:
                        src_path = Path(pixabay_assets[0]["local_path"])
                        if src_path.exists() and src_path != image_path:
                            shutil.move(str(src_path), str(image_path))
                        photographer = pixabay_assets[0].get("author", "")
                        original_url = pixabay_assets[0].get("url", "")
                        source = "pixabay"
                        pixabay_hits += 1
                        found = True
                except Exception as pixabay_err:
                    logger.warning(
                        "VisualsStepExecutor: Sahne %d Pixabay hatası: %s", i, pixabay_err
                    )

            if not found:
                not_found += 1
                manifest_scenes.append({
                    "scene_number": i,
                    "image_path": None,
                    "query": visual_cue,
                    "source": "not_found",
                    "photographer": None,
                    "original_url": None,
                })
            else:
                manifest_scenes.append({
                    "scene_number": i,
                    "image_path": relative_path,
                    "query": visual_cue,
                    "source": source,
                    "photographer": photographer,
                    "original_url": original_url,
                })

        latency_ms = int((time.monotonic() - start_time) * 1000)
        total_downloaded = pexels_hits + pixabay_hits

        if total_downloaded == 0:
            raise StepExecutionError(
                self.step_key(),
                f"Tüm sahneler için görsel bulunamadı: job={job.id}, "
                f"sahne_sayısı={len(scenes)}",
            )

        manifest_data = {
            "scenes": manifest_scenes,
            "total_downloaded": total_downloaded,
            "language": ctx.language.value,
        }

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="visuals_manifest.json",
            data=manifest_data,
        )

        logger.info(
            "VisualsStepExecutor: job=%s dil=%s sahne=%d indirilen=%d (pexels=%d pixabay=%d) "
            "bulunamayan=%d artifact=%s",
            job.id,
            ctx.language.value,
            len(scenes),
            total_downloaded,
            pexels_hits,
            pixabay_hits,
            not_found,
            artifact_path,
        )

        return {
            "artifact_path": artifact_path,
            "language": ctx.language.value,
            "scene_count": len(scenes),
            "provider": {
                "provider_id": "pexels+pixabay_fallback",
                "language": ctx.language.value,
                "scenes_requested": len(scenes),
                "scenes_found": total_downloaded,
                "scenes_not_found": not_found,
                "pexels_hits": pexels_hits,
                "pixabay_hits": pixabay_hits,
                "latency_ms": latency_ms,
            },
            "step": self.step_key(),
        }
