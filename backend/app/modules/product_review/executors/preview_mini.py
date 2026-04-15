"""
Product Review Preview Mini executor — Faz C Level 2.

Remotion `ProductReviewMini` composition'ini cagirir, kisa bir MP4 (~10s)
uretir. Sahne listesi blueprint preview_strategy'den alinir (intro -> hero ->
price -> cta). Final render degildir; wizard deneyimi icin hizli onizleme.

Idempotency: `preview_mini.mp4` varsa skipped donulur.
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
from app.modules.standard_video.composition_map import get_preview_composition_id

from ._helpers import _read_artifact, _write_artifact, _artifact_dir

logger = logging.getLogger(__name__)

PREVIEW_COMPOSITION_ID: str = get_preview_composition_id("product_review_mini")
_DEFAULT_TIMEOUT_SECONDS: int = 420  # ~7 min; mini render 10s video + overhead
_OUTPUT_FILENAME = "preview_mini.mp4"

_BACKEND_DIR = Path(__file__).resolve().parents[5]
_RENDERER_DIR = _BACKEND_DIR / "renderer"

_DEFAULT_MINI_SCENES = [
    ("intro_hook", 2500),
    ("hero_card", 3500),
    ("price_reveal", 2500),
    ("cta_outro", 1500),
]


def _resolve_blueprint(settings_snapshot: dict) -> dict:
    return {
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


class ProductReviewPreviewMiniExecutor(StepExecutor):
    """
    step_key = "preview_mini" — L2 mini MP4 preview.
    """

    def step_key(self) -> str:
        return "preview_mini"

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

        out_path = _artifact_dir(workspace_root, job.id) / _OUTPUT_FILENAME
        if out_path.exists():
            logger.info("preview_mini idempotent, atlandi. job=%s", job.id)
            return {
                "status": "skipped_idempotent",
                "composition_id": PREVIEW_COMPOSITION_ID,
                "preview_path": str(out_path),
            }

        scrape = _read_artifact(workspace_root, job.id, "product_scrape.json") or {}
        metadata = _read_artifact(workspace_root, job.id, "product_metadata.json") or {}
        visuals = _read_artifact(workspace_root, job.id, "product_visuals.json") or {}
        products = [p for p in (scrape.get("products") or []) if isinstance(p, dict)]
        if not products:
            raise StepExecutionError(
                self.step_key(),
                "preview_mini: product_scrape.json urun listesi bos.",
                retryable=False,
            )

        primary_id = raw_input.get("primary_product_id") or scrape.get("primary_product_id") or products[0].get("product_id")
        secondary_ids = raw_input.get("secondary_product_ids") or scrape.get("secondary_product_ids") or []

        scenes = [
            {"scene_id": f"mini_{i}", "scene_key": key, "duration_ms": dur}
            for i, (key, dur) in enumerate(_DEFAULT_MINI_SCENES)
        ]
        total_ms = sum(s["duration_ms"] for s in scenes)

        mini_props = {
            "template_type": raw_input.get("template_type", "single"),
            "orientation": raw_input.get("orientation", "vertical"),
            "language": raw_input.get("language", "tr"),
            "duration_seconds": max(1, total_ms // 1000),
            "scenes": scenes,
            "products": products,
            "primary_product_id": primary_id,
            "secondary_product_ids": secondary_ids,
            "metadata": {
                "title": metadata.get("title", ""),
                "description": metadata.get("description", ""),
                "tags": metadata.get("tags", []),
                "legal": metadata.get("legal", {}),
            },
            "visuals": visuals or {"primary_image_url": "", "secondary_image_urls": []},
            "blueprint": _resolve_blueprint(settings_snapshot),
        }

        props_path = _write_artifact(
            workspace_root, job.id, "preview_mini_props.json", mini_props
        )
        out_path.parent.mkdir(parents=True, exist_ok=True)

        started = time.monotonic()
        render_result = await self._run_media(
            props_path=props_path,
            output_path=str(out_path),
            job_id=job.id,
        )
        elapsed_ms = int((time.monotonic() - started) * 1000)
        if not render_result["success"]:
            raise StepExecutionError(
                self.step_key(),
                f"preview_mini render basarisiz: {render_result.get('error')}",
            )

        _write_artifact(
            workspace_root,
            job.id,
            "preview_mini.json",
            {
                "composition_id": PREVIEW_COMPOSITION_ID,
                "output_path": str(out_path),
                "duration_seconds": mini_props["duration_seconds"],
                "scenes": [s["scene_key"] for s in scenes],
                "blueprint_id": mini_props["blueprint"]["blueprint_id"],
                "blueprint_version": mini_props["blueprint"]["version"],
                "elapsed_ms": elapsed_ms,
                "level": 2,
            },
        )
        return {
            "status": "ok",
            "composition_id": PREVIEW_COMPOSITION_ID,
            "preview_path": str(out_path),
            "scenes": [s["scene_key"] for s in scenes],
            "duration_seconds": mini_props["duration_seconds"],
            "level": 2,
            "elapsed_ms": elapsed_ms,
        }

    async def _run_media(
        self,
        props_path: str,
        output_path: str,
        job_id: str,
    ) -> dict:
        renderer_dir = _RENDERER_DIR
        if not renderer_dir.exists():
            return {"success": False, "error": f"renderer/ yok: {renderer_dir}"}
        if not (renderer_dir / "node_modules").exists():
            return {"success": False, "error": "renderer/node_modules yok."}

        args = [
            "npx", "remotion", "render",
            "src/Root.tsx",
            PREVIEW_COMPOSITION_ID,
            output_path,
            "--props", props_path,
            "--codec", "h264",
            "--pixel-format", "yuv420p",
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
                return {
                    "success": False,
                    "error": f"preview_mini timeout ({_DEFAULT_TIMEOUT_SECONDS}s)",
                }
            stderr_text = (stderr or b"").decode("utf-8", errors="replace")
            if proc.returncode != 0:
                logger.error(
                    "preview_mini subprocess basarisiz job=%s rc=%s stderr=%s",
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
