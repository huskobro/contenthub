"""
Product Review Preview Frame executor — Faz C Level 1.

Remotion `ProductReviewPreviewFrame` composition'ini cagirir, tek kare
PNG/JPG uretir. Amac: wizard'da kullaniciya "video nasil gorunecek" diye
hizli goster (hero_card ya da price_reveal sahnesi).

Davranis:
  - composition_props.json / product_script.json / product_metadata.json /
    product_visuals.json artifact'larini okur.
  - blueprint snapshot'ini `_settings_snapshot` + DB'den alir (fallback: default).
  - preview_props.json uretir, `npx remotion still` cagirir.
  - preview artifact'ina blueprint_id + version tag'i yansitilir (traceability).

Idempotency: `preview_frame.jpg` varsa skipped donulur.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Optional

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.modules.product_review.confidence import (
    aggregate_confidence,
    gate_decision,
)
from app.modules.standard_video.composition_map import get_preview_composition_id

from ._helpers import _read_artifact, _write_artifact

logger = logging.getLogger(__name__)

PREVIEW_COMPOSITION_ID: str = get_preview_composition_id("product_review_preview")
_DEFAULT_TIMEOUT_SECONDS: int = 180
_OUTPUT_FILENAME_DEFAULT = "preview_frame.jpg"

# renderer dizini
_BACKEND_DIR = Path(__file__).resolve().parents[5]
_RENDERER_DIR = _BACKEND_DIR / "renderer"


def _resolve_blueprint_from_snapshot(settings_snapshot: dict) -> dict:
    """
    settings_snapshot'tan blueprint onemli alanlarini cikarir. Yoksa default dondurur.
    """
    bp: dict = {
        "blueprint_id": "product_review_v1",
        "version": 1,
        "tone": settings_snapshot.get("product_review.blueprint.tone") or "electric",
        "accentOverride": settings_snapshot.get("product_review.blueprint.accent_override"),
        "showWatermark": bool(settings_snapshot.get("product_review.blueprint.show_watermark", False)),
        "watermarkText": settings_snapshot.get("product_review.blueprint.watermark_text"),
        "showPriceDisclaimerOverlay": bool(
            settings_snapshot.get("product_review.blueprint.price_disclaimer_overlay", True)
        ),
        "priceDisclaimerText": settings_snapshot.get(
            "product_review.legal.price_disclaimer_text"
        ),
    }
    return bp


def _extract_products_from_scrape(scrape_artifact: Optional[dict]) -> list[dict]:
    if not scrape_artifact:
        return []
    products = scrape_artifact.get("products") or []
    return [p for p in products if isinstance(p, dict)]


class ProductReviewPreviewFrameExecutor(StepExecutor):
    """
    step_key = "preview_frame" — L1 preview (renderStill).
    """

    def step_key(self) -> str:
        return "preview_frame"

    async def execute(self, job: Job, step: JobStep) -> dict:  # type: ignore[override]
        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json gecersiz JSON: {err}",
                retryable=False,
            )

        workspace_root = getattr(job, "workspace_path", None) or raw_input.get("workspace_root", "") or ""
        settings_snapshot = raw_input.get("_settings_snapshot", {}) or {}

        # Idempotency
        out_path = _artifact_dir_for_job(workspace_root, job.id) / _OUTPUT_FILENAME_DEFAULT
        if out_path.exists():
            logger.info("preview_frame idempotent, atlandi. job=%s", job.id)
            return {
                "status": "skipped_idempotent",
                "composition_id": PREVIEW_COMPOSITION_ID,
                "preview_path": str(out_path),
            }

        scrape = _read_artifact(workspace_root, job.id, "product_scrape.json") or {}
        metadata = _read_artifact(workspace_root, job.id, "product_metadata.json") or {}
        visuals = _read_artifact(workspace_root, job.id, "product_visuals.json") or {}
        products = _extract_products_from_scrape(scrape)
        if not products:
            raise StepExecutionError(
                self.step_key(),
                "preview_frame: product_scrape.json urun listesi bos.",
                retryable=False,
            )

        primary_id = raw_input.get("primary_product_id") or scrape.get("primary_product_id")
        if not primary_id:
            primary_id = products[0].get("product_id")

        # Faz E: full-auto + low-confidence bloklamasi + gate kaydi.
        run_mode = (raw_input.get("run_mode") or "semi_auto").strip().lower()
        data_confidence = scrape.get("data_confidence")
        if data_confidence is None:
            data_confidence = aggregate_confidence(products)
        else:
            try:
                data_confidence = float(data_confidence)
            except (TypeError, ValueError):
                data_confidence = aggregate_confidence(products)
        decision = gate_decision(
            run_mode=run_mode,
            data_confidence=float(data_confidence),
            settings_snapshot=settings_snapshot,
        )
        if decision["should_block"]:
            raise StepExecutionError(
                self.step_key(),
                f"preview_frame: {decision['reason']}",
                retryable=False,
            )

        # Scene select — settings (product_review.preview.frame_scene_key) override
        scene_key = (
            settings_snapshot.get("product_review.preview.frame_scene_key")
            or "hero_card"
        )
        allowed_scenes = {"intro_hook", "hero_card", "price_reveal", "verdict_card", "cta_outro"}
        if scene_key not in allowed_scenes:
            logger.warning(
                "preview_frame: gecersiz scene_key=%s, hero_card kullaniliyor.",
                scene_key,
            )
            scene_key = "hero_card"

        preview_props = {
            "scene_key": scene_key,
            "scene_duration_ms": 1000,
            "products": products,
            "primary_product_id": primary_id,
            "secondary_product_ids": raw_input.get("secondary_product_ids") or scrape.get("secondary_product_ids") or [],
            "metadata": {
                "title": metadata.get("title", ""),
                "description": metadata.get("description", ""),
                "tags": metadata.get("tags", []),
                "legal": metadata.get("legal", {}),
            },
            "orientation": raw_input.get("orientation", "vertical"),
            "language": raw_input.get("language", "tr"),
            "blueprint": _resolve_blueprint_from_snapshot(settings_snapshot),
            "visuals": visuals or {"primary_image_url": "", "secondary_image_urls": []},
        }

        props_path_str = _write_artifact(
            workspace_root, job.id, "preview_frame_props.json", preview_props
        )

        out_path.parent.mkdir(parents=True, exist_ok=True)

        started = time.monotonic()
        render_result = await self._run_still(
            props_path=props_path_str,
            output_path=str(out_path),
            job_id=job.id,
        )
        elapsed_ms = int((time.monotonic() - started) * 1000)
        if not render_result["success"]:
            raise StepExecutionError(
                self.step_key(),
                f"preview_frame render basarisiz: {render_result.get('error')}",
            )

        # Artifact registry (JSON)
        _write_artifact(
            workspace_root,
            job.id,
            "preview_frame.json",
            {
                "composition_id": PREVIEW_COMPOSITION_ID,
                "output_path": str(out_path),
                "scene_key": scene_key,
                "blueprint_id": preview_props["blueprint"].get("blueprint_id"),
                "blueprint_version": preview_props["blueprint"].get("version"),
                "elapsed_ms": elapsed_ms,
                "level": 1,
                "gate": decision,
            },
        )
        logger.info(
            "preview_frame tamam. job=%s scene=%s elapsed_ms=%d",
            job.id, scene_key, elapsed_ms,
        )
        return {
            "status": "ok",
            "composition_id": PREVIEW_COMPOSITION_ID,
            "preview_path": str(out_path),
            "scene_key": scene_key,
            "level": 1,
            "elapsed_ms": elapsed_ms,
            "gate": decision,
        }

    async def _run_still(
        self,
        props_path: str,
        output_path: str,
        job_id: str,
    ) -> dict:
        renderer_dir = _RENDERER_DIR
        if not renderer_dir.exists():
            return {"success": False, "error": f"renderer/ yok: {renderer_dir}"}
        if not (renderer_dir / "node_modules").exists():
            return {"success": False, "error": "renderer/node_modules yok (npm install)."}

        args = [
            "npx", "remotion", "still",
            "src/Root.tsx",
            PREVIEW_COMPOSITION_ID,
            output_path,
            "--props", props_path,
            "--frame", "0",
            "--log", "info",
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *args,
                cwd=str(renderer_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=_DEFAULT_TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                return {"success": False, "error": f"preview_frame timeout ({_DEFAULT_TIMEOUT_SECONDS}s)"}
            stderr_text = (stderr or b"").decode("utf-8", errors="replace")
            if proc.returncode != 0:
                logger.error(
                    "preview_frame subprocess basarisiz job=%s rc=%s stderr=%s",
                    job_id, proc.returncode, stderr_text[:1000],
                )
                return {
                    "success": False,
                    "returncode": proc.returncode,
                    "error": f"rc={proc.returncode}: {stderr_text[:400]}",
                }
            return {"success": True, "returncode": 0}
        except FileNotFoundError:
            return {"success": False, "error": "npx komutu bulunamadi."}
        except OSError as err:
            return {"success": False, "error": f"OS error: {err}"}


def _artifact_dir_for_job(workspace_root: str, job_id: str) -> Path:
    from ._helpers import _artifact_dir
    return _artifact_dir(workspace_root, job_id)
