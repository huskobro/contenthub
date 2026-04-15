"""
ProductReviewMetadataStepExecutor — Faz B.6.

Urun bilgilerinden + scrape artifact'inden platform metadata'si uretir:
  - title
  - description (affiliate_disclosure + price_disclaimer ZORUNLU)
  - tags
  - category_hint

Faz D'de LLM ile basliklar zenginlestirilecek; simdilik deterministik + settings
sablonlari kullaniyoruz. Ayni artifact schema korunacagi icin downstream uyumlu.

Legal zorunluluklar (CLAUDE.md + plan karari):
  - affiliate_disclosure_text ALWAYS description'a eklenir (removable degil).
  - price_disclaimer_text description'a eklenir (fiyat varsa).
  - ToS checkbox bayragi audit icin return dict'ine yazilir.

Settings okumasi (snapshot-locked):
  - product_review.legal.affiliate_disclosure_text
  - product_review.legal.price_disclaimer_text
  - product_review.legal.tos_checkbox_required
  - product_review.metadata.default_category_hint (opsiyonel)

Artifact: workspace/<job>/artifacts/product_review_metadata.json
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

_ARTIFACT_FILENAME = "product_review_metadata.json"
_SCRAPE_ARTIFACT = "product_scrape.json"
_SCRIPT_ARTIFACT = "product_review_script.json"


_DEFAULT_DISCLOSURE_TR = (
    "Bu video affiliate baglanti icerir. Asagidaki baglantilardan yapilan "
    "alisverislerden komisyon kazanabiliriz. Fiyatlar ve stok durumu "
    "degisebilir."
)
_DEFAULT_DISCLAIMER_TR = (
    "Fiyatlar video kayit anindaki degerlerdir ve zaman icinde degisebilir. "
    "Guncel fiyat icin urun sayfasini kontrol ediniz."
)


def _build_tags(
    products: list[dict], template_type: str, language: str
) -> list[str]:
    """
    Tag uretimi — template'e gore:
      single:        primary.brand + primary.name ilk 2 kelime + "inceleme"
      comparison:    primary.brand + secondary[0].brand + primary.name ilk kelime
                     + secondary[0].name ilk kelime + "karsilastirma"
      alternatives:  primary.brand + alternatives[*].brand + primary.name ilk
                     kelime + "alternatif"
    """
    tags: list[str] = []
    primary = products[0] if products else {}
    name = (primary.get("name") or "").strip()
    brand = (primary.get("brand") or "").strip()
    if brand:
        tags.append(brand.lower())
    if name:
        parts = name.split()
        tags.extend([p.lower() for p in parts[:2] if p])

    # Comparison: ikinci urunun brand + ilk kelime
    if template_type == "comparison" and len(products) >= 2:
        sec = products[1]
        sec_brand = (sec.get("brand") or "").strip()
        sec_name = (sec.get("name") or "").strip()
        if sec_brand:
            tags.append(sec_brand.lower())
        if sec_name:
            first_w = sec_name.split()[0] if sec_name.split() else ""
            if first_w:
                tags.append(first_w.lower())

    # Alternatives: alternatif urunlerin brand + ilk kelime
    if template_type == "alternatives" and len(products) >= 2:
        for alt in products[1:3]:
            alt_brand = (alt.get("brand") or "").strip()
            alt_name = (alt.get("name") or "").strip()
            if alt_brand:
                tags.append(alt_brand.lower())
            if alt_name:
                first_w = alt_name.split()[0] if alt_name.split() else ""
                if first_w:
                    tags.append(first_w.lower())

    if template_type == "single":
        tags.append("inceleme" if language.startswith("tr") else "review")
    elif template_type == "comparison":
        tags.append("karsilastirma" if language.startswith("tr") else "comparison")
    elif template_type == "alternatives":
        tags.append("alternatif" if language.startswith("tr") else "alternatives")

    # De-dupe + truncate
    seen: set[str] = set()
    deduped: list[str] = []
    for t in tags:
        t = (t or "").strip()
        if t and t not in seen:
            seen.add(t)
            deduped.append(t[:40])
    return deduped[:15]


def _build_title(
    products: list[dict], template_type: str, language: str
) -> str:
    primary = products[0] if products else {}
    name = (primary.get("name") or "Urun").strip()
    is_tr = (language or "tr").lower().startswith("tr")

    if template_type == "single":
        return (f"{name} Inceleme" if is_tr else f"{name} Review")[:100]
    if template_type == "comparison":
        if len(products) >= 2:
            sec_name = (products[1].get("name") or "").strip()
            if sec_name:
                base = (
                    f"{name} vs {sec_name}"
                    if not is_tr
                    else f"{name} vs {sec_name} Karsilastirma"
                )
                return base[:100]
        return (f"{name} Karsilastirma" if is_tr else f"{name} Comparison")[:100]
    if template_type == "alternatives":
        return (f"{name} Icin Alternatifler" if is_tr else f"Alternatives to {name}")[
            :100
        ]
    return name[:100]


def _build_description(
    products: list[dict],
    *,
    template_type: str,
    disclosure: str,
    disclaimer: str,
    affiliate_url: Optional[str],
    language: str,
) -> str:
    is_tr = (language or "tr").lower().startswith("tr")
    lines: list[str] = []
    primary = products[0] if products else {}
    name = (primary.get("name") or "").strip()
    if name:
        if template_type == "comparison" and len(products) >= 2:
            sec_name = (products[1].get("name") or "").strip()
            if sec_name:
                lines.append(f"{name} vs {sec_name}")
            else:
                lines.append(name)
        elif template_type == "alternatives" and len(products) >= 2:
            alt_names = [
                (p.get("name") or "").strip() for p in products[1:3]
            ]
            alt_names = [a for a in alt_names if a]
            if alt_names:
                header = (
                    f"{name} vs {' / '.join(alt_names)}"
                    if not is_tr
                    else f"{name} icin alternatifler: {', '.join(alt_names)}"
                )
                lines.append(header)
            else:
                lines.append(name)
        else:
            lines.append(name)
        lines.append("")

    # Affiliate link (opsiyonel)
    if affiliate_url:
        label = "Urun baglantisi" if is_tr else "Product link"
        lines.append(f"{label}: {affiliate_url}")
        lines.append("")

    # Legal — kaldirilamaz
    disclosure = (disclosure or _DEFAULT_DISCLOSURE_TR).strip()
    disclaimer = (disclaimer or _DEFAULT_DISCLAIMER_TR).strip()
    lines.append("---")
    lines.append(disclosure)
    lines.append("")
    lines.append(disclaimer)
    return "\n".join(lines)


class ProductReviewMetadataStepExecutor(StepExecutor):
    """Faz B.6 — platform metadata + legal zorunluluklar."""

    def step_key(self) -> str:
        return "metadata"

    async def execute(self, job: Job, step: JobStep) -> dict:
        if job is None or step is None:
            raise StepExecutionError(
                "metadata",
                "product_review.metadata executor henuz implement edilmedi "
                "(skeleton — Faz B'de doldurulacak).",
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
        affiliate_enabled = bool(raw_input.get("affiliate_enabled", False))
        affiliate_url = raw_input.get("affiliate_url")  # opsiyonel

        settings_snapshot = raw_input.get("_settings_snapshot", {}) or {}
        disclosure = (
            settings_snapshot.get("product_review.legal.affiliate_disclosure_text")
            or raw_input.get("disclosure_text")
            or _DEFAULT_DISCLOSURE_TR
        )
        disclaimer = (
            settings_snapshot.get("product_review.legal.price_disclaimer_text")
            or _DEFAULT_DISCLAIMER_TR
        )
        tos_required = bool(
            settings_snapshot.get("product_review.legal.tos_checkbox_required", True)
        )

        workspace_root = getattr(job, "workspace_path", None) or ""
        scrape = _read_artifact(workspace_root, job.id, _SCRAPE_ARTIFACT)
        if not scrape or not scrape.get("products"):
            raise StepExecutionError(
                self.step_key(),
                "product_scrape artifact yok — once scrape adimini calistirin.",
                retryable=False,
            )

        products = [p for p in scrape.get("products", []) if isinstance(p, dict)]
        title = _build_title(products, template_type, language)
        tags = _build_tags(products, template_type, language)
        description = _build_description(
            products,
            template_type=template_type,
            disclosure=disclosure,
            disclaimer=disclaimer,
            affiliate_url=affiliate_url if affiliate_enabled else None,
            language=language,
        )

        metadata = {
            "title": title,
            "description": description,
            "tags": tags,
            "category_hint": settings_snapshot.get(
                "product_review.metadata.default_category_hint",
                "Howto & Style",
            ),
            "language": language,
            "orientation": raw_input.get("orientation", "vertical"),
            "legal": {
                "disclosure_applied": True,
                "disclosure_source": (
                    "settings"
                    if settings_snapshot.get(
                        "product_review.legal.affiliate_disclosure_text"
                    )
                    else "default"
                ),
                "disclaimer_applied": True,
                "affiliate_enabled": affiliate_enabled,
                "affiliate_url_included": bool(affiliate_enabled and affiliate_url),
                "tos_checkbox_required": tos_required,
            },
            "generation": {
                "source": "deterministic_v0",
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
        }

        artifact_path = _write_artifact(
            workspace_root, job.id, _ARTIFACT_FILENAME, metadata
        )
        return {
            "status": "ok",
            "artifact_path": artifact_path,
            "title": title,
            "tags_count": len(tags),
            "legal": metadata["legal"],
        }
