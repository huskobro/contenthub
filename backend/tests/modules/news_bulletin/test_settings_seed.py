"""
M28 — News Bulletin settings seed testleri.

Prompt + config key'lerin KNOWN_SETTINGS'e doğru seed edilmesini doğrular.
"""

import pytest

from app.settings.settings_resolver import KNOWN_SETTINGS, KNOWN_VALIDATION_RULES


class TestBulletinSettingsSeed:
    """News Bulletin settings'in KNOWN_SETTINGS'te tanımlı olması."""

    EXPECTED_PROMPT_KEYS = [
        "news_bulletin.prompt.narration_system",
        "news_bulletin.prompt.narration_style_rules",
        "news_bulletin.prompt.anti_clickbait_rules",
        "news_bulletin.prompt.metadata_title_rules",
    ]

    # NOT: render_mode ve render_fps registry sadelestirmesinde dusuruldu
    # (kayitsiz/tuketilmeyen ayar). render_format runtime tarafindan tuketildigi
    # icin korundu.
    EXPECTED_CONFIG_KEYS = [
        "news_bulletin.config.default_language",
        "news_bulletin.config.default_tone",
        "news_bulletin.config.default_duration_seconds",
        "news_bulletin.config.max_items_per_bulletin",
        "news_bulletin.config.narration_word_limit_per_item",
        "news_bulletin.config.render_format",
    ]

    def test_prompt_keys_exist(self):
        for key in self.EXPECTED_PROMPT_KEYS:
            assert key in KNOWN_SETTINGS, f"Prompt key eksik: {key}"

    def test_config_keys_exist(self):
        for key in self.EXPECTED_CONFIG_KEYS:
            assert key in KNOWN_SETTINGS, f"Config key eksik: {key}"

    def test_prompt_keys_have_type_prompt(self):
        """Prompt key'ler type='prompt' olmalı."""
        for key in self.EXPECTED_PROMPT_KEYS:
            meta = KNOWN_SETTINGS[key]
            assert meta["type"] == "prompt", f"{key} type={meta['type']}, 'prompt' bekleniyor"

    def test_prompt_keys_have_builtin_default(self):
        """Her prompt key zengin builtin_default içermeli."""
        for key in self.EXPECTED_PROMPT_KEYS:
            meta = KNOWN_SETTINGS[key]
            default = meta.get("builtin_default", "")
            assert default and len(default) > 10, (
                f"{key} builtin_default boş veya çok kısa: '{default[:50]}...'"
            )

    def test_prompt_keys_have_module_scope(self):
        """Prompt key'ler module_scope='news_bulletin' olmalı."""
        for key in self.EXPECTED_PROMPT_KEYS:
            meta = KNOWN_SETTINGS[key]
            assert meta["module_scope"] == "news_bulletin", (
                f"{key} module_scope={meta['module_scope']}"
            )

    def test_config_keys_have_module_scope(self):
        """Config key'ler module_scope='news_bulletin' olmalı."""
        for key in self.EXPECTED_CONFIG_KEYS:
            meta = KNOWN_SETTINGS[key]
            assert meta["module_scope"] == "news_bulletin", (
                f"{key} module_scope={meta['module_scope']}"
            )

    def test_all_keys_have_wired_to_trace(self):
        """Registry kontrati: kayitsiz ayar yok — her ayar bir runtime
        tuketicisine baglidir (wired_to alani dolu olmali)."""
        for key in self.EXPECTED_PROMPT_KEYS + self.EXPECTED_CONFIG_KEYS:
            meta = KNOWN_SETTINGS[key]
            wired_to = meta.get("wired_to", "")
            assert wired_to, f"{key} 'wired_to' bos (runtime tuketicisi belgelenmeli)"

    def test_config_defaults_reasonable(self):
        """Config varsayılan değerleri makul olmalı."""
        assert KNOWN_SETTINGS["news_bulletin.config.default_language"]["builtin_default"] == "tr"
        assert KNOWN_SETTINGS["news_bulletin.config.default_tone"]["builtin_default"] == "formal"
        assert KNOWN_SETTINGS["news_bulletin.config.default_duration_seconds"]["builtin_default"] == 120
        assert KNOWN_SETTINGS["news_bulletin.config.max_items_per_bulletin"]["builtin_default"] == 10
        assert KNOWN_SETTINGS["news_bulletin.config.narration_word_limit_per_item"]["builtin_default"] == 80

    def test_prompt_validation_rules_exist(self):
        """Prompt key'ler için validation rules tanımlı olmalı."""
        for key in self.EXPECTED_PROMPT_KEYS:
            assert key in KNOWN_VALIDATION_RULES, (
                f"Validation rule eksik: {key}"
            )

    def test_group_is_news_bulletin(self):
        """Tüm bulletin key'ler 'news_bulletin' grubunda olmalı."""
        for key in self.EXPECTED_PROMPT_KEYS + self.EXPECTED_CONFIG_KEYS:
            meta = KNOWN_SETTINGS[key]
            assert meta["group"] == "news_bulletin", f"{key} group={meta['group']}"
