"""
ProductReviewCompositionStepExecutor — Faz B.7b.

Tum upstream artifact'leri toplar ve Remotion composition'i icin tek bir
props JSON'i uretir. composition_id safe composition_map'ten gelir:
  product_review            → "ProductReview"
  product_review_preview    → "ProductReviewPreviewFrame"  (Faz C — preview frame)
  product_review_mini       → "ProductReviewMini"          (Faz C — mini mp4)

Artifact: workspace/<job>/artifacts/product_review_composition.json
Schema:
  {
    "composition_id": "ProductReview",
    "width": 1080, "height": 1920,          # vertical (default)
    "fps": 30,
    "duration_frames": int,
    "props": {
       "language": "tr",
       "orientation": "vertical",
       "scenes": [...],                      # script'ten
       "metadata": { "title": "...", ... },  # metadata'dan
       "visuals": { "primary_image_url": "..." }
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

_FPS = 30


def _resolution_for(orientation: str) -> tuple[int, int]:
    if (orientation or "").lower().startswith("h"):
        return 1920, 1080  # horizontal
    return 1080, 1920  # vertical (default)


class ProductReviewCompositionStepExecutor(StepExecutor):
    def step_key(self) -> str:
        return "composition"

    async def execute(self, job: Job, step: JobStep) -> dict:
        if job is None or step is None:
            raise StepExecutionError(
                "composition",
                "product_review.composition executor henuz implement edilmedi "
                "(skeleton — Faz B'de doldurulacak).",
                retryable=False,
            )

        workspace_root = getattr(job, "workspace_path", None) or ""
        script = _read_artifact(workspace_root, job.id, _SCRIPT_ARTIFACT)
        metadata = _read_artifact(workspace_root, job.id, _METADATA_ARTIFACT)
        visuals = _read_artifact(workspace_root, job.id, _VISUALS_ARTIFACT)

        missing = [
            name
            for name, val in (
                ("script", script),
                ("metadata", metadata),
                ("visuals", visuals),
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

        orientation = (script.get("orientation") or "vertical").lower()
        width, height = _resolution_for(orientation)
        duration_seconds = int(script.get("duration_seconds") or 60)
        duration_frames = duration_seconds * _FPS

        props = {
            "language": script.get("language", "tr"),
            "orientation": orientation,
            "duration_seconds": duration_seconds,
            "scenes": script.get("scenes", []),
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
            "width": width,
            "height": height,
            "fps": _FPS,
            "duration_frames": duration_frames,
        }
