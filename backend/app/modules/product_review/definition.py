"""
Product Review Modül Tanımı (Faz A iskeleti).

product_review içerik modülünü tanımlar.
Global module_registry'e kaydı main.py lifespan handler'ında yapılır.

Pipeline adımları (sırasıyla):
  1. product_scrape  — Urun URL → parser_chain → Product + ProductSnapshot
  2. script          — Product(+secondary) → Senaryo (LLM, template-aware)
  3. metadata        — Senaryo → Başlık, açıklama, etiketler + affiliate disclosure
  4. visuals         — Urun gorseli (zorunlu) + stok gorseller
  5. tts             — Senaryo → Ses (standard_video TTSStepExecutor reuse)
  6. subtitle        — Ses → SRT (standard_video SubtitleStepExecutor reuse)
  7. preview_frame   — Renderstill (Level 1 preview — Faz C)
  8. preview_mini    — Mini MP4 (Level 2 preview — Faz C)
  9. composition     — Tum varliklar → Remotion props
  10. render         — Remotion CLI → Final video (.mp4)
  11. publish        — Platform yayini (operator_confirm)

Faz A: Stub executor'lar, gercek implementasyon Faz B+ de.
Hicbir adim atlanmaz — preview adimlari da tanimda vardir (preview-first kurali).
"""

from app.modules.base import ModuleDefinition, StepDefinition
from app.modules.product_review.executors import (
    ProductScrapeStepExecutor,
    ProductReviewScriptStepExecutor,
    ProductReviewMetadataStepExecutor,
    ProductReviewTTSStepExecutor,
    ProductReviewVisualsStepExecutor,
    ProductReviewSubtitleStepExecutor,
    ProductReviewCompositionStepExecutor,
    ProductReviewRenderStepExecutor,
    ProductReviewPreviewFrameExecutor,
    ProductReviewPreviewMiniExecutor,
    ProductReviewPublishStepExecutor,
)


PRODUCT_REVIEW_MODULE = ModuleDefinition(
    module_id="product_review",
    display_name="Urun Incelemesi",
    steps=[
        StepDefinition(
            step_key="product_scrape",
            step_order=1,
            idempotency_type="artifact_check",
            executor_class=ProductScrapeStepExecutor,
            display_name="Urun Tarama",
            description=(
                "Urun URL'sinden parser_chain (JSON-LD + OG + site-specific) "
                "ile urun bilgilerini cikarir ve ProductSnapshot yaratir. "
                "SSRF guard + per-host throttle uygular."
            ),
        ),
        StepDefinition(
            step_key="script",
            step_order=2,
            idempotency_type="re_executable",
            executor_class=ProductReviewScriptStepExecutor,
            display_name="Senaryo",
            description=(
                "Urun bilgilerine ve template_type'a gore video senaryosu uretir "
                "(single | comparison | alternatives). Affiliate disclosure zorunlu."
            ),
        ),
        StepDefinition(
            step_key="metadata",
            step_order=3,
            idempotency_type="re_executable",
            executor_class=ProductReviewMetadataStepExecutor,
            display_name="Metadata",
            description=(
                "Basiklik, aciklama, etiketler + affiliate disclosure + "
                "fiyat disclaimer metni ekler (setting-wired sablonlar)."
            ),
        ),
        StepDefinition(
            step_key="visuals",
            step_order=4,
            idempotency_type="artifact_check",
            executor_class=ProductReviewVisualsStepExecutor,
            display_name="Gorsel Toplama",
            description=(
                "Urunun ana gorselini indirir + destekleyici stok gorselleri toplar. "
                "Ana urun gorseli YOKSA job hata verir (deterministic fallback)."
            ),
        ),
        StepDefinition(
            step_key="tts",
            step_order=5,
            idempotency_type="artifact_check",
            executor_class=ProductReviewTTSStepExecutor,
            display_name="Ses Uretimi",
            description="Senaryo anlatimini ses dosyasina donusturur (standard_video TTSStepExecutor reuse).",
        ),
        StepDefinition(
            step_key="subtitle",
            step_order=6,
            idempotency_type="re_executable",
            executor_class=ProductReviewSubtitleStepExecutor,
            display_name="Altyazi",
            description="Ses dosyasindan SRT + kelime hizalamasi (standard_video SubtitleStepExecutor reuse).",
        ),
        StepDefinition(
            step_key="preview_frame",
            step_order=7,
            idempotency_type="re_executable",
            executor_class=ProductReviewPreviewFrameExecutor,
            display_name="Preview Frame (L1)",
            description=(
                "Renderstill ile tek kare preview (urun karti gorunumu). "
                "Hizli + ucuz — operator visual onayi icin."
            ),
        ),
        StepDefinition(
            step_key="preview_mini",
            step_order=8,
            idempotency_type="artifact_check",
            executor_class=ProductReviewPreviewMiniExecutor,
            display_name="Preview Mini MP4 (L2)",
            description=(
                "Ilk ~3 saniye mini MP4 (intro + urun sahnesi). "
                "Daha detayli onay — full render oncesi son visual check."
            ),
        ),
        StepDefinition(
            step_key="composition",
            step_order=9,
            idempotency_type="artifact_check",
            executor_class=ProductReviewCompositionStepExecutor,
            display_name="Kompozisyon",
            description="Tum varliklari Remotion props dosyasinda birlestirir (composition_map: ProductReview).",
        ),
        StepDefinition(
            step_key="render",
            step_order=10,
            idempotency_type="artifact_check",
            executor_class=ProductReviewRenderStepExecutor,
            display_name="Video Render",
            description="Remotion CLI ile ProductReview composition'i render eder (standard_video RenderStepExecutor reuse).",
        ),
        StepDefinition(
            step_key="publish",
            step_order=11,
            idempotency_type="operator_confirm",
            executor_class=ProductReviewPublishStepExecutor,
            display_name="Yayin",
            description=(
                "Render ciktisini platforma yukler. Publish review gate KORUNUR "
                "(full-auto mode bile — tek istisna settings-gated + audit). "
                "Affiliate disclosure + fiyat disclaimer metadata'da ZORUNLU."
            ),
        ),
    ],
    input_schema={
        "type": "object",
        "required": ["topic", "template_type", "primary_product_id"],
        "properties": {
            "topic": {
                "type": "string",
                "minLength": 3,
                "maxLength": 500,
                "description": "Video konusu — senaryonun bas satiri.",
            },
            "template_type": {
                "type": "string",
                "enum": ["single", "comparison", "alternatives"],
                "description": "Hangi review template'i: tek urun, karsilastirma, alternatif oneri.",
            },
            "primary_product_id": {
                "type": "string",
                "description": "Ana urunun products.id'si. ProductScrape adimindan once var olmali.",
            },
            "secondary_product_ids": {
                "type": "array",
                "items": {"type": "string"},
                "default": [],
                "description": "comparison/alternatives icin ek urun id'leri.",
            },
            "language": {
                "type": "string",
                "default": "tr",
                "description": "Senaryo + metadata dili. v1 TR default, EN architecture-ready.",
            },
            "orientation": {
                "type": "string",
                "enum": ["vertical", "horizontal"],
                "default": "vertical",
                "description": "Video yonu — v1 vertical + single combo ile baslar.",
            },
            "duration_seconds": {
                "type": "integer",
                "minimum": 30,
                "maximum": 600,
                "default": 60,
            },
            "run_mode": {
                "type": "string",
                "enum": ["semi_auto", "full_auto"],
                "default": "semi_auto",
                "description": (
                    "semi_auto: adim adim onay. full_auto: scrape_confidence + "
                    "min veri kriteri saglanirsa otomatik. Publish gate her iki modda KORUNUR."
                ),
            },
            "affiliate_enabled": {
                "type": "boolean",
                "default": False,
                "description": "Opsiyonel. Acikken affiliate URL + disclosure ZORUNLU.",
            },
        },
    },
    gate_defaults={
        "script_review": False,
        "metadata_review": False,
        "visuals_review": False,
        # publish_review_required HER ZAMAN True — full_auto bypass sadece settings-gated + audit
        "publish_review_required": True,
    },
    template_compat=[
        "product_review_single_v1",
        "product_review_comparison_v1",
        "product_review_alternatives_v1",
    ],
)
