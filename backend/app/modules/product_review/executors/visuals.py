"""
ProductReviewVisualsStepExecutor — Faz B.7a.

Scrape artifact'inden + primary product gorselinden visuals planini kurar.
Faz B'de minimum requirement: primary_image_url zorunludur. Yoksa hata verir
(deterministic fallback yok — kullanici karari: gercek urun gorseli yoksa
render fake gorselle yapilmaz).

Artifact: workspace/<job>/artifacts/product_review_visuals.json
Schema:
  {
    "primary_image_url": "...",
    "secondary_image_urls": ["...", ...],
    "fallback_bg_color": "#111111",
    "source": "product_scrape"
  }

Faz D'de stok gorsel/AI-assisted varyantlar eklenecek; schema sabit kalacak.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError

from ._helpers import _read_artifact, _write_artifact

logger = logging.getLogger(__name__)

_ARTIFACT_FILENAME = "product_review_visuals.json"
_SCRAPE_ARTIFACT = "product_scrape.json"


class ProductReviewVisualsStepExecutor(StepExecutor):
    def step_key(self) -> str:
        return "visuals"

    async def execute(self, job: Job, step: JobStep) -> dict:
        if job is None or step is None:
            raise StepExecutionError(
                "visuals",
                "product_review.visuals executor henuz implement edilmedi "
                "(skeleton — Faz B'de doldurulacak).",
                retryable=False,
            )

        workspace_root = getattr(job, "workspace_path", None) or ""
        scrape = _read_artifact(workspace_root, job.id, _SCRAPE_ARTIFACT)
        if not scrape or not scrape.get("products"):
            raise StepExecutionError(
                self.step_key(),
                "product_scrape artifact yok — once scrape adimini calistirin.",
                retryable=False,
            )

        products = scrape["products"]
        primary = products[0]
        primary_image: Optional[str] = primary.get("image_url")
        if not primary_image:
            raise StepExecutionError(
                self.step_key(),
                (
                    "Primary product icin gorsel yok. product_review modulu "
                    "gercek urun gorseli olmadan render etmez — URL'yi "
                    "degistirin veya elle gorsel yukleyin (Faz C ozelligi)."
                ),
                retryable=False,
            )

        secondary_images: list[str] = []
        for p in products[1:]:
            u = p.get("image_url")
            if u:
                secondary_images.append(u)

        visuals = {
            "primary_image_url": primary_image,
            "secondary_image_urls": secondary_images,
            "fallback_bg_color": "#111111",
            "source": "product_scrape",
        }
        artifact_path = _write_artifact(
            workspace_root, job.id, _ARTIFACT_FILENAME, visuals
        )
        return {
            "status": "ok",
            "artifact_path": artifact_path,
            "primary_image_url": primary_image,
            "secondary_count": len(secondary_images),
        }
