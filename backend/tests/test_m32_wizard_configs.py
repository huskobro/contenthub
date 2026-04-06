"""
M32 — Wizard Configuration testleri.

Wizard governance model: model, schema, service, seed.
"""

import json
import pytest
from app.wizard_configs.schemas import (
    WizardConfigCreate,
    WizardConfigUpdate,
    WizardConfigResponse,
    WizardStepConfig,
    WizardStepFieldConfig,
)
from app.wizard_configs.seed import NEWS_BULLETIN_CONFIG, STANDARD_VIDEO_CONFIG, ALL_WIZARD_CONFIGS


class TestWizardConfigSchemas:
    """M32 — Schema validation testleri."""

    def test_field_config_defaults(self):
        f = WizardStepFieldConfig(field_key="topic", label="Konu")
        assert f.field_type == "text"
        assert f.required is False
        assert f.visible is True
        assert f.admin_hideable is True
        assert f.writes_to_backend is True

    def test_field_config_with_options(self):
        f = WizardStepFieldConfig(
            field_key="render_mode",
            label="Video Modu",
            field_type="select",
            options=["combined", "per_category", "per_item"],
        )
        assert f.options == ["combined", "per_category", "per_item"]

    def test_step_config(self):
        s = WizardStepConfig(
            step_key="source",
            label="Kaynak",
            order=0,
            fields=[
                WizardStepFieldConfig(field_key="topic", label="Konu", required=True),
            ],
        )
        assert len(s.fields) == 1
        assert s.fields[0].field_key == "topic"

    def test_create_schema(self):
        c = WizardConfigCreate(
            wizard_type="test_wizard",
            display_name="Test Wizard",
            steps_config=[
                WizardStepConfig(step_key="s1", label="Step 1", order=0),
            ],
        )
        assert c.wizard_type == "test_wizard"
        assert len(c.steps_config) == 1

    def test_update_schema_partial(self):
        u = WizardConfigUpdate(display_name="Updated Name")
        dump = u.model_dump(exclude_unset=True)
        assert "display_name" in dump
        assert "enabled" not in dump

    def test_response_model_config(self):
        assert WizardConfigResponse.model_config.get("from_attributes") is True


class TestWizardConfigSeed:
    """M32 — Seed data dogruluk testleri."""

    def test_two_seed_configs(self):
        assert len(ALL_WIZARD_CONFIGS) == 2

    def test_news_bulletin_seed_type(self):
        assert NEWS_BULLETIN_CONFIG["wizard_type"] == "news_bulletin"

    def test_standard_video_seed_type(self):
        assert STANDARD_VIDEO_CONFIG["wizard_type"] == "standard_video"

    def test_news_bulletin_has_three_steps(self):
        assert len(NEWS_BULLETIN_CONFIG["steps_config"]) == 3

    def test_standard_video_has_four_steps(self):
        assert len(STANDARD_VIDEO_CONFIG["steps_config"]) == 4

    def test_news_bulletin_step_order(self):
        steps = NEWS_BULLETIN_CONFIG["steps_config"]
        keys = [s["step_key"] for s in steps]
        assert keys == ["source", "review", "style"]

    def test_standard_video_step_order(self):
        steps = STANDARD_VIDEO_CONFIG["steps_config"]
        keys = [s["step_key"] for s in steps]
        assert keys == ["basics", "style", "template", "review"]

    def test_every_field_has_writes_to_backend(self):
        """Her alan writes_to_backend bildirimini tasiyor olmali."""
        for config in ALL_WIZARD_CONFIGS:
            for step in config["steps_config"]:
                for field in step.get("fields", []):
                    assert "writes_to_backend" in field, (
                        f"{config['wizard_type']}/{step['step_key']}/{field['field_key']}: "
                        "writes_to_backend eksik"
                    )

    def test_every_field_has_affects_pipeline(self):
        """Her alan affects_pipeline bildirimini tasiyor olmali."""
        for config in ALL_WIZARD_CONFIGS:
            for step in config["steps_config"]:
                for field in step.get("fields", []):
                    assert "affects_pipeline" in field, (
                        f"{config['wizard_type']}/{step['step_key']}/{field['field_key']}: "
                        "affects_pipeline eksik"
                    )

    def test_news_bulletin_field_defaults(self):
        defaults = NEWS_BULLETIN_CONFIG["field_defaults"]
        assert defaults["language"] == "tr"
        assert defaults["render_mode"] == "combined"
        assert defaults["trust_enforcement_level"] == "warn"

    def test_news_bulletin_topic_auto_suggest(self):
        """Bulletin'de topic auto_suggest=True olmali."""
        source_step = NEWS_BULLETIN_CONFIG["steps_config"][0]
        topic_field = next(f for f in source_step["fields"] if f["field_key"] == "topic")
        assert topic_field["auto_suggest"] is True

    def test_news_bulletin_title_hidden_by_default(self):
        """Bulletin'de title visible=False olmali (metadata LLM uretecek)."""
        source_step = NEWS_BULLETIN_CONFIG["steps_config"][0]
        title_field = next(f for f in source_step["fields"] if f["field_key"] == "title")
        assert title_field["visible"] is False

    def test_render_mode_preview_enabled(self):
        """render_mode preview_enabled=True olmali."""
        style_step = NEWS_BULLETIN_CONFIG["steps_config"][2]
        rm_field = next(f for f in style_step["fields"] if f["field_key"] == "render_mode")
        assert rm_field["preview_enabled"] is True

    def test_trust_not_admin_hideable(self):
        """trust_enforcement_level admin tarafindan gizlenemez (core invariant)."""
        style_step = NEWS_BULLETIN_CONFIG["steps_config"][2]
        trust_field = next(f for f in style_step["fields"] if f["field_key"] == "trust_enforcement_level")
        assert trust_field["admin_hideable"] is False

    def test_language_not_admin_hideable(self):
        """language admin tarafindan gizlenemez (core invariant)."""
        source_step = NEWS_BULLETIN_CONFIG["steps_config"][0]
        lang_field = next(f for f in source_step["fields"] if f["field_key"] == "language")
        assert lang_field["admin_hideable"] is False


class TestWizardConfigModel:
    """M32 — DB model testleri."""

    def test_model_exists(self):
        from app.db.models import WizardConfig
        assert hasattr(WizardConfig, "wizard_type")
        assert hasattr(WizardConfig, "steps_config_json")
        assert hasattr(WizardConfig, "field_defaults_json")
        assert hasattr(WizardConfig, "enabled")
        assert hasattr(WizardConfig, "version")

    def test_model_table_name(self):
        from app.db.models import WizardConfig
        assert WizardConfig.__tablename__ == "wizard_configs"

    def test_wizard_type_unique(self):
        from app.db.models import WizardConfig
        col = WizardConfig.__table__.c.get("wizard_type")
        assert col is not None
        assert col.unique is True


class TestWizardConfigHelpers:
    """M32 — Helper fonksiyon testleri."""

    def test_config_to_response(self):
        from app.wizard_configs.helpers import config_to_response
        from app.db.models import WizardConfig
        from datetime import datetime, timezone

        row = WizardConfig(
            wizard_type="test",
            display_name="Test",
            enabled=True,
            steps_config_json=json.dumps([
                {"step_key": "s1", "label": "Step 1", "order": 0, "enabled": True, "fields": []}
            ]),
            field_defaults_json=json.dumps({"key": "val"}),
            version=1,
            status="active",
        )
        # Set timestamps manually for test
        row.created_at = datetime.now(timezone.utc)
        row.updated_at = datetime.now(timezone.utc)
        row.id = "test-id"

        resp = config_to_response(row)
        assert resp.wizard_type == "test"
        assert len(resp.steps_config) == 1
        assert resp.steps_config[0].step_key == "s1"
        assert resp.field_defaults == {"key": "val"}

    def test_config_to_response_invalid_json(self):
        from app.wizard_configs.helpers import config_to_response
        from app.db.models import WizardConfig
        from datetime import datetime, timezone

        row = WizardConfig(
            wizard_type="bad",
            display_name="Bad",
            enabled=True,
            steps_config_json="NOT JSON",
            field_defaults_json="NOT JSON",
            version=1,
            status="active",
        )
        row.created_at = datetime.now(timezone.utc)
        row.updated_at = datetime.now(timezone.utc)
        row.id = "bad-id"

        resp = config_to_response(row)
        assert resp.steps_config == []
        assert resp.field_defaults is None


class TestWizardConfigMigration:
    """M32 — Migration zinciri testleri."""

    def test_migration_revision(self):
        """Migration dosyasi dogru revision ID'ye sahip olmali."""
        import importlib.util
        import os
        migration_path = os.path.join(
            os.path.dirname(__file__), "..",
            "alembic", "versions",
            "d4e5f6a7b8c9_m32_add_wizard_configs_table.py",
        )
        spec = importlib.util.spec_from_file_location("m32_migration", migration_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        assert mod.revision == "d4e5f6a7b8c9"
        assert mod.down_revision == "c3d4e5f6a7b8"
