"""
ProductReviewCompositionStepExecutor — Faz B.7b + Faz D.

Tum upstream artifact'leri toplar ve Remotion composition'i icin tek bir
props JSON'i uretir. composition_id safe composition_map'ten gelir:
  product_review            -> "ProductReview"
  product_review_preview    -> "ProductReviewPreviewFrame"  (Faz C)
  product_review_mini       -> "ProductReviewMini"          (Faz C)

Artifact: workspace/<job>/artifacts/product_review_composition.json
Schema (Faz D ile genisletildi — Remotion ProductReviewProps %100 uyumlu):
  {
    "composition_id": "ProductReview",
    "width": 1080, "height": 1920,
    "fps": 30,
    "duration_frames": int,
    "props": {
      "template_type": "single" | "comparison" | "alternatives",
      "language": "tr",
      "orientation": "vertical",
      "duration_seconds": int,
      "scenes": [
        {"scene_id": "...", "scene_key": "hero_card", "duration_ms": 4000,
         "narration": "...", "visual_hint": "...", "product_refs": [...]},
        ...
      ],
      "products": [...],                 # scrape'ten
      "primary_product_id": "...",
      "secondary_product_ids": [...],
      "metadata": {title, description, tags, legal},
      "visuals": {primary_image_url, secondary_image_urls, fallback_bg_color},
      "blueprint": {blueprint_id, version, tone, accentOverride, ...}
    }
  }
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.modules.standard_video.composition_map import get_composition_id

from ._helpers import _read_artifact, _write_artifact

logger = logging.getLogger(__name__)

_ARTIFACT_FILENAME = "product_review_composition.json"
_SCRIPT_ARTIFACT = "product_review_script.json"
_METADATA_ARTIFACT = "product_review_metadata.json"
_VISUALS_ARTIFACT = "product_review_visuals.json"
_SCRAPE_ARTIFACT = "product_scrape.json"

_FPS = 30


def _resolution_for(orientation: str) -> tuple[int, int]:
    if (orientation or "").lower().startswith("h"):
        return 1920, 1080  # horizontal
    return 1080, 1920  # vertical (default)


def _resolve_blueprint_from_snapshot(settings_snapshot: dict) -> dict:
    return {
        "blueprint_id": "product_review_v1",
        "version": 1,
        "tone": settings_snapshot.get("product_review.blueprint.tone") or "electric",
        "accentOverride": settings_snapshot.get(
            "product_review.blueprint.accent_override"
        ),
        "showWatermark": bool(
            settings_snapshot.get("product_review.blueprint.show_watermark", False)
        ),
        "watermarkText": settings_snapshot.get(
            "product_review.blueprint.watermark_text"
        ),
        "showPriceDisclaimerOverlay": bool(
            settings_snapshot.get(
                "product_review.blueprint.price_disclaimer_overlay", True
            )
        ),
        "priceDisclaimerText": settings_snapshot.get(
            "product_review.legal.price_disclaimer_text"
        ),
    }


class ProductReviewCompositionStepExecutor(StepExecutor):
    def step_key(self) -> str:
        return "composition"

    async def execute(self, job: Job, step: JobStep) -> dict:
        if job is None or step is None:
            raise StepExecutionError(
                "composition",
                "product_review.composition executor cagrildi ama job/step None.",
                retryable=False,
            )

        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json gecersiz JSON: {err}",
                retryable=False,
            )

        settings_snapshot = raw_input.get("_settings_snapshot", {}) or {}

        workspace_root = getattr(job, "workspace_path", None) or ""
        script = _read_artifact(workspace_root, job.id, _SCRIPT_ARTIFACT)
        metadata = _read_artifact(workspace_root, job.id, _METADATA_ARTIFACT)
        visuals = _read_artifact(workspace_root, job.id, _VISUALS_ARTIFACT)
        scrape = _read_artifact(workspace_root, job.id, _SCRAPE_ARTIFACT)

        missing = [
            name
            for name, val in (
                ("script", script),
                ("metadata", metadata),
                ("visuals", visuals),
                ("scrape", scrape),
            )
            if not val
        ]
        if missing:
            raise StepExecutionError(
                self.step_key(),
                f"Composition icin eksik artifact(lar): {missing}. "
                "Upstream step'ler tamamlanmadan composition calismaz.",
                retryable=False,
            )

        try:
            composition_id = get_composition_id("product_review")
        except ValueError as exc:
            raise StepExecutionError(
                self.step_key(),
                f"composition_map'te 'product_review' kaydi yok: {exc}",
                retryable=False,
            )

        template_type = script.get("template_type") or raw_input.get(
            "template_type", "single"
        )
        orientation = (
            script.get("orientation")
            or raw_input.get("orientation")
            or "vertical"
        ).lower()
        width, height = _resolution_for(orientation)
        duration_seconds = int(script.get("duration_seconds") or 60)
        duration_frames = duration_seconds * _FPS

        scenes = script.get("scenes", []) or []

        products = [
            p for p in (scrape.get("products") or []) if isinstance(p, dict)
        ]
        primary_id = (
            raw_input.get("primary_product_id")
            or scrape.get("primary_product_id")
            or (products[0].get("product_id") if products else None)
        )
        secondary_ids = (
            raw_input.get("secondary_product_ids")
            or scrape.get("secondary_product_ids")
            or []
        )

        props = {
            "template_type": template_type,
            "language": script.get("language", "tr"),
            "orientation": orientation,
            "duration_seconds": duration_seconds,
            "scenes": scenes,
            "products": products,
            "primary_product_id": primary_id,
            "secondary_product_ids": list(secondary_ids),
            "metadata": {
                "title": metadata.get("title"),
                "description": metadata.get("description"),
                "tags": metadata.get("tags", []),
                "legal": metadata.get("legal", {}),
            },
            "visuals": {
                "primary_image_url": visuals.get("primary_image_url"),
                "secondary_image_urls": visuals.get("secondary_image_urls", []),
                "fallback_bg_color": visuals.get("fallback_bg_color", "#111111"),
            },
            "blueprint": _resolve_blueprint_from_snapshot(settings_snapshot),
        }

        composition = {
            "composition_id": composition_id,
            "width": width,
            "height": height,
            "fps": _FPS,
            "duration_frames": duration_frames,
            "props": props,
        }

        artifact_path = _write_artifact(
            workspace_root, job.id, _ARTIFACT_FILENAME, composition
        )
        return {
            "status": "ok",
            "artifact_path": artifact_path,
            "composition_id": composition_id,
            "template_type": template_type,
            "width": width,
            "height": height,
            "fps": _FPS,
            "duration_frames": duration_frames,
            "scenes_count": len(scenes),
        }
