"""
M6-C1: RenderStepExecutor testleri.

Test kapsamı:
  1.  RenderStepExecutor step_key "render" döner.
  2.  composition_props.json yoksa StepExecutionError fırlatır.
  3.  render_status "props_ready" değilse StepExecutionError fırlatır.
  4.  output.mp4 zaten varsa idempotent döner (subprocess çağrılmaz).
  5.  composition_id eksikse StepExecutionError fırlatır.
  6.  renderer/node_modules yoksa subprocess hata döner.
  7.  subprocess başarılı → render_status "rendered" güncellenir.
  8.  subprocess returncode != 0 → StepExecutionError fırlatır.
  9.  subprocess zaman aşımı → StepExecutionError fırlatır.
  10. subprocess FileNotFoundError (npx yok) → StepExecutionError fırlatır.
  11. Başarılı render: output_path, composition_id, render_status döner.
  12. Başarılı render: composition_props.json render_status="rendered" olarak güncellenir.
  13. render_status "failed" durumu composition_props.json'a yazılır.
  14. RenderStepExecutor StepExecutor'dan miras alır.
  15. _run_remotion_render renderer_dir yoksa hata döner.
  16. Subprocess args shell=False — injection koruması.
  17. _RENDERER_DIR sabiti backend dizinine göre doğru hesaplanır.
  18. RENDER_TIMEOUT_SECONDS pozitif integer.
  19. RenderStepExecutor executors paketinden import edilebilir.
  20. render.py UsedNewsRegistry import etmez (sorumluluk ayrımı).
"""

from __future__ import annotations

import asyncio
import inspect
import json
import types
from pathlib import Path
from unittest import mock

import pytest

# ---------------------------------------------------------------------------
# Sabitler
# ---------------------------------------------------------------------------

TEST_JOB_ID = "test-job-render-001"
TEST_COMPOSITION_ID = "StandardVideo"

# ---------------------------------------------------------------------------
# Yardımcı: sahte Job + Step nesneleri
# ---------------------------------------------------------------------------

def _make_job(workspace_root: str = "") -> types.SimpleNamespace:
    """Sahte Job nesnesi — duck-typing yeterlidir."""
    return types.SimpleNamespace(
        id=TEST_JOB_ID,
        workspace_path=workspace_root,
        input_data_json=json.dumps({
            "topic": "test video",
            "language": "tr",
            "workspace_root": workspace_root,
        }),
    )


def _make_step() -> types.SimpleNamespace:
    return types.SimpleNamespace(id="step-render-001", key="render")


# ---------------------------------------------------------------------------
# Test 1: step_key "render" döner
# ---------------------------------------------------------------------------

def test_01_step_key_is_render():
    """RenderStepExecutor step_key 'render' döner."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    executor = RenderStepExecutor()
    assert executor.step_key() == "render"


# ---------------------------------------------------------------------------
# Test 2: composition_props.json yoksa StepExecutionError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_02_missing_composition_props_raises():
    """composition_props.json yoksa StepExecutionError fırlatılır."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.jobs.exceptions import StepExecutionError

    with tempfile.TemporaryDirectory() as tmpdir:
        job = _make_job(workspace_root=tmpdir)
        step = _make_step()
        executor = RenderStepExecutor()

        with pytest.raises(StepExecutionError) as exc_info:
            await executor.execute(job, step)

        assert "composition_props.json" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 3: render_status props_ready değilse StepExecutionError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_03_wrong_render_status_raises():
    """render_status 'props_ready' değilse StepExecutionError fırlatılır."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact
    from app.jobs.exceptions import StepExecutionError

    with tempfile.TemporaryDirectory() as tmpdir:
        _write_artifact(tmpdir, TEST_JOB_ID, "composition_props.json", {
            "job_id": TEST_JOB_ID,
            "composition_id": TEST_COMPOSITION_ID,
            "render_status": "rendered",  # zaten render edilmiş — props_ready gerekli
            "props": {},
        })

        job = _make_job(workspace_root=tmpdir)
        step = _make_step()
        executor = RenderStepExecutor()

        with pytest.raises(StepExecutionError) as exc_info:
            await executor.execute(job, step)

        assert "props_ready" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 4: output.mp4 zaten varsa idempotent döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_04_idempotent_if_output_exists():
    """output.mp4 zaten varsa subprocess çağrılmaz ve skipped=True döner."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact, _resolve_artifact_path

    with tempfile.TemporaryDirectory() as tmpdir:
        _write_artifact(tmpdir, TEST_JOB_ID, "composition_props.json", {
            "job_id": TEST_JOB_ID,
            "composition_id": TEST_COMPOSITION_ID,
            "render_status": "props_ready",
            "props": {},
        })

        # output.mp4 önceden oluştur
        output_path = _resolve_artifact_path(tmpdir, TEST_JOB_ID, "output.mp4")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(b"fake mp4 content")

        job = _make_job(workspace_root=tmpdir)
        step = _make_step()
        executor = RenderStepExecutor()

        with mock.patch.object(executor, "_run_remotion_render") as mock_render:
            result = await executor.execute(job, step)

        # Subprocess çağrılmamalı
        mock_render.assert_not_called()
        assert result["skipped"] is True
        assert result["render_status"] == "rendered"
        assert "output.mp4" in result["output_path"]


# ---------------------------------------------------------------------------
# Test 5: composition_id eksikse StepExecutionError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_05_missing_composition_id_raises():
    """composition_id eksikse StepExecutionError fırlatılır."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact
    from app.jobs.exceptions import StepExecutionError

    with tempfile.TemporaryDirectory() as tmpdir:
        _write_artifact(tmpdir, TEST_JOB_ID, "composition_props.json", {
            "job_id": TEST_JOB_ID,
            "composition_id": "",  # boş
            "render_status": "props_ready",
            "props": {},
        })

        job = _make_job(workspace_root=tmpdir)
        step = _make_step()
        executor = RenderStepExecutor()

        with pytest.raises(StepExecutionError) as exc_info:
            await executor.execute(job, step)

        assert "composition_id" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 6: renderer/node_modules yoksa subprocess hata döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_06_missing_node_modules_returns_error():
    """renderer/node_modules yoksa _run_remotion_render hata döner."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor

    with tempfile.TemporaryDirectory() as tmpdir:
        executor = RenderStepExecutor()

        # renderer_dir geçici dizine yönlendir — node_modules yok
        with mock.patch(
            "app.modules.standard_video.executors.render._RENDERER_DIR",
            Path(tmpdir) / "renderer_fake",
        ):
            # renderer_dir'i oluştur ama node_modules olmadan
            (Path(tmpdir) / "renderer_fake").mkdir()

            result = await executor._run_remotion_render(
                composition_id=TEST_COMPOSITION_ID,
                props_path="/tmp/props.json",
                output_path="/tmp/output.mp4",
                job_id=TEST_JOB_ID,
            )

        assert result["success"] is False
        assert "node_modules" in result["error"]


# ---------------------------------------------------------------------------
# Test 7: subprocess başarılı → render_status "rendered" güncellenir
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_07_successful_render_updates_status():
    """Başarılı render: composition_props.json render_status='rendered' olur."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact, _read_artifact

    with tempfile.TemporaryDirectory() as tmpdir:
        _write_artifact(tmpdir, TEST_JOB_ID, "composition_props.json", {
            "job_id": TEST_JOB_ID,
            "composition_id": TEST_COMPOSITION_ID,
            "render_status": "props_ready",
            "props": {"language": "tr"},
        })

        job = _make_job(workspace_root=tmpdir)
        step = _make_step()
        executor = RenderStepExecutor()

        mock_success = {
            "success": True,
            "returncode": 0,
            "stdout": "Render tamamlandı",
            "stderr": "",
        }

        with mock.patch.object(executor, "_run_remotion_render", return_value=mock_success):
            result = await executor.execute(job, step)

        assert result["render_status"] == "rendered"
        assert result["composition_id"] == TEST_COMPOSITION_ID

        # composition_props.json güncellendi mi?
        updated = _read_artifact(tmpdir, TEST_JOB_ID, "composition_props.json")
        assert updated["render_status"] == "rendered"
        assert "output_path" in updated


# ---------------------------------------------------------------------------
# Test 8: subprocess returncode != 0 → StepExecutionError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_08_failed_subprocess_raises():
    """subprocess returncode != 0 → StepExecutionError fırlatılır."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact
    from app.jobs.exceptions import StepExecutionError

    with tempfile.TemporaryDirectory() as tmpdir:
        _write_artifact(tmpdir, TEST_JOB_ID, "composition_props.json", {
            "job_id": TEST_JOB_ID,
            "composition_id": TEST_COMPOSITION_ID,
            "render_status": "props_ready",
            "props": {},
        })

        job = _make_job(workspace_root=tmpdir)
        step = _make_step()
        executor = RenderStepExecutor()

        mock_failure = {
            "success": False,
            "returncode": 1,
            "stdout": "",
            "stderr": "Remotion hata mesajı",
            "error": "npx remotion render hata kodu 1. Detay: Remotion hata mesajı",
        }

        with mock.patch.object(executor, "_run_remotion_render", return_value=mock_failure):
            with pytest.raises(StepExecutionError) as exc_info:
                await executor.execute(job, step)

        assert "Remotion render başarısız" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 9: subprocess zaman aşımı → hata döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_09_timeout_returns_error():
    """asyncio.TimeoutError → success=False döner."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor

    with tempfile.TemporaryDirectory() as tmpdir:
        executor = RenderStepExecutor()
        renderer_fake = Path(tmpdir) / "renderer"
        renderer_fake.mkdir()
        (renderer_fake / "node_modules").mkdir()

        async def fake_create_subprocess(*args, **kwargs):
            """subprocess.communicate() zaman aşımı simülasyonu."""
            proc = mock.AsyncMock()
            proc.communicate = mock.AsyncMock(side_effect=asyncio.TimeoutError())
            proc.kill = mock.Mock()
            proc.wait = mock.AsyncMock()
            return proc

        with mock.patch(
            "app.modules.standard_video.executors.render._RENDERER_DIR",
            renderer_fake,
        ):
            with mock.patch(
                "asyncio.create_subprocess_exec",
                side_effect=fake_create_subprocess,
            ):
                result = await executor._run_remotion_render(
                    composition_id=TEST_COMPOSITION_ID,
                    props_path="/tmp/props.json",
                    output_path="/tmp/output.mp4",
                    job_id=TEST_JOB_ID,
                )

        assert result["success"] is False
        assert "zaman aşımı" in result["error"]


# ---------------------------------------------------------------------------
# Test 10: subprocess FileNotFoundError (npx yok) → hata döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_10_npx_not_found_returns_error():
    """npx komutu bulunamazsa FileNotFoundError yakalanır."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor

    with tempfile.TemporaryDirectory() as tmpdir:
        executor = RenderStepExecutor()
        renderer_fake = Path(tmpdir) / "renderer"
        renderer_fake.mkdir()
        (renderer_fake / "node_modules").mkdir()

        with mock.patch(
            "app.modules.standard_video.executors.render._RENDERER_DIR",
            renderer_fake,
        ):
            with mock.patch(
                "asyncio.create_subprocess_exec",
                side_effect=FileNotFoundError("npx not found"),
            ):
                result = await executor._run_remotion_render(
                    composition_id=TEST_COMPOSITION_ID,
                    props_path="/tmp/props.json",
                    output_path="/tmp/output.mp4",
                    job_id=TEST_JOB_ID,
                )

        assert result["success"] is False
        assert "npx" in result["error"]


# ---------------------------------------------------------------------------
# Test 11: Başarılı render sonuç yapısı
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_11_successful_render_result_structure():
    """Başarılı render: output_path, composition_id, render_status döner."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact

    with tempfile.TemporaryDirectory() as tmpdir:
        _write_artifact(tmpdir, TEST_JOB_ID, "composition_props.json", {
            "job_id": TEST_JOB_ID,
            "composition_id": TEST_COMPOSITION_ID,
            "render_status": "props_ready",
            "props": {},
        })

        job = _make_job(workspace_root=tmpdir)
        step = _make_step()
        executor = RenderStepExecutor()

        with mock.patch.object(
            executor,
            "_run_remotion_render",
            return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
        ):
            result = await executor.execute(job, step)

        assert "output_path" in result
        assert result["composition_id"] == TEST_COMPOSITION_ID
        assert result["render_status"] == "rendered"
        assert result["step"] == "render"
        assert "provider" in result
        assert result["provider"]["provider_id"] == "remotion_cli"


# ---------------------------------------------------------------------------
# Test 12: Başarılı render sonrası composition_props güncellenir
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_12_composition_props_updated_after_render():
    """Başarılı render: composition_props.json output_path ve updated_at içerir."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact, _read_artifact

    with tempfile.TemporaryDirectory() as tmpdir:
        _write_artifact(tmpdir, TEST_JOB_ID, "composition_props.json", {
            "job_id": TEST_JOB_ID,
            "composition_id": TEST_COMPOSITION_ID,
            "render_status": "props_ready",
            "props": {},
        })

        job = _make_job(workspace_root=tmpdir)
        step = _make_step()
        executor = RenderStepExecutor()

        with mock.patch.object(
            executor,
            "_run_remotion_render",
            return_value={"success": True, "returncode": 0, "stdout": "", "stderr": ""},
        ):
            await executor.execute(job, step)

        updated = _read_artifact(tmpdir, TEST_JOB_ID, "composition_props.json")
        assert updated is not None
        assert updated["render_status"] == "rendered"
        assert "output_path" in updated
        assert "updated_at" in updated


# ---------------------------------------------------------------------------
# Test 13: Başarısız render → composition_props render_status="failed" olur
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_13_failed_render_marks_composition_props():
    """Başarısız render: composition_props.json render_status='failed' olur."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.modules.standard_video.executors._helpers import _write_artifact, _read_artifact
    from app.jobs.exceptions import StepExecutionError

    with tempfile.TemporaryDirectory() as tmpdir:
        _write_artifact(tmpdir, TEST_JOB_ID, "composition_props.json", {
            "job_id": TEST_JOB_ID,
            "composition_id": TEST_COMPOSITION_ID,
            "render_status": "props_ready",
            "props": {},
        })

        job = _make_job(workspace_root=tmpdir)
        step = _make_step()
        executor = RenderStepExecutor()

        with mock.patch.object(
            executor,
            "_run_remotion_render",
            return_value={"success": False, "error": "render hatası"},
        ):
            with pytest.raises(StepExecutionError):
                await executor.execute(job, step)

        updated = _read_artifact(tmpdir, TEST_JOB_ID, "composition_props.json")
        assert updated is not None
        assert updated["render_status"] == "failed"
        assert "render_error" in updated


# ---------------------------------------------------------------------------
# Test 14: RenderStepExecutor StepExecutor'dan miras alır
# ---------------------------------------------------------------------------

def test_14_inherits_from_step_executor():
    """RenderStepExecutor StepExecutor abstract class'tan miras alır."""
    from app.modules.standard_video.executors.render import RenderStepExecutor
    from app.jobs.executor import StepExecutor
    assert issubclass(RenderStepExecutor, StepExecutor)


# ---------------------------------------------------------------------------
# Test 15: _run_remotion_render renderer_dir yoksa hata döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_15_run_renderer_missing_dir():
    """_run_remotion_render: renderer_dir yoksa success=False döner."""
    from app.modules.standard_video.executors.render import RenderStepExecutor

    executor = RenderStepExecutor()

    with mock.patch(
        "app.modules.standard_video.executors.render._RENDERER_DIR",
        Path("/non_existent_dir_contenthub_render"),
    ):
        result = await executor._run_remotion_render(
            composition_id=TEST_COMPOSITION_ID,
            props_path="/tmp/props.json",
            output_path="/tmp/output.mp4",
            job_id=TEST_JOB_ID,
        )

    assert result["success"] is False
    assert "renderer/" in result["error"]


# ---------------------------------------------------------------------------
# Test 16: Subprocess args shell=False — injection koruması
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_16_subprocess_no_shell():
    """asyncio.create_subprocess_exec shell=False ile çağrılır."""
    import tempfile
    from app.modules.standard_video.executors.render import RenderStepExecutor

    with tempfile.TemporaryDirectory() as tmpdir:
        executor = RenderStepExecutor()
        renderer_fake = Path(tmpdir) / "renderer"
        renderer_fake.mkdir()
        (renderer_fake / "node_modules").mkdir()

        captured_calls: list[dict] = []

        async def fake_subprocess_exec(*args, **kwargs):
            captured_calls.append({"args": args, "kwargs": kwargs})
            proc = mock.AsyncMock()
            proc.communicate = mock.AsyncMock(
                return_value=(b"stdout", b"stderr")
            )
            proc.returncode = 0
            return proc

        with mock.patch(
            "app.modules.standard_video.executors.render._RENDERER_DIR",
            renderer_fake,
        ):
            with mock.patch(
                "asyncio.create_subprocess_exec",
                side_effect=fake_subprocess_exec,
            ):
                await executor._run_remotion_render(
                    composition_id=TEST_COMPOSITION_ID,
                    props_path="/tmp/props.json",
                    output_path="/tmp/output.mp4",
                    job_id=TEST_JOB_ID,
                )

        assert len(captured_calls) == 1
        # create_subprocess_exec'te shell kwarg olmamalı (varsayılan False)
        assert "shell" not in captured_calls[0]["kwargs"]


# ---------------------------------------------------------------------------
# Test 17: _RENDERER_DIR sabiti doğru hesaplanır
# ---------------------------------------------------------------------------

def test_17_renderer_dir_points_to_renderer():
    """_RENDERER_DIR backend dizininin kardeşi olan renderer/ dizinini gösterir."""
    from app.modules.standard_video.executors.render import _RENDERER_DIR
    assert _RENDERER_DIR.name == "renderer"
    # renderer/ ve backend/ aynı seviyede olmalı (ContentHub/ altında)
    assert _RENDERER_DIR.parent.name == "ContentHub" or (
        _RENDERER_DIR.parent / "backend"
    ).exists()


# ---------------------------------------------------------------------------
# Test 18: RENDER_TIMEOUT_SECONDS pozitif integer
# ---------------------------------------------------------------------------

def test_18_render_timeout_is_positive():
    """RENDER_TIMEOUT_SECONDS pozitif bir integer'dır."""
    from app.modules.standard_video.executors.render import RENDER_TIMEOUT_SECONDS
    assert isinstance(RENDER_TIMEOUT_SECONDS, int)
    assert RENDER_TIMEOUT_SECONDS > 0


# ---------------------------------------------------------------------------
# Test 19: RenderStepExecutor executors paketinden import edilebilir
# ---------------------------------------------------------------------------

def test_19_importable_from_executors_package():
    """RenderStepExecutor executors __init__.py'den import edilebilir."""
    from app.modules.standard_video.executors import RenderStepExecutor
    assert RenderStepExecutor is not None


# ---------------------------------------------------------------------------
# Test 20: render.py UsedNewsRegistry import etmez
# ---------------------------------------------------------------------------

def test_20_render_py_does_not_import_used_news_registry():
    """render.py UsedNewsRegistry import etmez — sorumluluk ayrımı."""
    import importlib.util
    import pathlib

    render_path = (
        pathlib.Path(__file__).parent.parent
        / "app" / "modules" / "standard_video" / "executors" / "render.py"
    )
    source = render_path.read_text(encoding="utf-8")
    import_lines = [
        line for line in source.splitlines()
        if line.strip().startswith(("import ", "from "))
    ]
    assert not any("UsedNewsRegistry" in line for line in import_lines), (
        "render.py UsedNewsRegistry import etmemelidir. "
        "Sorumluluk ayrımı ihlali: editorial gate logic render executor'a taşınmamalı."
    )
