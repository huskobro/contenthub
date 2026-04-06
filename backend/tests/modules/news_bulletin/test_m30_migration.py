"""
M30 — Migration varligi testi.

b2c3d4e5f6a7 migration'inin dogru alanlari iceldigini dogrular.
"""

import pytest
from pathlib import Path


MIGRATION_FILE = (
    Path(__file__).resolve().parents[3]
    / "alembic"
    / "versions"
    / "b2c3d4e5f6a7_m30_add_render_mode_subtitle_trust.py"
)


class TestM30Migration:
    """M30 migration dosyasi kontrol testleri."""

    def test_migration_file_exists(self):
        assert MIGRATION_FILE.exists(), f"Migration dosyasi bulunamadi: {MIGRATION_FILE}"

    def test_migration_adds_render_mode(self):
        content = MIGRATION_FILE.read_text()
        assert "render_mode" in content

    def test_migration_adds_subtitle_style(self):
        content = MIGRATION_FILE.read_text()
        assert "subtitle_style" in content

    def test_migration_adds_lower_third_style(self):
        content = MIGRATION_FILE.read_text()
        assert "lower_third_style" in content

    def test_migration_adds_trust_enforcement_level(self):
        content = MIGRATION_FILE.read_text()
        assert "trust_enforcement_level" in content

    def test_migration_has_downgrade(self):
        content = MIGRATION_FILE.read_text()
        assert "def downgrade" in content

    def test_down_revision_is_m29(self):
        """M30 migration'in down_revision'i M29 migration olmali."""
        content = MIGRATION_FILE.read_text()
        assert "a1b2c3d4e5f6" in content

    def test_render_mode_default_combined(self):
        content = MIGRATION_FILE.read_text()
        assert 'server_default="combined"' in content

    def test_trust_enforcement_default_warn(self):
        content = MIGRATION_FILE.read_text()
        assert 'server_default="warn"' in content
