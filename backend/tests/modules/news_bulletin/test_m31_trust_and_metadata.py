"""
M31 — Trust enforcement akis + metadata polish testleri.

Trust enforcement:
  - none/warn/block semantigi
  - start_production trust check entegrasyonu (schema/service seviyesi)

Metadata polish:
  - build_bulletin_metadata_prompt dominant_category parametresi
  - build_bulletin_metadata_prompt tone parametresi
"""

import pytest
from app.modules.prompt_builder import build_bulletin_metadata_prompt
from app.modules.language import SupportedLanguage


class TestMetadataPromptPolish:
    """M31 — Metadata prompt SEO polish testleri."""

    RULES = "Baslik max 60 karakter, clickbait degil."

    def test_dominant_category_in_user_content(self):
        messages = build_bulletin_metadata_prompt(
            script_data={"items": [{"headline": "Test", "narration": "Narr"}]},
            language=SupportedLanguage.TR,
            metadata_title_rules=self.RULES,
            dominant_category="tech",
        )
        user_msg = messages[1]["content"]
        assert "tech" in user_msg

    def test_no_dominant_category_no_category_text(self):
        messages = build_bulletin_metadata_prompt(
            script_data={"items": [{"headline": "Test", "narration": "Narr"}]},
            language=SupportedLanguage.TR,
            metadata_title_rules=self.RULES,
            dominant_category=None,
        )
        user_msg = messages[1]["content"]
        assert "Baskın haber kategorisi" not in user_msg

    def test_tone_in_system_content(self):
        messages = build_bulletin_metadata_prompt(
            script_data={"items": []},
            language=SupportedLanguage.TR,
            metadata_title_rules=self.RULES,
            tone="casual",
        )
        system_msg = messages[0]["content"]
        assert "casual" in system_msg

    def test_headlines_listed_in_user_content(self):
        messages = build_bulletin_metadata_prompt(
            script_data={
                "items": [
                    {"headline": "Borsa Yükseliyor", "narration": "..."},
                    {"headline": "Seçim Sonuçları", "narration": "..."},
                ]
            },
            language=SupportedLanguage.TR,
            metadata_title_rules=self.RULES,
        )
        user_msg = messages[1]["content"]
        assert "Borsa Yükseliyor" in user_msg
        assert "Seçim Sonuçları" in user_msg

    def test_returns_two_messages(self):
        messages = build_bulletin_metadata_prompt(
            script_data={"items": []},
            language=SupportedLanguage.TR,
            metadata_title_rules=self.RULES,
        )
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"

    def test_admin_rules_in_system(self):
        custom_rules = "OZEL KURAL: Hashtag kullanma."
        messages = build_bulletin_metadata_prompt(
            script_data={"items": []},
            language=SupportedLanguage.TR,
            metadata_title_rules=custom_rules,
        )
        assert "OZEL KURAL" in messages[0]["content"]

    def test_json_format_guard_present(self):
        """Teknik guard admin prompt'undan bagimsiz her zaman mevcut olmali."""
        messages = build_bulletin_metadata_prompt(
            script_data={"items": []},
            language=SupportedLanguage.TR,
            metadata_title_rules="",
        )
        system_msg = messages[0]["content"]
        assert "JSON" in system_msg

    def test_english_language(self):
        messages = build_bulletin_metadata_prompt(
            script_data={"items": [{"headline": "Test News", "narration": "Narr"}]},
            language=SupportedLanguage.EN,
            metadata_title_rules=self.RULES,
        )
        user_msg = messages[1]["content"]
        assert "en" in user_msg  # language.value = "en"


class TestTrustEnforcementSchema:
    """M31 — Trust enforcement schema/model seviyesi testleri."""

    def test_bulletin_create_has_trust_field(self):
        from app.modules.news_bulletin.schemas import NewsBulletinCreate
        schema = NewsBulletinCreate(topic="test")
        assert hasattr(schema, "trust_enforcement_level")
        assert schema.trust_enforcement_level == "warn"  # varsayilan

    def test_bulletin_update_has_trust_field(self):
        from app.modules.news_bulletin.schemas import NewsBulletinUpdate
        schema = NewsBulletinUpdate(trust_enforcement_level="block")
        assert schema.trust_enforcement_level == "block"

    def test_bulletin_response_has_trust_field(self):
        from app.modules.news_bulletin.schemas import NewsBulletinResponse
        import inspect
        fields = NewsBulletinResponse.model_fields
        assert "trust_enforcement_level" in fields

    def test_trust_service_function_exists(self):
        from app.modules.news_bulletin.service import check_trust_enforcement
        import asyncio
        assert asyncio.iscoroutinefunction(check_trust_enforcement)


class TestTrustEnforcementModel:
    """M31 — Trust enforcement DB model testleri."""

    def test_model_has_trust_field(self):
        from app.db.models import NewsBulletin
        assert hasattr(NewsBulletin, "trust_enforcement_level")

    def test_model_trust_default_warn(self):
        b = NewsBulletin = __import__("app.db.models", fromlist=["NewsBulletin"]).NewsBulletin
        col = b.__table__.c.get("trust_enforcement_level")
        assert col is not None
        # default veya server_default olarak "warn" olmali
        default_val = str(col.default.arg) if col.default else None
        server_default = str(col.server_default.arg) if col.server_default else None
        assert "warn" in (default_val or "") or "warn" in (server_default or "")
