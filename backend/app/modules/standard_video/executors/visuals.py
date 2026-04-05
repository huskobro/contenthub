"""
Görsel toplama adımı executor'ı (VisualsStepExecutor).

Her sahne için visual_cue → provider zinciri araması yapar.
İlk provider (primary) boş veya hatalıysa zincirdeki sonraki (fallback) denenir.
artifact_check idempotency tipi: visuals_manifest.json varsa adımı atlar.

Kısmi başarı kabul edilir: bazı sahneler null olabilir.
Tüm sahneler başarısızsa StepExecutionError fırlatılır.

M3-C1: __init__ imzası providers: list[BaseProvider] olarak güncellendi.
       İlk eleman primary, sonrakiler fallback. Provider-agnostic yapıya geçildi.
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
from app.providers.base import BaseProvider

from app.providers.trace_helper import build_provider_trace
from ._helpers import _resolve_artifact_path, _write_artifact, _read_artifact

logger = logging.getLogger(__name__)


class VisualsStepExecutor(StepExecutor):
    """
    Görsel toplama adımı executor'ı (M2-C4 / M3-C1).

    Her sahne için visual_cue → provider zinciri araması yapar.
    İlk provider başarısız veya boş döndürürse zincirdeki sonraki denenir.
    artifact_check idempotency tipi: visuals_manifest.json varsa adımı atlar.

    Kısmi başarı kabul edilir: bazı sahneler null olabilir.
    Tüm sahneler başarısızsa StepExecutionError fırlatılır.
    """

    def __init__(self, providers: list[BaseProvider]) -> None:
        """
        Args:
            providers: Görsel provider zinciri. İlk eleman primary,
                       sonrakiler fallback olarak kullanılır.
                       En az bir provider gereklidir.
        """
        if not providers:
            raise ValueError("VisualsStepExecutor: en az bir provider gereklidir.")
        self._providers = providers

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

        # Template/Style Blueprint context (M11)
        template_ctx = getattr(job, '_template_context', None)
        template_info = None
        image_style_prefix = None
        if isinstance(template_ctx, dict):
            template_info = {
                "template_id": template_ctx.get("template_id"),
                "template_name": template_ctx.get("template_name"),
                "template_version": template_ctx.get("template_version"),
                "link_role": template_ctx.get("link_role"),
            }
            bp = template_ctx.get("style_blueprint")
            if isinstance(bp, dict):
                visual_rules = bp.get("visual_rules")
                if isinstance(visual_rules, dict):
                    image_style_prefix = visual_rules.get("image_style")

        visuals_dir = _resolve_artifact_path(workspace_root, job.id, "visuals").parent / "visuals"
        visuals_dir.mkdir(parents=True, exist_ok=True)

        manifest_scenes: list[dict] = []
        provider_hits: dict[str, int] = {}   # provider_id → hit sayısı
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

            # image_style varsa query'e prefix olarak ekle
            search_query = visual_cue
            if image_style_prefix and isinstance(image_style_prefix, str):
                search_query = f"{image_style_prefix} {visual_cue}"

            image_filename = f"scene_{i}.jpg"
            image_path = visuals_dir / image_filename
            relative_path = f"artifacts/visuals/{image_filename}"

            found = False
            source = "not_found"
            photographer = None
            original_url = None

            # Provider zincirini sırayla dene: ilk = primary, sonrakiler = fallback
            for provider in self._providers:
                try:
                    prov_output = await provider.invoke({
                        "query": search_query,
                        "count": 1,
                        "output_dir": str(visuals_dir),
                    })
                    assets: list[dict] = prov_output.result.get("assets", [])
                    if assets:
                        src_path = Path(assets[0]["local_path"])
                        if src_path.exists() and src_path != image_path:
                            shutil.move(str(src_path), str(image_path))
                        # author veya photographer alanı — provider'a göre değişir
                        photographer = assets[0].get("photographer") or assets[0].get("author", "")
                        original_url = assets[0].get("url", "")
                        source = str(provider.provider_id())
                        pid = str(provider.provider_id())
                        provider_hits[pid] = provider_hits.get(pid, 0) + 1
                        found = True
                        break
                except Exception as prov_err:
                    logger.warning(
                        "VisualsStepExecutor: Sahne %d provider=%s hatası: %s",
                        i,
                        provider.provider_id(),
                        prov_err,
                    )

            if not found:
                not_found += 1
                manifest_scenes.append({
                    "scene_number": i,
                    "image_path": None,
                    "query": search_query,
                    "source": "not_found",
                    "photographer": None,
                    "original_url": None,
                })
            else:
                manifest_scenes.append({
                    "scene_number": i,
                    "image_path": relative_path,
                    "query": search_query,
                    "source": source,
                    "photographer": photographer,
                    "original_url": original_url,
                })

        latency_ms = int((time.monotonic() - start_time) * 1000)
        total_downloaded = sum(provider_hits.values())

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
            "VisualsStepExecutor: job=%s dil=%s sahne=%d indirilen=%d provider_hits=%s "
            "bulunamayan=%d artifact=%s",
            job.id,
            ctx.language.value,
            len(scenes),
            total_downloaded,
            provider_hits,
            not_found,
            artifact_path,
        )

        trace_info = build_provider_trace(
            provider_name=",".join(str(p.provider_id()) for p in self._providers),
            provider_kind="visuals",
            step_key=self.step_key(),
            success=True,
            latency_ms=latency_ms,
            extra={"provider_hits": provider_hits, "scenes_found": total_downloaded, "scenes_not_found": not_found},
        )

        result = {
            "artifact_path": artifact_path,
            "language": ctx.language.value,
            "scene_count": len(scenes),
            "provider": {
                "provider_ids": [str(p.provider_id()) for p in self._providers],
                "language": ctx.language.value,
                "scenes_requested": len(scenes),
                "scenes_found": total_downloaded,
                "scenes_not_found": not_found,
                "provider_hits": provider_hits,
                "latency_ms": latency_ms,
                "image_style_applied": image_style_prefix,
            },
            "provider_trace": trace_info,
            "step": self.step_key(),
        }
        if template_info is not None:
            result["template_info"] = template_info
        return result
