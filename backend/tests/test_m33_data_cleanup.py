"""
M33 — Data Classification & Cleanup testleri.

is_test_data flag dogrulugunun ve filtreleme davranisinin testleri.
"""

import pytest
from app.db.models import (
    Job,
    StandardVideo,
    Template,
    StyleBlueprint,
    NewsSource,
    NewsItem,
    NewsBulletin,
    PublishRecord,
)


class TestIsTestDataColumnExists:
    """M33 — is_test_data column tum hedef tablolarda mevcut olmali."""

    @pytest.mark.parametrize("model_cls", [
        Job,
        StandardVideo,
        Template,
        StyleBlueprint,
        NewsSource,
        NewsItem,
        NewsBulletin,
        PublishRecord,
    ])
    def test_has_is_test_data(self, model_cls):
        assert hasattr(model_cls, "is_test_data"), (
            f"{model_cls.__name__} modelinde is_test_data alani eksik"
        )

    @pytest.mark.parametrize("model_cls", [
        Job,
        StandardVideo,
        Template,
        StyleBlueprint,
        NewsSource,
        NewsItem,
        NewsBulletin,
        PublishRecord,
    ])
    def test_is_test_data_indexed(self, model_cls):
        col = model_cls.__table__.c.get("is_test_data")
        assert col is not None
        assert col.index is True, (
            f"{model_cls.__name__}.is_test_data index olmali"
        )

    @pytest.mark.parametrize("model_cls", [
        Job,
        StandardVideo,
        Template,
        StyleBlueprint,
        NewsSource,
        NewsItem,
        NewsBulletin,
        PublishRecord,
    ])
    def test_is_test_data_not_nullable(self, model_cls):
        col = model_cls.__table__.c.get("is_test_data")
        assert col is not None
        assert col.nullable is False


class TestM33Migration:
    """M33 — Migration zinciri testleri."""

    def test_migration_revision(self):
        import importlib.util
        import os
        migration_path = os.path.join(
            os.path.dirname(__file__), "..",
            "alembic", "versions",
            "e5f6a7b8c9d0_m33_add_is_test_data_columns.py",
        )
        spec = importlib.util.spec_from_file_location("m33_migration", migration_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        assert mod.revision == "e5f6a7b8c9d0"
        assert mod.down_revision == "d4e5f6a7b8c9"

    def test_migration_tables_list(self):
        import importlib.util
        import os
        migration_path = os.path.join(
            os.path.dirname(__file__), "..",
            "alembic", "versions",
            "e5f6a7b8c9d0_m33_add_is_test_data_columns.py",
        )
        spec = importlib.util.spec_from_file_location("m33_migration", migration_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        expected = {
            "standard_videos", "templates", "style_blueprints",
            "news_sources", "news_items", "news_bulletins", "publish_records",
        }
        assert set(mod.TABLES) == expected
