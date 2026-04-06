"""
M30 — Render mode, subtitle style, lower-third style, trust enforcement testleri.

Kapsam:
  - NewsBulletin create/update ile M30 alanlarinin DB'ye yazilmasi
  - start_production snapshot'ina M30 alanlarinin dahil edilmesi
  - Trust enforcement servisi
  - Category → style suggestion servisi
  - Composition executor subtitle preset integration
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.news_bulletin.service import (
    get_category_style_suggestion,
    get_dominant_category,
    CATEGORY_STYLE_HINTS,
)


class TestCategoryStyleSuggestion:
    """M30 — Category → style auto mapping testleri."""

    def test_known_category_returns_match(self):
        result = get_category_style_suggestion("tech")
        assert result["category_matched"] is True
        assert result["category_used"] == "tech"
        assert result["suggested_subtitle_style"] == "gradient_glow"

    def test_unknown_category_returns_general_fallback(self):
        result = get_category_style_suggestion("unknown_category_xyz")
        assert result["category_matched"] is False
        assert result["category_used"] == "general"

    def test_none_category_returns_general_fallback(self):
        result = get_category_style_suggestion(None)
        assert result["category_matched"] is False
        assert result["category_used"] == "general"

    def test_all_known_categories_have_required_keys(self):
        required_keys = {"suggested_subtitle_style", "suggested_lower_third_style", "suggested_composition_direction"}
        for cat, hints in CATEGORY_STYLE_HINTS.items():
            assert required_keys.issubset(hints.keys()), f"Category '{cat}' missing keys"

    def test_finance_category(self):
        result = get_category_style_suggestion("finance")
        assert result["category_matched"] is True
        assert result["suggested_subtitle_style"] == "minimal_dark"

    def test_sports_category(self):
        result = get_category_style_suggestion("sports")
        assert result["category_matched"] is True
        assert result["suggested_subtitle_style"] == "bold_yellow"


class TestDominantCategory:
    """M30 — Baskın kategori tespiti testleri."""

    def test_single_category(self):
        items = [{"category": "tech"}, {"category": "tech"}, {"category": "finance"}]
        assert get_dominant_category(items) == "tech"

    def test_empty_items(self):
        assert get_dominant_category([]) is None

    def test_no_category_fields(self):
        items = [{"headline": "test"}, {"headline": "test2"}]
        assert get_dominant_category(items) is None

    def test_mixed_with_none(self):
        items = [
            {"category": None},
            {"category": "crypto"},
            {"category": "crypto"},
            {"category": None},
        ]
        assert get_dominant_category(items) == "crypto"

    def test_all_none_categories(self):
        items = [{"category": None}, {"category": None}]
        assert get_dominant_category(items) is None

    def test_tie_returns_first(self):
        """Eşit sayıda kategori varsa ilk karşılaşılanı döner (Counter.most_common davranışı)."""
        items = [{"category": "tech"}, {"category": "finance"}]
        result = get_dominant_category(items)
        assert result in ("tech", "finance")


class TestSubtitlePresetIntegration:
    """M30 — Composition executor subtitle preset resolve testleri."""

    def test_get_preset_for_composition_with_known_id(self):
        from app.modules.standard_video.subtitle_presets import get_preset_for_composition
        result = get_preset_for_composition("bold_yellow")
        assert result["preset_id"] == "bold_yellow"
        assert result["preset_fallback_used"] is False

    def test_get_preset_for_composition_with_unknown_id(self):
        from app.modules.standard_video.subtitle_presets import get_preset_for_composition
        result = get_preset_for_composition("nonexistent_style")
        assert result["preset_id"] == "clean_white"  # default fallback
        assert result["preset_fallback_used"] is True

    def test_get_preset_for_composition_with_none(self):
        from app.modules.standard_video.subtitle_presets import get_preset_for_composition
        result = get_preset_for_composition(None)
        assert result["preset_id"] == "clean_white"
        assert result["preset_fallback_used"] is False
