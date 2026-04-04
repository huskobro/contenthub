"""
M6-C2: word_timing yükleme, dynamic duration, preview/final ayrımı testleri.

Test kapsamı:
  1.  _load_word_timings None path → boş liste döner.
  2.  _load_word_timings var olmayan path → boş liste döner (cursor mod).
  3.  _load_word_timings geçerli dosya → WordTiming listesi döner.
  4.  _load_word_timings bozuk JSON → boş liste döner (graceful).
  5.  _build_render_props word_timing_path'ı kaldırır, wordTimings ekler.
  6.  _build_render_props word_timing_path None → wordTimings boş liste.
  7.  _build_render_props composition_props.json diğer alanları korur.
  8.  RenderStepExecutor render_props.json'u artifacts/ altına yazar.
  9.  RenderStepExecutor sonuç timing_mode ve word_timings_count içerir.
  10. RenderStepExecutor composition_props.json'a timing_mode_used + word_timings_count yazar.
  11. RenderStillExecutor step_key "render_still" döner.
  12. RenderStillExecutor preview_frame.jpg mevcut → idempotent döner.
  13. RenderStillExecutor subprocess başarılı → preview_path döner.
  14. RenderStillExecutor subprocess başarısız → StepExecutionError fırlatır.
  15. RenderStillExecutor StepExecutor'dan miras alır.
  16. RenderStillExecutor executors paketinden import edilebilir.
  17. PREVIEW_COMPOSITION_ID "PreviewFrame".
  18. preview yolu composition_props.json güncellemez.
  19. _run_remotion_still renderer_dir yoksa hata döner.
  20. render_still.py UsedNewsRegistry import etmez.
  21. RenderStepExecutor whisper timing_mode — wordTimings > 0 render sonucunda görünür.
  22. RenderStepExecutor cursor timing_mode — wordTimings = 0 render sonucunda görünür.
  23. _load_word_timings: word_timing.json "words" alanını döner.
  24. render_props.json word_timing_path içermez — sözleşme temizliği.
  25. RENDER_STILL_TIMEOUT_SECONDS pozitif integer.
"""

from __future__ import annotations

import json
import types
from pathlib import Path
from unittest import mock

import pytest

TEST_JOB_ID = "test-job-m6c2-001"

# ---------------------------------------------------------------------------
# Yardımcılar
# ---------------------------------------------------------------------------

def _make_job(workspace_root: str = "") -> types.SimpleNamespace:
    return types.SimpleNamespace(
        id=TEST_JOB_ID,
        workspace_path=workspace_root,
        input_data_json=json.dumps({
            "topic": "test",
            "language": "tr",
            "workspace_root": workspace_root,
        }),
    )


def _make_step() -> types.SimpleNamespace:
    return types.SimpleNamespace(id="step-001", key="render")


def _sample_word_timings() -> list[dict]:
    return [
        {"scene": 1, "word": "Merhaba", "start": 0.0, "end": 0.5, "probability": 0.99},
        {"scene": 1, "word": "dünya", "start": 0.5, "end": 1.0, "probability": 0.98},
    ]


# ---------------------------------------------------------------------------
# Test 1: _load_word_timings None path
# ---------------------------------------------------------------------------

def test_01_load_word_timings_none_path():
    """_load_word_timings None → boş liste."""
    from app.modules.standard_video.executors.render import _load_word_timings
    result = _load_word_timings(None)
    assert result == []


# ---------------------------------------------------------------------------
# Test 2: _load_word_timings var olmayan path
# ---------------------------------------------------------------------------

def test_02_load_word_timings_missing_file():
    """_load_word_timings dosya yoksa boş liste — cursor mod devrede."""
    from app.modules.standard_video.executors.render import _load_word_timings
    result = _load_word_timings("/tmp/nonexistent_word_timing_abc.json")
    assert result == []


# ---------------------------------------------------------------------------
# Test 3: _load_word_timings geçerli dosya
# ---------------------------------------------------------------------------

def test_03_load_word_timings_valid_file(tmp_path):
    """_load_word_timings geçerli word_timing.json → WordTiming listesi döner."""
    from app.modules.standard_video.executors.render import _load_word_timings

    words = _sample_word_timings()
    timing_file = tmp_path / "word_timing.json"
    timing_file.write_text(
        json.dumps({"version": "1", "timing_mode": "whisper_word", "language": "tr", "words": words, "word_count": 2}),
        encoding="utf-8",
    )

    result = _load_word_timings(str(timing_file))
    assert len(result) == 2
    assert result[0]["word"] == "Merhaba"
    assert result[1]["word"] == "dünya"


# ---------------------------------------------------------------------------
# Test 4: _load_word_timings bozuk JSON
# ---------------------------------------------------------------------------

def test_04_load_word_timings_corrupt_json(tmp_path):
    """_load_word_timings bozuk JSON → boş liste (graceful)."""
    from app.modules.standard_video.executors.render import _load_word_timings

    corrupt_file = tmp_path / "word_timing_bad.json"
    corrupt_file.write_text("{invalid json}", encoding="utf-8")

    result = _load_word_timings(str(corrupt_file))
    assert result == []


# ---------------------------------------------------------------------------
# Test 5: _build_render_props word_timing_path kaldırır, wordTimings ekler
# ---------------------------------------------------------------------------

def test_05_build_render_props_transforms_path(tmp_path):
    """_build_render_props: word_timing_path kaldırılır, wordTimings inline eklenir."""
    from app.modules.standard_video.executors.render import _build_render_props

    words = _sample_word_timings()
    timing_file = tmp_path / "word_timing.json"
    timing_file.write_text(
        json.dumps({"version": "1", "timing_mode": "whisper_word", "language": "tr", "words": words, "word_count": 2}),
        encoding="utf-8",
    )

    composition_props = {
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {
            "title": "Test",
            "word_timing_path": str(timing_file),
            "timing_mode": "whisper_word",
            "total_duration_seconds": 5.0,
        },
    }

    result = _build_render_props(composition_props)

    # word_timing_path kaldırılmış olmalı
    assert "word_timing_path" not in result
    # wordTimings eklenmiş olmalı
    assert "wordTimings" in result
    assert len(result["wordTimings"]) == 2


# ---------------------------------------------------------------------------
# Test 6: _build_render_props word_timing_path None
# ---------------------------------------------------------------------------

def test_06_build_render_props_null_path():
    """_build_render_props: word_timing_path None → wordTimings boş liste."""
    from app.modules.standard_video.executors.render import _build_render_props

    composition_props = {
        "props": {
            "title": "Test",
            "word_timing_path": None,
            "timing_mode": "cursor",
        }
    }

    result = _build_render_props(composition_props)
    assert result["wordTimings"] == []
    assert "word_timing_path" not in result


# ---------------------------------------------------------------------------
# Test 7: _build_render_props diğer alanları korur
# ---------------------------------------------------------------------------

def test_07_build_render_props_preserves_fields():
    """_build_render_props: diğer props alanları değişmez."""
    from app.modules.standard_video.executors.render import _build_render_props

    composition_props = {
        "props": {
            "title": "Test Başlık",
            "timing_mode": "cursor",
            "total_duration_seconds": 30.0,
            "word_timing_path": None,
            "language": "tr",
        }
    }

    result = _build_render_props(composition_props)
    assert result["title"] == "Test Başlık"
    assert result["timing_mode"] == "cursor"
    assert result["total_duration_seconds"] == 30.0
    assert result["language"] == "tr"


# ---------------------------------------------------------------------------
# Test 8: RenderStepExecutor render_props.json'u artifacts/ altına yazar
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_08_render_props_json_written(tmp_path):
    """RenderStepExecutor render_props.json'u artifacts/ dizinine yazar."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {
            "title": "Test",
            "word_timing_path": None,
            "timing_mode": "cursor",
            "total_duration_seconds": 10.0,
        },
    })

    job = _make_job(workspace_root=str(tmp_path))
    step = _make_step()
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor,
        "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        await executor.execute(job, step)

    # render_props.json yazılmış olmalı
    render_props_path = tmp_path / "artifacts" / "render_props.json"
    assert render_props_path.exists()
    content = json.loads(render_props_path.read_text(encoding="utf-8"))
    # word_timing_path olmamalı
    assert "word_timing_path" not in content
    # wordTimings olmalı
    assert "wordTimings" in content


# ---------------------------------------------------------------------------
# Test 9: RenderStepExecutor sonuç timing_mode + word_timings_count içerir
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_09_result_includes_timing_info(tmp_path):
    """Başarılı render sonucu timing_mode ve word_timings_count içerir."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {
            "word_timing_path": None,
            "timing_mode": "cursor",
            "total_duration_seconds": 5.0,
        },
    })

    job = _make_job(workspace_root=str(tmp_path))
    step = _make_step()
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor,
        "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        result = await executor.execute(job, step)

    assert "timing_mode" in result
    assert "word_timings_count" in result
    assert result["timing_mode"] == "cursor"
    assert result["word_timings_count"] == 0


# ---------------------------------------------------------------------------
# Test 10: composition_props.json timing_mode_used + word_timings_count güncellenir
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_10_composition_props_updated_with_timing(tmp_path):
    """Başarılı render: composition_props.json timing_mode_used ve word_timings_count içerir."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact, _read_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {"word_timing_path": None, "timing_mode": "cursor", "total_duration_seconds": 5.0},
    })

    job = _make_job(workspace_root=str(tmp_path))
    step = _make_step()
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor,
        "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        await executor.execute(job, step)

    updated = _read_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json")
    assert updated["timing_mode_used"] == "cursor"
    assert updated["word_timings_count"] == 0
    assert updated["render_status"] == "rendered"


# ---------------------------------------------------------------------------
# Test 11: RenderStillExecutor step_key
# ---------------------------------------------------------------------------

def test_11_render_still_step_key():
    """RenderStillExecutor step_key 'render_still' döner."""
    from app.modules.standard_video.executors.render_still import RenderStillExecutor
    assert RenderStillExecutor().step_key() == "render_still"


# ---------------------------------------------------------------------------
# Test 12: RenderStillExecutor idempotent
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_12_render_still_idempotent(tmp_path):
    """preview_frame.jpg mevcut → subprocess çağrılmaz, skipped=True."""
    from app.modules.standard_video.executors.render_still import RenderStillExecutor
    from app.modules.standard_video.executors._helpers import _resolve_artifact_path

    preview_path = _resolve_artifact_path(str(tmp_path), TEST_JOB_ID, "preview_frame.jpg")
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview_path.write_bytes(b"\xff\xd8\xff")  # fake JPEG header

    job = _make_job(workspace_root=str(tmp_path))
    step = _make_step()
    executor = RenderStillExecutor()

    with mock.patch.object(executor, "_run_remotion_still") as mock_still:
        result = await executor.execute(job, step)

    mock_still.assert_not_called()
    assert result["skipped"] is True
    assert "preview_frame.jpg" in result["preview_path"]


# ---------------------------------------------------------------------------
# Test 13: RenderStillExecutor başarılı → preview_path döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_13_render_still_success(tmp_path):
    """Başarılı renderStill → preview_path, composition_id döner."""
    from app.modules.standard_video.executors.render_still import RenderStillExecutor

    job = _make_job(workspace_root=str(tmp_path))
    step = _make_step()
    executor = RenderStillExecutor()

    with mock.patch.object(
        executor,
        "_run_remotion_still",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        result = await executor.execute(job, step)

    assert "preview_path" in result
    assert result["composition_id"] == "PreviewFrame"
    assert result["step"] == "render_still"
    assert "provider" in result


# ---------------------------------------------------------------------------
# Test 14: RenderStillExecutor başarısız → StepExecutionError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_14_render_still_failure_raises(tmp_path):
    """subprocess başarısız → StepExecutionError fırlatılır."""
    from app.modules.standard_video.executors.render_still import RenderStillExecutor
    from app.jobs.exceptions import StepExecutionError

    job = _make_job(workspace_root=str(tmp_path))
    step = _make_step()
    executor = RenderStillExecutor()

    with mock.patch.object(
        executor,
        "_run_remotion_still",
        return_value={"success": False, "error": "renderStill hatası"},
    ):
        with pytest.raises(StepExecutionError):
            await executor.execute(job, step)


# ---------------------------------------------------------------------------
# Test 15: RenderStillExecutor StepExecutor'dan miras alır
# ---------------------------------------------------------------------------

def test_15_render_still_inherits_step_executor():
    """RenderStillExecutor StepExecutor abstract class'tan miras alır."""
    from app.modules.standard_video.executors.render_still import RenderStillExecutor
    from app.jobs.executor import StepExecutor
    assert issubclass(RenderStillExecutor, StepExecutor)


# ---------------------------------------------------------------------------
# Test 16: RenderStillExecutor executors paketinden import edilebilir
# ---------------------------------------------------------------------------

def test_16_render_still_importable():
    """RenderStillExecutor executors __init__.py'den import edilebilir."""
    from app.modules.standard_video.executors import RenderStillExecutor
    assert RenderStillExecutor is not None


# ---------------------------------------------------------------------------
# Test 17: PREVIEW_COMPOSITION_ID "PreviewFrame"
# ---------------------------------------------------------------------------

def test_17_preview_composition_id():
    """PREVIEW_COMPOSITION_ID 'PreviewFrame' sabitidir."""
    from app.modules.standard_video.executors.render_still import PREVIEW_COMPOSITION_ID
    assert PREVIEW_COMPOSITION_ID == "PreviewFrame"


# ---------------------------------------------------------------------------
# Test 18: preview yolu composition_props.json güncellemez
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_18_render_still_does_not_touch_composition_props(tmp_path):
    """RenderStillExecutor composition_props.json'u okumaz veya güncellemez."""
    from app.modules.standard_video.executors.render_still import RenderStillExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact, _read_artifact

    # composition_props.json'u önceden yaz
    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "render_status": "props_ready",
        "sentinel": "unchanged",
    })

    job = _make_job(workspace_root=str(tmp_path))
    step = _make_step()
    executor = RenderStillExecutor()

    with mock.patch.object(
        executor,
        "_run_remotion_still",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        await executor.execute(job, step)

    # composition_props.json değişmemeli
    original = _read_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json")
    assert original is not None
    assert original.get("sentinel") == "unchanged"
    assert original.get("render_status") == "props_ready"


# ---------------------------------------------------------------------------
# Test 19: _run_remotion_still renderer_dir yoksa hata döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_19_still_renderer_dir_missing():
    """_run_remotion_still: renderer_dir yoksa success=False döner."""
    from app.modules.standard_video.executors.render_still import RenderStillExecutor

    executor = RenderStillExecutor()
    with mock.patch(
        "app.modules.standard_video.executors.render_still._RENDERER_DIR",
        Path("/non_existent_renderer_m6c2"),
    ):
        result = await executor._run_remotion_still(
            props_path="/tmp/props.json",
            output_path="/tmp/preview.jpg",
            job_id=TEST_JOB_ID,
        )

    assert result["success"] is False
    assert "renderer/" in result["error"]


# ---------------------------------------------------------------------------
# Test 20: render_still.py UsedNewsRegistry import etmez
# ---------------------------------------------------------------------------

def test_20_render_still_no_used_news_registry():
    """render_still.py UsedNewsRegistry import etmez — sorumluluk ayrımı."""
    import pathlib
    render_still_path = (
        pathlib.Path(__file__).parent.parent
        / "app" / "modules" / "standard_video" / "executors" / "render_still.py"
    )
    source = render_still_path.read_text(encoding="utf-8")
    import_lines = [
        line for line in source.splitlines()
        if line.strip().startswith(("import ", "from "))
    ]
    assert not any("UsedNewsRegistry" in line for line in import_lines)


# ---------------------------------------------------------------------------
# Test 21: whisper timing_mode → word_timings_count > 0
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_21_whisper_timing_mode_word_count(tmp_path):
    """whisper_word timing_mode: word_timings_count > 0 render sonucunda görünür."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    words = _sample_word_timings()
    timing_file = tmp_path / "word_timing.json"
    timing_file.write_text(
        json.dumps({"version": "1", "timing_mode": "whisper_word", "language": "tr",
                    "words": words, "word_count": len(words)}),
        encoding="utf-8",
    )

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {
            "word_timing_path": str(timing_file),
            "timing_mode": "whisper_word",
            "total_duration_seconds": 5.0,
        },
    })

    job = _make_job(workspace_root=str(tmp_path))
    step = _make_step()
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor,
        "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        result = await executor.execute(job, step)

    assert result["timing_mode"] == "whisper_word"
    assert result["word_timings_count"] == 2


# ---------------------------------------------------------------------------
# Test 22: cursor timing_mode → word_timings_count = 0
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_22_cursor_timing_mode_zero_count(tmp_path):
    """cursor timing_mode (word_timing_path=None): word_timings_count=0."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {
            "word_timing_path": None,
            "timing_mode": "cursor",
            "total_duration_seconds": 5.0,
        },
    })

    job = _make_job(workspace_root=str(tmp_path))
    step = _make_step()
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor,
        "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        result = await executor.execute(job, step)

    assert result["timing_mode"] == "cursor"
    assert result["word_timings_count"] == 0


# ---------------------------------------------------------------------------
# Test 23: _load_word_timings "words" alanını döner
# ---------------------------------------------------------------------------

def test_23_load_word_timings_extracts_words_field(tmp_path):
    """_load_word_timings: word_timing.json 'words' alanını çıkarır."""
    from app.modules.standard_video.executors.render import _load_word_timings

    words = [{"scene": 1, "word": "test", "start": 0.0, "end": 1.0, "probability": 0.9}]
    timing_file = tmp_path / "wt.json"
    timing_file.write_text(
        json.dumps({"version": "1", "timing_mode": "whisper_segment",
                    "language": "tr", "words": words, "word_count": 1}),
        encoding="utf-8",
    )
    result = _load_word_timings(str(timing_file))
    assert len(result) == 1
    assert result[0]["word"] == "test"


# ---------------------------------------------------------------------------
# Test 24: render_props.json word_timing_path içermez
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_24_render_props_json_no_word_timing_path(tmp_path):
    """render_props.json sözleşme temizliği: word_timing_path alanı yok."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    _write_artifact(str(tmp_path), TEST_JOB_ID, "composition_props.json", {
        "job_id": TEST_JOB_ID,
        "composition_id": "StandardVideo",
        "render_status": "props_ready",
        "props": {
            "title": "Test",
            "word_timing_path": "/some/path/word_timing.json",
            "timing_mode": "cursor",
            "total_duration_seconds": 5.0,
        },
    })

    job = _make_job(workspace_root=str(tmp_path))
    step = _make_step()
    executor = RenderStepExecutor()

    with mock.patch.object(
        executor,
        "_run_remotion_render",
        return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
    ):
        await executor.execute(job, step)

    render_props_path = tmp_path / "artifacts" / "render_props.json"
    assert render_props_path.exists()
    content = json.loads(render_props_path.read_text(encoding="utf-8"))
    # Renderer'a geçirilen props'ta word_timing_path olmamalı
    assert "word_timing_path" not in content
    assert "wordTimings" in content


# ---------------------------------------------------------------------------
# Test 25: RENDER_STILL_TIMEOUT_SECONDS pozitif integer
# ---------------------------------------------------------------------------

def test_25_render_still_timeout_is_positive():
    """RENDER_STILL_TIMEOUT_SECONDS pozitif bir integer'dır."""
    from app.modules.standard_video.executors.render_still import RENDER_STILL_TIMEOUT_SECONDS
    assert isinstance(RENDER_STILL_TIMEOUT_SECONDS, int)
    assert RENDER_STILL_TIMEOUT_SECONDS > 0
