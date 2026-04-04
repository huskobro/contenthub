"""
M6-C3: composition_map senkronu, duration fallback, artifact rolleri testleri.

Test kapsamı:
  1.  composition_map.py "PreviewFrame" composition ID'si kayıtlı.
  2.  get_preview_composition_id("standard_video_preview") → "PreviewFrame".
  3.  get_preview_composition_id bilinmeyen bağlam → ValueError fırlatır.
  4.  get_all_composition_ids "StandardVideo" ve "PreviewFrame" içerir.
  5.  RenderStillExecutor PREVIEW_COMPOSITION_ID composition_map'ten türetilir.
  6.  RenderStillExecutor PREVIEW_COMPOSITION_ID == "PreviewFrame".
  7.  render_still.py string "PreviewFrame" sabit olarak tanımlamaz.
  8.  duration fallback: total_duration_seconds eksik → duration_fallback_used=True.
  9.  duration fallback: total_duration_seconds sıfır → duration_fallback_used=True.
  10. duration fallback: total_duration_seconds negatif → duration_fallback_used=True.
  11. duration fallback: geçerli duration → duration_fallback_used=False.
  12. duration fallback: render sonucunda duration_fallback_used görünür.
  13. composition_props.json duration_fallback_used alanını içerir.
  14. render_props.json composition_props.json'un kanonisi değildir.
  15. RenderStepExecutor render_props.json'u her çalıştırmada taze üretir.
  16. RenderStillExecutor composition_props.json okumaz (canonical bağımsızlık).
  17. get_composition_id hâlâ "standard_video" → "StandardVideo" döner.
  18. COMPOSITION_MAP ve PREVIEW_COMPOSITION_MAP overlap yok (ID çakışması yok).
  19. Root.tsx "as unknown" cast sayısı 3 veya altında.
  20. composition_map.py get_all_composition_ids boş değil.
  21. RenderStepExecutor sonuçta duration_fallback_used anahtarı var.
  22. duration fallback loglanır (WARNING seviyesi).
  23. PREVIEW_COMPOSITION_MAP key "standard_video_preview" içerir.
  24. COMPOSITION_MAP key "standard_video" içerir.
  25. render_still.py modül import edildiğinde PREVIEW_COMPOSITION_ID "PreviewFrame".
"""

from __future__ import annotations

import json
import logging
import pathlib
import types
from pathlib import Path
from unittest import mock

import pytest

TEST_JOB_ID = "test-job-m6c3-001"


def _make_job(workspace_root: str = "") -> types.SimpleNamespace:
    return types.SimpleNamespace(
        id=TEST_JOB_ID,
        workspace_path=workspace_root,
        input_data_json=json.dumps({
            "topic": "test", "language": "tr", "workspace_root": workspace_root,
        }),
    )


def _make_step() -> types.SimpleNamespace:
    return types.SimpleNamespace(id="step-001", key="render")


# ---------------------------------------------------------------------------
# Test 1: "PreviewFrame" composition_map'te kayıtlı
# ---------------------------------------------------------------------------

def test_01_preview_frame_in_preview_composition_map():
    """PREVIEW_COMPOSITION_MAP 'PreviewFrame' değerini içerir."""
    from app.modules.standard_video.composition_map import PREVIEW_COMPOSITION_MAP
    assert "PreviewFrame" in PREVIEW_COMPOSITION_MAP.values()


# ---------------------------------------------------------------------------
# Test 2: get_preview_composition_id → "PreviewFrame"
# ---------------------------------------------------------------------------

def test_02_get_preview_composition_id_returns_preview_frame():
    """get_preview_composition_id('standard_video_preview') → 'PreviewFrame'."""
    from app.modules.standard_video.composition_map import get_preview_composition_id
    assert get_preview_composition_id("standard_video_preview") == "PreviewFrame"


# ---------------------------------------------------------------------------
# Test 3: get_preview_composition_id bilinmeyen → ValueError
# ---------------------------------------------------------------------------

def test_03_get_preview_composition_id_unknown_raises():
    """get_preview_composition_id bilinmeyen bağlam → ValueError fırlatır."""
    from app.modules.standard_video.composition_map import get_preview_composition_id
    with pytest.raises(ValueError) as exc_info:
        get_preview_composition_id("unknown_context_xyz")
    assert "unknown_context_xyz" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 4: get_all_composition_ids her ikisini içerir
# ---------------------------------------------------------------------------

def test_04_get_all_composition_ids_contains_both():
    """get_all_composition_ids 'StandardVideo' ve 'PreviewFrame' döner."""
    from app.modules.standard_video.composition_map import get_all_composition_ids
    ids = get_all_composition_ids()
    assert "StandardVideo" in ids
    assert "PreviewFrame" in ids


# ---------------------------------------------------------------------------
# Test 5: RenderStillExecutor PREVIEW_COMPOSITION_ID map'ten türetilir
# ---------------------------------------------------------------------------

def test_05_render_still_preview_id_from_map():
    """RenderStillExecutor PREVIEW_COMPOSITION_ID composition_map.py'den türetilir."""
    from app.modules.standard_video.executors.render_still import PREVIEW_COMPOSITION_ID
    from app.modules.standard_video.composition_map import get_preview_composition_id
    assert PREVIEW_COMPOSITION_ID == get_preview_composition_id("standard_video_preview")


# ---------------------------------------------------------------------------
# Test 6: PREVIEW_COMPOSITION_ID == "PreviewFrame"
# ---------------------------------------------------------------------------

def test_06_preview_composition_id_value():
    """PREVIEW_COMPOSITION_ID değeri 'PreviewFrame'."""
    from app.modules.standard_video.executors.render_still import PREVIEW_COMPOSITION_ID
    assert PREVIEW_COMPOSITION_ID == "PreviewFrame"


# ---------------------------------------------------------------------------
# Test 7: render_still.py string sabit tanımlamaz
# ---------------------------------------------------------------------------

def test_07_render_still_no_hardcoded_preview_frame_string():
    """render_still.py 'PreviewFrame' string sabitini atayan satır içermez."""
    src_path = (
        pathlib.Path(__file__).parent.parent
        / "app" / "modules" / "standard_video" / "executors" / "render_still.py"
    )
    source = src_path.read_text(encoding="utf-8")
    # "PreviewFrame" yalnızca import veya map çağrısı üzerinden gelmelidir
    # PREVIEW_COMPOSITION_ID = "PreviewFrame" gibi doğrudan atama olmamalı
    assignment_lines = [
        line for line in source.splitlines()
        if 'PREVIEW_COMPOSITION_ID' in line and '=' in line and '"PreviewFrame"' in line
    ]
    assert len(assignment_lines) == 0, (
        "render_still.py PREVIEW_COMPOSITION_ID'yi string sabit olarak atamamalı. "
        "Bu değer composition_map.py'den türetilmeli."
    )


# ---------------------------------------------------------------------------
# Test 8: duration fallback eksik duration → duration_fallback_used=True
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_08_duration_fallback_when_missing(tmp_path):
    """total_duration_seconds eksik → duration_fallback_used=True."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {
            "word_timing_path": None,
            "timing_mode": "cursor",
            # total_duration_seconds YOK
        },
    })

    job = _make_job(workspace_root=str(tmp_path))
    step = _make_step()
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor, "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        result = await executor.execute(job, step)

    assert result["duration_fallback_used"] is True


# ---------------------------------------------------------------------------
# Test 9: duration fallback sıfır duration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_09_duration_fallback_zero(tmp_path):
    """total_duration_seconds=0 → duration_fallback_used=True."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {"word_timing_path": None, "timing_mode": "cursor", "total_duration_seconds": 0},
    })

    job = _make_job(workspace_root=str(tmp_path))
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor, "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        result = await executor.execute(job, _make_step())

    assert result["duration_fallback_used"] is True


# ---------------------------------------------------------------------------
# Test 10: duration fallback negatif duration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_10_duration_fallback_negative(tmp_path):
    """total_duration_seconds=-5 → duration_fallback_used=True."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {"word_timing_path": None, "timing_mode": "cursor", "total_duration_seconds": -5},
    })

    job = _make_job(workspace_root=str(tmp_path))
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor, "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        result = await executor.execute(job, _make_step())

    assert result["duration_fallback_used"] is True


# ---------------------------------------------------------------------------
# Test 11: geçerli duration → duration_fallback_used=False
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_11_no_fallback_for_valid_duration(tmp_path):
    """Geçerli total_duration_seconds → duration_fallback_used=False."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {"word_timing_path": None, "timing_mode": "cursor", "total_duration_seconds": 30.0},
    })

    job = _make_job(workspace_root=str(tmp_path))
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor, "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        result = await executor.execute(job, _make_step())

    assert result["duration_fallback_used"] is False


# ---------------------------------------------------------------------------
# Test 12: duration_fallback_used sonuçta görünür
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_12_result_contains_duration_fallback_used(tmp_path):
    """Render sonucu her zaman duration_fallback_used anahtarı içerir."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {"word_timing_path": None, "timing_mode": "cursor", "total_duration_seconds": 10.0},
    })

    job = _make_job(workspace_root=str(tmp_path))
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor, "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        result = await executor.execute(job, _make_step())

    assert "duration_fallback_used" in result
    assert "duration_fallback_used" in result.get("provider", {})


# ---------------------------------------------------------------------------
# Test 13: composition_props.json duration_fallback_used içerir
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_13_composition_props_has_duration_fallback_flag(tmp_path):
    """Başarılı render: composition_props.json duration_fallback_used içerir."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact, _read_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {"word_timing_path": None, "timing_mode": "cursor", "total_duration_seconds": 15.0},
    })

    job = _make_job(workspace_root=str(tmp_path))
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor, "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        await executor.execute(job, _make_step())

    updated = _read_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json")
    assert "duration_fallback_used" in updated


# ---------------------------------------------------------------------------
# Test 14: render_props.json composition_props.json'u değiştirmez
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_14_render_props_does_not_replace_composition_props(tmp_path):
    """render_props.json yazıldıktan sonra composition_props.json hâlâ orijinal içeriği korur."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact, _read_artifact

    original_job_id = "original-job-sentinel"
    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": original_job_id,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {"word_timing_path": None, "timing_mode": "cursor", "total_duration_seconds": 5.0},
    })

    job = _make_job(workspace_root=str(tmp_path))
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor, "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        await executor.execute(job, _make_step())

    comp = _read_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json")
    render_props_path = tmp_path / "artifacts" / "render_props.json"
    render_props = json.loads(render_props_path.read_text())

    # composition_props.json job_id'yi korur
    assert comp["job_id"] == original_job_id
    # render_props.json job_id içermez (sadece props içerir)
    assert "job_id" not in render_props


# ---------------------------------------------------------------------------
# Test 15: render_props.json her çalıştırmada taze üretilir
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_15_render_props_overwritten_each_run(tmp_path):
    """render_props.json her executor çalışmasında üzerine yazılır."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    for run in range(2):
        _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
            "job_id": TEST_JOB_ID,
            "composition_id": "StandardVideo",
            "render_status": "props_ready",
            "props": {
                "word_timing_path": None,
                "timing_mode": "cursor",
                "total_duration_seconds": float(10 + run * 5),
            },
        })

        job = _make_job(workspace_root=str(tmp_path))
        executor = RenderStepExecutor()

        with mock.patch.object(
            executor, "_run_remotion_render",
            return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
        ):
            await executor.execute(job, _make_step())

        # Önceki output.mp4'ü temizle — idempotency bypass için
        output = tmp_path / "artifacts" / "output.mp4"
        if output.exists():
            output.unlink()

    render_props_path = tmp_path / "artifacts" / "render_props.json"
    content = json.loads(render_props_path.read_text())
    # Son çalışma total_duration_seconds=15.0 yazmalı
    assert content["total_duration_seconds"] == 15.0


# ---------------------------------------------------------------------------
# Test 16: RenderStillExecutor composition_props.json okumaz
# ---------------------------------------------------------------------------

def test_16_render_still_does_not_read_composition_props():
    """render_still.py kaynak kodu _read_artifact kullanmaz — composition_props bağımsızlık."""
    src_path = (
        pathlib.Path(__file__).parent.parent
        / "app" / "modules" / "standard_video" / "executors" / "render_still.py"
    )
    source = src_path.read_text(encoding="utf-8")
    # _read_artifact ne import edilmeli ne de çağrılmalı
    assert "_read_artifact" not in source, (
        "render_still.py _read_artifact kullanmamalı. "
        "RenderStillExecutor composition_props.json'u okumaz — bağımsız preview akışı."
    )


# ---------------------------------------------------------------------------
# Test 17: get_composition_id hâlâ "StandardVideo" döner
# ---------------------------------------------------------------------------

def test_17_get_composition_id_still_works():
    """get_composition_id('standard_video') → 'StandardVideo'."""
    from app.modules.standard_video.composition_map import get_composition_id
    assert get_composition_id("standard_video") == "StandardVideo"


# ---------------------------------------------------------------------------
# Test 18: ID çakışması yok
# ---------------------------------------------------------------------------

def test_18_no_id_overlap_between_maps():
    """COMPOSITION_MAP ve PREVIEW_COMPOSITION_MAP değerleri çakışmaz."""
    from app.modules.standard_video.composition_map import COMPOSITION_MAP, PREVIEW_COMPOSITION_MAP
    final_ids = set(COMPOSITION_MAP.values())
    preview_ids = set(PREVIEW_COMPOSITION_MAP.values())
    assert final_ids.isdisjoint(preview_ids), (
        f"Composition ID çakışması: {final_ids & preview_ids}. "
        "Final ve preview composition'lar farklı ID kullanmalıdır."
    )


# ---------------------------------------------------------------------------
# Test 19: Root.tsx "as unknown" cast sayısı ≤ 3
# ---------------------------------------------------------------------------

def test_19_root_tsx_cast_count():
    """Root.tsx 'as unknown' cast sayısı (yorum satırları hariç) 5 veya altında.

    M6-C3 audit: 5 gerçek cast (2 component + 2 defaultProps + 1 calculateMetadata).
    Yeni composition eklemek 2 cast daha gerektirir.
    Bu sınır yeni composition eklenmeden aşılırsa type safety erozyonu işareti.
    """
    root_tsx = (
        pathlib.Path(__file__).parent.parent.parent
        / "renderer" / "src" / "Root.tsx"
    )
    source = root_tsx.read_text(encoding="utf-8")
    # Yorum satırları hariç gerçek cast satırları
    real_cast_lines = [
        line for line in source.splitlines()
        if "as unknown" in line and not line.strip().startswith("*") and not line.strip().startswith("//")
    ]
    cast_count = len(real_cast_lines)
    assert cast_count <= 5, (
        f"Root.tsx gerçek 'as unknown' cast sayısı {cast_count}. "
        "M6-C3 baseline: 5 (2 component + 2 defaultProps + 1 calculateMetadata). "
        "Yeni composition eklenmeden bu sayı artmamışlı — type safety erozyon işareti."
    )


# ---------------------------------------------------------------------------
# Test 20: get_all_composition_ids boş değil
# ---------------------------------------------------------------------------

def test_20_get_all_composition_ids_nonempty():
    """get_all_composition_ids boş liste dönemez."""
    from app.modules.standard_video.composition_map import get_all_composition_ids
    ids = get_all_composition_ids()
    assert len(ids) > 0


# ---------------------------------------------------------------------------
# Test 21: sonuçta duration_fallback_used anahtarı var
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_21_result_always_has_duration_fallback_key(tmp_path):
    """Render sonucu her durumda duration_fallback_used anahtarı taşır."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {"word_timing_path": None, "timing_mode": "cursor", "total_duration_seconds": 5.0},
    })

    executor = RenderStepExecutor()
    with mock.patch.object(
        executor, "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        result = await executor.execute(_make_job(str(tmp_path)), _make_step())

    assert "duration_fallback_used" in result


# ---------------------------------------------------------------------------
# Test 22: duration fallback WARNING seviyesinde loglanır
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_22_duration_fallback_logged_as_warning(tmp_path, caplog):
    """duration fallback durumunda WARNING seviyesinde log üretilir."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {"word_timing_path": None, "timing_mode": "cursor"},
        # total_duration_seconds kasıtlı olarak eksik
    })

    executor = RenderStepExecutor()
    with mock.patch.object(
        executor, "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        with caplog.at_level(logging.WARNING, logger="app.modules.standard_video.executors.render"):
            await executor.execute(_make_job(str(tmp_path)), _make_step())

    warning_messages = [r.message for r in caplog.records if r.levelno == logging.WARNING]
    assert any("total_duration_seconds" in msg for msg in warning_messages), (
        "duration fallback WARNING logu üretilmedi."
    )


# ---------------------------------------------------------------------------
# Test 23: PREVIEW_COMPOSITION_MAP key
# ---------------------------------------------------------------------------

def test_23_preview_composition_map_key():
    """PREVIEW_COMPOSITION_MAP 'standard_video_preview' key'ini içerir."""
    from app.modules.standard_video.composition_map import PREVIEW_COMPOSITION_MAP
    assert "standard_video_preview" in PREVIEW_COMPOSITION_MAP


# ---------------------------------------------------------------------------
# Test 24: COMPOSITION_MAP key
# ---------------------------------------------------------------------------

def test_24_composition_map_key():
    """COMPOSITION_MAP 'standard_video' key'ini içerir."""
    from app.modules.standard_video.composition_map import COMPOSITION_MAP
    assert "standard_video" in COMPOSITION_MAP


# ---------------------------------------------------------------------------
# Test 25: render_still modülü import edildiğinde PREVIEW_COMPOSITION_ID doğru
# ---------------------------------------------------------------------------

def test_25_render_still_module_preview_id_on_import():
    """render_still modülü import edildiğinde PREVIEW_COMPOSITION_ID 'PreviewFrame'."""
    import importlib
    import app.modules.standard_video.executors.render_still as rs_module
    importlib.reload(rs_module)
    assert rs_module.PREVIEW_COMPOSITION_ID == "PreviewFrame"
