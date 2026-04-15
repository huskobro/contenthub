"""
ProductReviewScriptStepExecutor — Faz B.5 (single template deterministic v0).

Bu executor urun bilgisinden SINGLE template icin yapisal bir senaryo uretir.
LLM cagrisi Faz D'de eklenir — simdi deterministik bir iskelet ile sahne
planini olusturuyoruz. Bu sayede:

  - Pipeline end-to-end calisir.
  - Downstream step'ler (metadata, visuals, composition) gercek senaryo
    yapisi gorur.
  - Faz D'de LLM entegrasyonu eklendiginde ayni artifact schema korunur.

Artifact: workspace/<job>/artifacts/product_review_script.json
Schema:
  {
    "template_type": "single" | "comparison" | "alternatives",
    "language": "tr" | "en",
    "duration_seconds": int,
    "orientation": "vertical" | "horizontal",
    "scenes": [
       {
         "scene_id": "intro",
         "duration_ms": 4000,
         "narration": "...",
         "visual_hint": "product_hero",
         "product_refs": ["<product_id>"]
       },
       ...
    ],
    "generation": {
       "source": "deterministic_v0",
       "generated_at": "...",
       "product_scrape_artifact": "..."
    }
  }

Faz D'de source="llm" olacak ve scenes LLM ciktisi ile doldurulacak.
Ayni schema, ayni downstream sozlesme.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError

from ._helpers import _read_artifact, _write_artifact

logger = logging.getLogger(__name__)

_ARTIFACT_FILENAME = "product_review_script.json"
_SCRAPE_ARTIFACT = "product_scrape.json"


def _duration_split(total_seconds: int, template: str) -> list[tuple[str, int]]:
    """
    (scene_id, duration_ms) listesi dondurur. Toplami total_seconds*1000.

    single:
      intro (15%), product_hero (30%), features (35%), cta (20%)
    """
    if template == "single":
        weights = [("intro", 0.15), ("product_hero", 0.30), ("features", 0.35), ("cta", 0.20)]
    elif template == "comparison":
        weights = [("intro", 0.10), ("candidate_a", 0.35), ("candidate_b", 0.35), ("verdict_cta", 0.20)]
    elif template == "alternatives":
        weights = [("intro", 0.10), ("main_product", 0.25), ("alternative_1", 0.25), ("alternative_2", 0.20), ("cta", 0.20)]
    else:
        weights = [("intro", 0.25), ("body", 0.50), ("cta", 0.25)]
    total_ms = int(total_seconds) * 1000
    out: list[tuple[str, int]] = []
    remaining = total_ms
    for i, (sid, w) in enumerate(weights):
        if i == len(weights) - 1:
            out.append((sid, remaining))
        else:
            ms = int(total_ms * w)
            out.append((sid, ms))
            remaining -= ms
    return out


def _fmt_price(price: Optional[float], currency: Optional[str]) -> str:
    if price is None:
        return ""
    cur = currency or ""
    # TR format: 1234,56
    if isinstance(price, (int, float)):
        if price >= 1000:
            whole = int(price)
            frac = int(round((price - whole) * 100))
            formatted = f"{whole:,}".replace(",", ".")
            if frac:
                formatted = f"{formatted},{frac:02d}"
        else:
            formatted = f"{price:.2f}".replace(".", ",")
    else:
        formatted = str(price)
    return f"{formatted} {cur}".strip()


def _build_single_scenes(
    scrape: dict,
    language: str,
    total_seconds: int,
) -> list[dict]:
    """single template icin deterministik sahne plani."""
    products = scrape.get("products", []) if isinstance(scrape, dict) else []
    primary = products[0] if products else {}
    name = (primary.get("name") or "Urun").strip()
    price_str = _fmt_price(primary.get("price"), primary.get("currency"))
    brand = primary.get("brand") or ""

    is_tr = (language or "tr").lower().startswith("tr")

    def _t(tr: str, en: str) -> str:
        return tr if is_tr else en

    intro = _t(
        f"Bu videoda {name} urununu detaylica inceliyoruz.",
        f"In this video, we take a closer look at {name}.",
    )
    product_hero = _t(
        (f"{brand} imzali {name}. "
         f"Fiyati: {price_str}." if price_str else f"{brand} imzali {name}."),
        (f"{name} by {brand}. Price: {price_str}." if price_str else f"{name} by {brand}."),
    )
    features = _t(
        f"{name} hakkinda bilmeniz gereken ana ozellikler.",
        f"Key features you should know about {name}.",
    )
    cta = _t(
        "Daha fazla detay icin aciklamadaki baglantiya goz atabilirsiniz.",
        "Check the link in the description for more details.",
    )

    scene_texts = {
        "intro": intro,
        "product_hero": product_hero,
        "features": features,
        "cta": cta,
    }

    scenes: list[dict] = []
    for scene_id, duration_ms in _duration_split(total_seconds, "single"):
        scenes.append(
            {
                "scene_id": scene_id,
                "duration_ms": duration_ms,
                "narration": scene_texts.get(scene_id, ""),
                "visual_hint": scene_id,
                "product_refs": [primary.get("product_id")] if primary.get("product_id") else [],
            }
        )
    return scenes


class ProductReviewScriptStepExecutor(StepExecutor):
    """Faz B.5 — deterministik iskelet senaryo uretir. LLM Faz D'de gelir."""

    def step_key(self) -> str:
        return "script"

    async def execute(self, job: Job, step: JobStep) -> dict:
        if job is None or step is None:
            raise StepExecutionError(
                "script",
                "product_review.script executor henuz implement edilmedi (skeleton — Faz B'de doldurulacak).",
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

        template_type = raw_input.get("template_type", "single")
        language = raw_input.get("language", "tr")
        orientation = raw_input.get("orientation", "vertical")
        duration_seconds = int(raw_input.get("duration_seconds", 60))

        workspace_root = getattr(job, "workspace_path", None) or ""
        scrape = _read_artifact(workspace_root, job.id, _SCRAPE_ARTIFACT)
        if not scrape or not scrape.get("products"):
            raise StepExecutionError(
                self.step_key(),
                "product_scrape artifact yok — once scrape adimini calistirin.",
                retryable=False,
            )

        if template_type == "single":
            scenes = _build_single_scenes(scrape, language, duration_seconds)
        else:
            # Faz D'de comparison / alternatives icin ozel scene builder'lar gelecek.
            # Simdilik ayni mantikla cercevesel yapi kur.
            scenes = []
            for sid, ms in _duration_split(duration_seconds, template_type):
                scenes.append(
                    {
                        "scene_id": sid,
                        "duration_ms": ms,
                        "narration": "",
                        "visual_hint": sid,
                        "product_refs": [],
                    }
                )

        script_data = {
            "template_type": template_type,
            "language": language,
            "orientation": orientation,
            "duration_seconds": duration_seconds,
            "scenes": scenes,
            "generation": {
                "source": "deterministic_v0",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "note": (
                    "LLM entegrasyonu Faz D'de eklenecek; schema sabit "
                    "kalacak (backward-compatible)."
                ),
            },
        }

        artifact_path = _write_artifact(
            workspace_root, job.id, _ARTIFACT_FILENAME, script_data
        )
        return {
            "status": "ok",
            "artifact_path": artifact_path,
            "scenes_count": len(scenes),
            "source": "deterministic_v0",
        }
