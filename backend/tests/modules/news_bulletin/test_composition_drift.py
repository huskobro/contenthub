"""
M28 — Composition drift testi.

composition_map.py COMPOSITION_MAP ile renderer/src/Root.tsx
Composition id'leri arasındaki senkronu doğrular.

Her iki dosya arasındaki tutarsızlık bir drift hatasıdır.
"""

import re
from pathlib import Path

import pytest

from app.modules.standard_video.composition_map import (
    COMPOSITION_MAP,
    PREVIEW_COMPOSITION_MAP,
    get_all_composition_ids,
)


# Root.tsx yolu — backend/ dizinine göre
_ROOT_TSX_PATH = Path(__file__).resolve().parents[4] / "renderer" / "src" / "Root.tsx"


class TestCompositionDrift:
    """composition_map.py ↔ Root.tsx senkron testleri."""

    def test_root_tsx_exists(self):
        """Root.tsx dosyasının varlığı kontrol edilir."""
        assert _ROOT_TSX_PATH.exists(), f"Root.tsx bulunamadı: {_ROOT_TSX_PATH}"

    def test_all_composition_ids_registered_in_root(self):
        """COMPOSITION_MAP ve PREVIEW_COMPOSITION_MAP'teki her ID Root.tsx'te kayıtlı olmalı."""
        root_content = _ROOT_TSX_PATH.read_text(encoding="utf-8")

        all_ids = get_all_composition_ids()
        for comp_id in all_ids:
            # Root.tsx'te id="CompId" formatında kayıt aranır
            pattern = rf'id="{re.escape(comp_id)}"'
            assert re.search(pattern, root_content), (
                f"Composition ID '{comp_id}' Root.tsx'te bulunamadı. "
                f"composition_map.py ile Root.tsx arasında drift var."
            )

    def test_news_bulletin_in_composition_map(self):
        """news_bulletin → NewsBulletin eşlemesi COMPOSITION_MAP'te olmalı."""
        assert "news_bulletin" in COMPOSITION_MAP
        assert COMPOSITION_MAP["news_bulletin"] == "NewsBulletin"

    def test_news_bulletin_in_root_tsx(self):
        """NewsBulletin composition Root.tsx'te kayıtlı olmalı."""
        root_content = _ROOT_TSX_PATH.read_text(encoding="utf-8")
        assert 'id="NewsBulletin"' in root_content

    def test_standard_video_still_registered(self):
        """StandardVideo composition mevcut ve bozulmamış olmalı."""
        assert "standard_video" in COMPOSITION_MAP
        assert COMPOSITION_MAP["standard_video"] == "StandardVideo"

        root_content = _ROOT_TSX_PATH.read_text(encoding="utf-8")
        assert 'id="StandardVideo"' in root_content

    def test_preview_frame_still_registered(self):
        """PreviewFrame composition mevcut ve bozulmamış olmalı."""
        assert "standard_video_preview" in PREVIEW_COMPOSITION_MAP
        assert PREVIEW_COMPOSITION_MAP["standard_video_preview"] == "PreviewFrame"

        root_content = _ROOT_TSX_PATH.read_text(encoding="utf-8")
        assert 'id="PreviewFrame"' in root_content
