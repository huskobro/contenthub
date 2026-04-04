"""
M4-C3 Testleri — Preview-First Subtitle Style Selection

Test kapsamı:
  1.  GET /modules/standard-video/subtitle-presets → 200 döner.
  2.  GET /modules/standard-video/subtitle-presets → presets listesi tüm VALID_PRESET_IDS'i içerir.
  3.  GET /modules/standard-video/subtitle-presets → default_preset_id alanı mevcut.
  4.  GET /modules/standard-video/subtitle-presets → her preset is_default alanı içerir.
  5.  GET /modules/standard-video/subtitle-presets → yalnızca bir preset is_default=True.
  6.  GET /modules/standard-video/subtitle-presets → her preset timing_note içerir.
  7.  GET /modules/standard-video/subtitle-presets → preview_scope="subtitle_style_only".
  8.  GET /modules/standard-video/subtitle-presets → her preset gerekli stil alanlarını içerir.
  9.  strict helper vs boundary fallback: get_preset() bilinmeyen → ValueError.
  10. strict helper vs boundary fallback: get_preset_for_composition() bilinmeyen → varsayılan.
  11. strict helper vs boundary fallback: get_preset_for_composition() None → varsayılan.
  12. M2-C5 subtitle testleri artık ProviderRegistry ile çalışıyor (registry=None geçiş yolu kapatıldı).
  13. SubtitleStepExecutor registry=None docstring'de açık teknik borç olarak belgeleniyor.
"""

from __future__ import annotations

import inspect
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.standard_video.subtitle_presets import (
    SUBTITLE_PRESETS,
    VALID_PRESET_IDS,
    DEFAULT_PRESET_ID,
    get_preset,
    get_preset_for_composition,
)
from app.modules.standard_video.executors.subtitle import SubtitleStepExecutor
import pytest


# ---------------------------------------------------------------------------
# Test yardımcıları
# ---------------------------------------------------------------------------

def _make_test_app():
    """Test için izole FastAPI app oluşturur."""
    from app.modules.standard_video.router import router as sv_router
    app = FastAPI()
    app.include_router(sv_router, prefix="/api/v1")
    return app


# ---------------------------------------------------------------------------
# Test 1-8: /subtitle-presets endpoint
# ---------------------------------------------------------------------------

def test_subtitle_presets_endpoint_200():
    """Test 1: GET /subtitle-presets 200 döner."""
    app = _make_test_app()
    client = TestClient(app)
    response = client.get("/api/v1/modules/standard-video/subtitle-presets")
    assert response.status_code == 200


def test_subtitle_presets_endpoint_tum_preset_idler():
    """Test 2: Preset listesi tüm VALID_PRESET_IDS'i içerir."""
    app = _make_test_app()
    client = TestClient(app)
    data = client.get("/api/v1/modules/standard-video/subtitle-presets").json()
    returned_ids = {p["preset_id"] for p in data["presets"]}
    for pid in VALID_PRESET_IDS:
        assert pid in returned_ids, f"Eksik preset: {pid}"


def test_subtitle_presets_endpoint_default_preset_id():
    """Test 3: Yanıt default_preset_id alanı içeriyor."""
    app = _make_test_app()
    client = TestClient(app)
    data = client.get("/api/v1/modules/standard-video/subtitle-presets").json()
    assert "default_preset_id" in data
    assert data["default_preset_id"] == DEFAULT_PRESET_ID


def test_subtitle_presets_her_preset_is_default_alani():
    """Test 4: Her preset is_default alanı içeriyor."""
    app = _make_test_app()
    client = TestClient(app)
    data = client.get("/api/v1/modules/standard-video/subtitle-presets").json()
    for preset in data["presets"]:
        assert "is_default" in preset, f"is_default eksik: {preset['preset_id']}"


def test_subtitle_presets_tek_default():
    """Test 5: Yalnızca bir preset is_default=True."""
    app = _make_test_app()
    client = TestClient(app)
    data = client.get("/api/v1/modules/standard-video/subtitle-presets").json()
    defaults = [p for p in data["presets"] if p["is_default"] is True]
    assert len(defaults) == 1
    assert defaults[0]["preset_id"] == DEFAULT_PRESET_ID


def test_subtitle_presets_timing_note_alani():
    """Test 6: Her preset timing_note alanı içeriyor."""
    app = _make_test_app()
    client = TestClient(app)
    data = client.get("/api/v1/modules/standard-video/subtitle-presets").json()
    for preset in data["presets"]:
        assert "timing_note" in preset
        assert len(preset["timing_note"]) > 0


def test_subtitle_presets_preview_scope():
    """Test 7: preview_scope='subtitle_style_only' — M4-C3 kapsam sınırı açık."""
    app = _make_test_app()
    client = TestClient(app)
    data = client.get("/api/v1/modules/standard-video/subtitle-presets").json()
    assert data["preview_scope"] == "subtitle_style_only"


def test_subtitle_presets_stil_alanlari():
    """Test 8: Her preset gerekli stil alanlarını içeriyor."""
    required = {
        "preset_id", "label", "font_size", "font_weight",
        "text_color", "active_color", "background",
        "outline_width", "outline_color", "line_height",
    }
    app = _make_test_app()
    client = TestClient(app)
    data = client.get("/api/v1/modules/standard-video/subtitle-presets").json()
    for preset in data["presets"]:
        for field in required:
            assert field in preset, f"'{field}' eksik: {preset['preset_id']}"


# ---------------------------------------------------------------------------
# Test 9-11: Strict helper vs boundary fallback ayrımı
# ---------------------------------------------------------------------------

def test_strict_helper_bilinmeyen_id_value_error():
    """
    Test 9: get_preset() strict davranış — bilinmeyen ID → ValueError.
    Düşük seviyeli helper bilinçli hata fırlatır; sessiz varsayılan kullanmaz.
    """
    with pytest.raises(ValueError, match="Bilinmeyen altyazı stili"):
        get_preset("bilinmeyen_preset_id")


def test_boundary_fallback_bilinmeyen_id_default():
    """
    Test 10: get_preset_for_composition() boundary fallback — bilinmeyen ID → varsayılan.
    Composition sınırı: harici input geçersizse çökmemeli, varsayılan kullanmalı.
    """
    result = get_preset_for_composition("bilinmeyen_preset_id")
    assert result["preset_id"] == DEFAULT_PRESET_ID


def test_boundary_fallback_none_default():
    """
    Test 11: get_preset_for_composition(None) → varsayılan preset kullanılır.
    """
    result = get_preset_for_composition(None)
    assert result["preset_id"] == DEFAULT_PRESET_ID


# ---------------------------------------------------------------------------
# Test 12: M2-C5 testleri registry ile çalışıyor (geçiş yolu kapatıldı)
# ---------------------------------------------------------------------------

def test_subtitle_executor_registry_zorunlu_pattern():
    """
    Test 12: SubtitleStepExecutor yeni kodu registry=ProviderRegistry() kalıbı kullanmalı.
    Bu test, geçiş yolunun kapatıldığını belgeler — yeni testler SubtitleStepExecutor()
    (no-args) kullanmamalıdır.
    """
    from app.providers.registry import ProviderRegistry
    # Boş registry ile — cursor modu — hata vermemeli
    executor = SubtitleStepExecutor(registry=ProviderRegistry())
    assert executor._registry is not None


# ---------------------------------------------------------------------------
# Test 13: registry=None açık teknik borç olarak belgelenmiş
# ---------------------------------------------------------------------------

def test_subtitle_executor_registry_none_belgelenmis():
    """
    Test 13: SubtitleStepExecutor.__init__ docstring'inde 'teknik borç' ifadesi var.
    Bu, registry=None geçiş yolunun kasıtlı ve belgelenmiş olduğunu doğrular.
    """
    docstring = SubtitleStepExecutor.__init__.__doc__ or ""
    assert "teknik borç" in docstring.lower() or "teknik borç" in docstring, (
        "SubtitleStepExecutor.__init__ docstring'inde teknik borç belgesi bulunamadı."
    )
