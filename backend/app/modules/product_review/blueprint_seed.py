"""
Product Review style blueprint seeder — Faz C.

`product_review_v1` blueprint'ini DB'ye seed eder. Idempotent: ayni isim +
module_scope ile mevcut kayit varsa tekrar olusturmaz.

Blueprint verileri JSON string olarak DB'ye yazilir; renderer composition
zaten kendi default'larini tasidigi icin bu DB kayitlari "admin editlesin"
(Settings/Style Blueprints UI) diye tutulur. Job snapshot tarafindan
locked — runtime degisiklikleri calisan job'u bozmaz.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import StyleBlueprint

logger = logging.getLogger(__name__)


BLUEPRINT_NAME = "product_review_v1"
MODULE_SCOPE = "product_review"
VERSION = 1


def _visual_rules() -> dict:
    return {
        "id": "product_review_v1",
        "tone": "electric",
        "allowed_tones": ["electric", "crimson", "emerald", "gold", "mono"],
        "palette_rules": {
            "accent_contrast_min": 4.5,
            "text_on_accent_contrast_min": 4.5,
            "allow_pure_white": True,
        },
        "image_rules": {
            "primary_image_required": True,
            "rounded_corners_ratio": 0.12,
            "shadow_level": "heavy",
        },
        "watermark": {
            "enabled": False,
            "text": None,
            "position": "bottom-right",
        },
        "overlays": {
            "price_disclaimer_required": True,
            "affiliate_disclosure_in_description": True,
        },
    }


def _motion_rules() -> dict:
    return {
        "enter_spring_damping": 12,
        "enter_spring_mass": 0.7,
        "ease_out": [0.16, 1.0, 0.3, 1.0],
        "hero_float_amplitude_px": 8,
        "hero_float_period_frames": 120,
        "scene_enter_frames": 10,
        "scene_exit_frames": 8,
        "disallowed": ["strobe", "harsh_camera_shake", "glitch_blink"],
    }


def _layout_rules() -> dict:
    return {
        "orientations": ["vertical", "horizontal"],
        "default_orientation": "vertical",
        "safe_area_pct_vertical": 5,
        "safe_area_pct_horizontal": 6,
        "grid": {
            "spec_cols_vertical": 1,
            "spec_cols_horizontal": 2,
            "comparison_cols": 2,
        },
    }


def _subtitle_rules() -> dict:
    return {
        "preset_default": "clean_white",
        "min_font_size_vertical": 44,
        "min_font_size_horizontal": 36,
        "allow_emoji": False,
        "forbid_all_caps_long_lines": True,
    }


def _thumbnail_rules() -> dict:
    return {
        "source_scene_preferred": "hero_card",
        "min_resolution": {"width": 1280, "height": 720},
        "text_overlay_allowed": True,
        "show_price_allowed": True,
    }


def _preview_strategy() -> dict:
    return {
        "level_1": {
            "enabled": True,
            "composition_id": "ProductReviewPreviewFrame",
            "scenes": ["hero_card", "price_reveal"],
            "output": "jpg",
        },
        "level_2": {
            "enabled": True,
            "composition_id": "ProductReviewMini",
            "duration_seconds": 10,
            "scenes": ["intro_hook", "hero_card", "price_reveal", "cta_outro"],
            "output": "mp4",
        },
        "level_3": {
            "enabled": True,
            "composition_id": "ProductReview",
            "note": "full chain (script/metadata/visuals/composition + TTS/subtitle/render)",
        },
    }


async def seed_product_review_blueprints(db: AsyncSession) -> int:
    """
    `product_review_v1` blueprint DB'de yoksa olusturur.

    Returns:
        Olusturulan blueprint sayisi (0 veya 1).
    """
    existing = await db.execute(
        select(StyleBlueprint).where(
            StyleBlueprint.name == BLUEPRINT_NAME,
            StyleBlueprint.module_scope == MODULE_SCOPE,
        )
    )
    if existing.scalar_one_or_none() is not None:
        logger.debug("product_review blueprint seed: zaten mevcut, atlandi.")
        return 0

    bp = StyleBlueprint(
        name=BLUEPRINT_NAME,
        module_scope=MODULE_SCOPE,
        status="active",
        version=VERSION,
        visual_rules_json=json.dumps(_visual_rules(), ensure_ascii=False),
        motion_rules_json=json.dumps(_motion_rules(), ensure_ascii=False),
        layout_rules_json=json.dumps(_layout_rules(), ensure_ascii=False),
        subtitle_rules_json=json.dumps(_subtitle_rules(), ensure_ascii=False),
        thumbnail_rules_json=json.dumps(_thumbnail_rules(), ensure_ascii=False),
        preview_strategy_json=json.dumps(_preview_strategy(), ensure_ascii=False),
        notes=(
            "Product Review module style blueprint (Faz C). "
            "DB/system-owned; admin may edit. Renderer uses default palette "
            "when job snapshot does not override."
        ),
    )
    db.add(bp)
    await db.commit()
    await db.refresh(bp)
    logger.info("product_review blueprint seeded: id=%s name=%s", bp.id, bp.name)
    return 1
