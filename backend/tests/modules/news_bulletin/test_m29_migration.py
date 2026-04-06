"""
M29 — Migration varligi testi.

a1b2c3d4e5f6 migration'inin dogru alanlari iceldigini dogrular.
"""

import pytest
from pathlib import Path


MIGRATION_FILE = (
    Path(__file__).resolve().parents[3]
    / "alembic"
    / "versions"
    / "a1b2c3d4e5f6_m29_add_direction_fields_to_bulletin.py"
)


class TestM29Migration:
    """M29 migration dosyasi kontrol testleri."""

    def test_migration_file_exists(self):
        assert MIGRATION_FILE.exists(), f"Migration dosyasi bulunamadi: {MIGRATION_FILE}"

    def test_migration_adds_composition_direction(self):
        content = MIGRATION_FILE.read_text()
        assert "composition_direction" in content

    def test_migration_adds_thumbnail_direction(self):
        content = MIGRATION_FILE.read_text()
        assert "thumbnail_direction" in content

    def test_migration_adds_template_id(self):
        content = MIGRATION_FILE.read_text()
        assert "template_id" in content

    def test_migration_adds_style_blueprint_id(self):
        content = MIGRATION_FILE.read_text()
        assert "style_blueprint_id" in content

    def test_migration_has_downgrade(self):
        content = MIGRATION_FILE.read_text()
        assert "def downgrade" in content

    def test_down_revision_is_m28(self):
        """M29 migration'in down_revision'i M28 migration olmali."""
        content = MIGRATION_FILE.read_text()
        assert '5c6754cd1d40' in content
