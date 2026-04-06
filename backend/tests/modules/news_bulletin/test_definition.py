"""
M28 — News Bulletin module definition testleri.

Module definition'ın doğru step sayısı, sırası, executor class atamaları
ve input_schema'yı kontrol eder.
"""

import pytest
from app.modules.news_bulletin.definition import NEWS_BULLETIN_MODULE
from app.modules.news_bulletin.executors import (
    BulletinScriptExecutor,
    BulletinMetadataExecutor,
    BulletinCompositionExecutor,
)
from app.modules.standard_video.executors import (
    TTSStepExecutor,
    SubtitleStepExecutor,
    RenderStepExecutor,
)
from app.publish.executor import PublishStepExecutor


class TestNewsBulletinModuleDefinition:
    """NEWS_BULLETIN_MODULE yapı testleri."""

    def test_module_id(self):
        assert NEWS_BULLETIN_MODULE.module_id == "news_bulletin"

    def test_display_name(self):
        assert NEWS_BULLETIN_MODULE.display_name == "Haber Bülteni"

    def test_step_count(self):
        """Pipeline 7 adımdan oluşmalı."""
        assert len(NEWS_BULLETIN_MODULE.steps) == 7

    def test_step_order(self):
        """Adım sırası 1'den 7'ye kadar olmalı."""
        orders = [s.step_order for s in NEWS_BULLETIN_MODULE.steps]
        assert orders == [1, 2, 3, 4, 5, 6, 7]

    def test_step_keys(self):
        """Adım key'leri doğru sırayla tanımlı olmalı."""
        keys = [s.step_key for s in NEWS_BULLETIN_MODULE.steps]
        assert keys == ["script", "metadata", "tts", "subtitle", "composition", "render", "publish"]

    def test_executor_classes(self):
        """Her adım doğru executor class'ına bağlı olmalı."""
        executor_map = {s.step_key: s.executor_class for s in NEWS_BULLETIN_MODULE.steps}
        assert executor_map["script"] is BulletinScriptExecutor
        assert executor_map["metadata"] is BulletinMetadataExecutor
        assert executor_map["tts"] is TTSStepExecutor
        assert executor_map["subtitle"] is SubtitleStepExecutor
        assert executor_map["composition"] is BulletinCompositionExecutor
        assert executor_map["render"] is RenderStepExecutor
        assert executor_map["publish"] is PublishStepExecutor

    def test_idempotency_types(self):
        """Her adımın idempotency tipi doğru olmalı."""
        idempotency_map = {s.step_key: s.idempotency_type for s in NEWS_BULLETIN_MODULE.steps}
        assert idempotency_map["script"] == "re_executable"
        assert idempotency_map["metadata"] == "re_executable"
        assert idempotency_map["tts"] == "artifact_check"
        assert idempotency_map["subtitle"] == "re_executable"
        assert idempotency_map["composition"] == "artifact_check"
        assert idempotency_map["render"] == "artifact_check"
        assert idempotency_map["publish"] == "operator_confirm"

    def test_input_schema_requires_bulletin_id(self):
        """input_schema bulletin_id zorunlu alanını tanımlamalı."""
        schema = NEWS_BULLETIN_MODULE.input_schema
        assert "bulletin_id" in schema.get("required", [])

    def test_input_schema_properties(self):
        """input_schema beklenen property'leri tanımlamalı."""
        props = NEWS_BULLETIN_MODULE.input_schema.get("properties", {})
        assert "bulletin_id" in props
        assert "language" in props
        assert "tone" in props
        assert "target_duration_seconds" in props
        assert "topic" in props

    def test_template_compat(self):
        assert NEWS_BULLETIN_MODULE.template_compat == ["news_bulletin_v1"]

    def test_gate_defaults(self):
        assert NEWS_BULLETIN_MODULE.gate_defaults == {
            "script_review": False,
            "metadata_review": False,
        }
