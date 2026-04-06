"""
M29 — Direction wiring testleri.

composition_direction ve thumbnail_direction alanlarinin
DB modeli, schema ve service'te dogru calistigini dogrular.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.modules.news_bulletin.schemas import (
    NewsBulletinCreate,
    NewsBulletinUpdate,
    NewsBulletinResponse,
)


class TestDirectionFieldsInSchema:
    """Schema'da direction alanlarinin varligi ve validasyonu."""

    def test_create_schema_has_direction_fields(self):
        payload = NewsBulletinCreate(
            topic="test",
            composition_direction="classic",
            thumbnail_direction="text_heavy",
            template_id="tmpl-001",
            style_blueprint_id="bp-001",
        )
        assert payload.composition_direction == "classic"
        assert payload.thumbnail_direction == "text_heavy"
        assert payload.template_id == "tmpl-001"
        assert payload.style_blueprint_id == "bp-001"

    def test_create_schema_direction_defaults_none(self):
        payload = NewsBulletinCreate(topic="test")
        assert payload.composition_direction is None
        assert payload.thumbnail_direction is None
        assert payload.template_id is None
        assert payload.style_blueprint_id is None

    def test_update_schema_has_direction_fields(self):
        payload = NewsBulletinUpdate(
            composition_direction="dynamic",
            thumbnail_direction="minimal",
        )
        assert payload.composition_direction == "dynamic"
        assert payload.thumbnail_direction == "minimal"

    def test_response_schema_has_direction_fields(self):
        resp = NewsBulletinResponse(
            id="test-id",
            title=None,
            topic="test",
            brief=None,
            target_duration_seconds=None,
            language=None,
            tone=None,
            bulletin_style=None,
            source_mode=None,
            selected_news_ids_json=None,
            status="draft",
            job_id=None,
            composition_direction="side_by_side",
            thumbnail_direction="split",
            template_id="tmpl-002",
            style_blueprint_id="bp-002",
            created_at="2026-04-06T00:00:00Z",
            updated_at="2026-04-06T00:00:00Z",
        )
        assert resp.composition_direction == "side_by_side"
        assert resp.thumbnail_direction == "split"
        assert resp.template_id == "tmpl-002"
        assert resp.style_blueprint_id == "bp-002"


class TestDirectionFieldsInModel:
    """DB model'de direction alanlarinin varligi."""

    def test_model_has_composition_direction(self):
        from app.db.models import NewsBulletin
        assert hasattr(NewsBulletin, "composition_direction")

    def test_model_has_thumbnail_direction(self):
        from app.db.models import NewsBulletin
        assert hasattr(NewsBulletin, "thumbnail_direction")

    def test_model_has_template_id(self):
        from app.db.models import NewsBulletin
        assert hasattr(NewsBulletin, "template_id")

    def test_model_has_style_blueprint_id(self):
        from app.db.models import NewsBulletin
        assert hasattr(NewsBulletin, "style_blueprint_id")


class TestDirectionInStartProduction:
    """start_production snapshot'ina direction alanlarinin eklendigini dogrular."""

    def test_start_production_input_includes_directions(self):
        """start_production input_data'ya composition_direction ve thumbnail_direction eklemeli."""
        # Bu test sadece service kodunun direction alanlarini snapshot'a
        # ekleme mantigi icerdigini kontrol eder (code inspection).
        import inspect
        from app.modules.news_bulletin.service import start_production
        source = inspect.getsource(start_production)
        assert "composition_direction" in source
        assert "thumbnail_direction" in source
        assert "template_id" in source
        assert "style_blueprint_id" in source
