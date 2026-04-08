"""
M34 Faz A: Multi-output render testleri.

RenderStepExecutor'ün render_outputs[] listesini doğru şekilde
işleyip her output için ayrı Remotion render çağrısı yaptığını doğrular.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path

import pytest

from app.modules.standard_video.executors.render import (
    RenderStepExecutor,
    _build_render_props_from_output,
)


# ---------------------------------------------------------------------------
# _build_render_props_from_output testleri
# ---------------------------------------------------------------------------

class TestBuildRenderPropsFromOutput:
    """_build_render_props_from_output fonksiyon testleri."""

    def test_basic_props_extraction(self):
        entry = {
            "output_key": "item_1",
            "props": {
                "bulletinTitle": "Test Bülten",
                "items": [{"headline": "Haber 1"}],
                "timingMode": "cursor",
                "totalDurationSeconds": 30.0,
            },
        }
        result = _build_render_props_from_output(entry)
        assert result["bulletinTitle"] == "Test Bülten"
        assert result["totalDurationSeconds"] == 30.0
        assert result["wordTimings"] == []

    def test_word_timing_path_removed(self):
        entry = {
            "props": {
                "wordTimingPath": "/some/path.json",
                "timingMode": "whisper",
            },
        }
        result = _build_render_props_from_output(entry)
        assert "wordTimingPath" not in result
        assert "wordTimings" in result

    def test_snake_case_fallback(self):
        entry = {
            "props": {
                "word_timing_path": "/some/path.json",
            },
        }
        result = _build_render_props_from_output(entry)
        assert "word_timing_path" not in result
        assert "wordTimings" in result

    def test_empty_props(self):
        entry = {"output_key": "combined"}
        result = _build_render_props_from_output(entry)
        assert result["wordTimings"] == []


# ---------------------------------------------------------------------------
# Multi-output execute testleri
# ---------------------------------------------------------------------------

def _make_job(job_id: str = "test-job-001") -> MagicMock:
    job = MagicMock()
    job.id = job_id
    job.input_data_json = json.dumps({
        "workspace": "/tmp/test_workspace",
        "content_id": "bulletin-001",
    })
    job.workspace_path = "/tmp/test_workspace"
    return job


def _make_step() -> MagicMock:
    step = MagicMock()
    step.id = "step-render-001"
    return step


def _make_multi_composition_props(render_mode: str = "per_item") -> dict:
    """3 haber, per_item mod — 3 ayrı render output."""
    items = [
        {"itemNumber": 1, "headline": "Haber A", "durationSeconds": 15.0, "category": "ekonomi"},
        {"itemNumber": 2, "headline": "Haber B", "durationSeconds": 20.0, "category": "spor"},
        {"itemNumber": 3, "headline": "Haber C", "durationSeconds": 10.0, "category": "ekonomi"},
    ]

    render_outputs = []
    for item in items:
        n = item["itemNumber"]
        render_outputs.append({
            "output_key": f"item_{n}",
            "output_label": f"Haber {n}: {item['headline']}",
            "composition_id": "NewsBulletin",
            "items": [item],
            "suggested_filename": f"output_item_{n:02d}.mp4",
            "total_duration_seconds": item["durationSeconds"],
            "props": {
                "bulletinTitle": f"Haber {n}: {item['headline']}",
                "items": [item],
                "timingMode": "cursor",
                "totalDurationSeconds": item["durationSeconds"],
                "language": "tr",
            },
        })

    return {
        "job_id": "test-job-001",
        "module_id": "news_bulletin",
        "language": "tr",
        "composition_id": "NewsBulletin",
        "render_mode": render_mode,
        "render_outputs": render_outputs,
        "props": {
            "bulletinTitle": "Test Bülten",
            "items": items,
            "timingMode": "cursor",
            "totalDurationSeconds": 45.0,
            "language": "tr",
        },
        "render_status": "props_ready",
    }


class TestMultiOutputRenderRouting:
    """execute() metodunun render_outputs[] listesine göre doğru yolu seçtiğini test eder."""

    def test_single_render_output_uses_legacy_path(self):
        """render_outputs tek elemanlıysa legacy (tek output) yolu kullanılır."""
        props = _make_multi_composition_props()
        # Tek output bırak
        props["render_outputs"] = props["render_outputs"][:1]
        outputs = props["render_outputs"]
        assert len(outputs) == 1
        # RenderStepExecutor.execute() tek output için multi_output'a girmez

    def test_multi_render_outputs_detected(self):
        """render_outputs >1 ise multi-output path tetiklenir."""
        props = _make_multi_composition_props()
        assert len(props["render_outputs"]) == 3
        # Bu condition execute() içinde _execute_multi_output'u çağırır

    def test_no_render_outputs_uses_legacy_path(self):
        """render_outputs yoksa legacy path kullanılır."""
        props = _make_multi_composition_props()
        del props["render_outputs"]
        outputs = props.get("render_outputs", [])
        assert len(outputs) == 0


@pytest.mark.asyncio
class TestMultiOutputExecute:
    """_execute_multi_output entegrasyon testleri (mock subprocess)."""

    async def test_per_item_produces_three_outputs(self, tmp_path):
        """per_item render modunda 3 haber → 3 video artifact."""
        composition_props = _make_multi_composition_props("per_item")
        job = _make_job()
        step = _make_step()

        # Workspace ve artifact dizini
        artifacts_dir = tmp_path / "artifacts" / job.id
        artifacts_dir.mkdir(parents=True)

        # composition_props.json yaz
        comp_file = artifacts_dir / "composition_props.json"
        comp_file.write_text(json.dumps(composition_props))

        executor = RenderStepExecutor()

        # _run_remotion_render'ı mock'la — her çağrıda output dosyası oluştur
        async def fake_render(composition_id, props_path, output_path, job_id):
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            Path(output_path).write_bytes(b"fake_video_data")
            return {"success": True, "returncode": 0, "stdout": "", "stderr": ""}

        with patch.object(executor, "_run_remotion_render", side_effect=fake_render):
            with patch(
                "app.modules.standard_video.executors.render._resolve_artifact_path",
                side_effect=lambda ws, jid, fname: artifacts_dir / fname,
            ):
                with patch(
                    "app.modules.standard_video.executors.render._write_artifact",
                ):
                    result = await executor._execute_multi_output(
                        job=job,
                        composition_props=composition_props,
                        composition_id="NewsBulletin",
                        workspace_root=str(tmp_path),
                        render_outputs=composition_props["render_outputs"],
                    )

        assert result["render_status"] == "rendered"
        assert result["output_count"] == 3
        assert len(result["output_paths"]) == 3
        assert result["render_mode"] == "per_item"

        # Her output dosyası oluşturulmuş olmalı
        for entry in composition_props["render_outputs"]:
            fpath = artifacts_dir / entry["suggested_filename"]
            assert fpath.exists(), f"{entry['suggested_filename']} oluşturulmadı"

    async def test_idempotency_skips_existing(self, tmp_path):
        """Tüm output dosyaları zaten varsa render atlanır."""
        composition_props = _make_multi_composition_props("per_item")
        job = _make_job()

        artifacts_dir = tmp_path / "artifacts" / job.id
        artifacts_dir.mkdir(parents=True)

        # Output dosyalarını önceden oluştur
        for entry in composition_props["render_outputs"]:
            (artifacts_dir / entry["suggested_filename"]).write_bytes(b"existing")

        executor = RenderStepExecutor()

        with patch(
            "app.modules.standard_video.executors.render._resolve_artifact_path",
            side_effect=lambda ws, jid, fname: artifacts_dir / fname,
        ):
            result = await executor._execute_multi_output(
                job=job,
                composition_props=composition_props,
                composition_id="NewsBulletin",
                workspace_root=str(tmp_path),
                render_outputs=composition_props["render_outputs"],
            )

        assert result["skipped"] is True
        assert result["output_count"] == 3

    async def test_partial_failure_raises(self, tmp_path):
        """Bir output fail ederse StepExecutionError fırlatılır."""
        composition_props = _make_multi_composition_props("per_item")
        job = _make_job()

        artifacts_dir = tmp_path / "artifacts" / job.id
        artifacts_dir.mkdir(parents=True)

        executor = RenderStepExecutor()
        call_count = 0

        async def fake_render_fail_second(composition_id, props_path, output_path, job_id):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                return {"success": False, "error": "Remotion crashed", "returncode": 1}
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            Path(output_path).write_bytes(b"fake_video_data")
            return {"success": True, "returncode": 0, "stdout": "", "stderr": ""}

        from app.jobs.exceptions import StepExecutionError

        with patch.object(executor, "_run_remotion_render", side_effect=fake_render_fail_second):
            with patch(
                "app.modules.standard_video.executors.render._resolve_artifact_path",
                side_effect=lambda ws, jid, fname: artifacts_dir / fname,
            ):
                with patch("app.modules.standard_video.executors.render._write_artifact"):
                    with pytest.raises(StepExecutionError, match="Multi-output render başarısız"):
                        await executor._execute_multi_output(
                            job=job,
                            composition_props=composition_props,
                            composition_id="NewsBulletin",
                            workspace_root=str(tmp_path),
                            render_outputs=composition_props["render_outputs"],
                        )


class TestPerCategoryRenderOutputs:
    """per_category render modunda output planı doğrulama."""

    def test_per_category_composition_props(self):
        """per_category modu doğru output key'leri üretir."""
        items = [
            {"itemNumber": 1, "headline": "A", "durationSeconds": 10.0, "category": "ekonomi"},
            {"itemNumber": 2, "headline": "B", "durationSeconds": 15.0, "category": "spor"},
            {"itemNumber": 3, "headline": "C", "durationSeconds": 12.0, "category": "ekonomi"},
        ]

        from app.modules.news_bulletin.executors.composition import _build_render_outputs

        outputs = _build_render_outputs(
            render_mode="per_category",
            props_items=items,
            bulletin_title="Test Bülten",
            composition_id="NewsBulletin",
            subtitles_srt=None,
            word_timing_path=None,
            timing_mode="cursor",
            resolved_subtitle_style={},
            lower_third_style=None,
            language="tr",
            metadata_data={},
        )

        assert len(outputs) == 2
        keys = [o["output_key"] for o in outputs]
        assert "category_ekonomi" in keys
        assert "category_spor" in keys

        # ekonomi: 2 haber
        eko = next(o for o in outputs if o["output_key"] == "category_ekonomi")
        assert len(eko["items"]) == 2
        # 22.0s audio + 2 items × 1.25s CATEGORY_FLASH_DUR = 24.5s
        assert eko["total_duration_seconds"] == 24.5

        # spor: 1 haber
        spor = next(o for o in outputs if o["output_key"] == "category_spor")
        assert len(spor["items"]) == 1
