"""
M30 — Settings registry testleri.

M30 ile eklenen yeni settings key'lerinin KNOWN_SETTINGS'te
tanimli ve dogru metadata'ya sahip oldugunu dogrular.
"""

import pytest
from app.settings.settings_resolver import KNOWN_SETTINGS, KNOWN_VALIDATION_RULES


class TestM30SettingsKeys:
    """M30 settings key tanimlari."""

    M30_KEYS = [
        "news_bulletin.config.default_subtitle_style",
        "news_bulletin.config.default_lower_third_style",
        "news_bulletin.config.trust_enforcement_level",
        "news_bulletin.config.category_style_mapping_enabled",
    ]

    def test_all_m30_keys_exist(self):
        for key in self.M30_KEYS:
            assert key in KNOWN_SETTINGS, f"M30 key eksik: {key}"

    def test_all_m30_keys_have_group(self):
        for key in self.M30_KEYS:
            assert KNOWN_SETTINGS[key].get("group") == "news_bulletin"

    def test_all_m30_keys_have_module_scope(self):
        for key in self.M30_KEYS:
            assert KNOWN_SETTINGS[key].get("module_scope") == "news_bulletin"

    def test_all_m30_keys_have_builtin_default(self):
        for key in self.M30_KEYS:
            assert "builtin_default" in KNOWN_SETTINGS[key], f"builtin_default eksik: {key}"

    def test_all_m30_keys_have_wired_to_trace(self):
        # Registry kontrati: kayitsiz ayar yok — `wired` alani artik registry
        # data'da yok, daimi True olarak explain() icinde uretiliyor. Burada
        # ayarın runtime tuketicisi belgelendi mi kontrol ediyoruz.
        for key in self.M30_KEYS:
            wired_to = KNOWN_SETTINGS[key].get("wired_to", "")
            assert wired_to, f"wired_to bos olmamali: {key}"

    def test_subtitle_style_default(self):
        assert KNOWN_SETTINGS["news_bulletin.config.default_subtitle_style"]["builtin_default"] == "clean_white"

    def test_lower_third_default(self):
        assert KNOWN_SETTINGS["news_bulletin.config.default_lower_third_style"]["builtin_default"] == "broadcast"

    def test_trust_enforcement_default(self):
        assert KNOWN_SETTINGS["news_bulletin.config.trust_enforcement_level"]["builtin_default"] == "warn"

    def test_category_mapping_default(self):
        assert KNOWN_SETTINGS["news_bulletin.config.category_style_mapping_enabled"]["builtin_default"] is True

    def test_m30_validation_rules_exist(self):
        for key in self.M30_KEYS:
            assert key in KNOWN_VALIDATION_RULES, f"Validation rule eksik: {key}"


class TestM28SettingsPreserved:
    """M28 settings anahtarlari M30 sonrasinda hala mevcut olmali."""

    # NOT: render_mode ve render_fps anahtarlari registry sadelestirmesinde
    # kaldirildi (kayitsiz/tuketilmeyen ayar). render_format runtime tarafindan
    # tuketildigi icin korundu.
    M28_KEYS = [
        "news_bulletin.prompt.narration_system",
        "news_bulletin.prompt.narration_style_rules",
        "news_bulletin.prompt.anti_clickbait_rules",
        "news_bulletin.prompt.metadata_title_rules",
        "news_bulletin.config.default_language",
        "news_bulletin.config.default_tone",
        "news_bulletin.config.default_duration_seconds",
        "news_bulletin.config.max_items_per_bulletin",
        "news_bulletin.config.narration_word_limit_per_item",
        "news_bulletin.config.render_format",
    ]

    def test_all_m28_keys_still_exist(self):
        for key in self.M28_KEYS:
            assert key in KNOWN_SETTINGS, f"M28 key kayboldu: {key}"
