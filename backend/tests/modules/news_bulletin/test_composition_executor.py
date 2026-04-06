"""
M28 — BulletinCompositionExecutor testleri.

Artifact toplama, props build, composition_id mapping, idempotency.
"""

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock

import pytest

from app.modules.news_bulletin.executors.composition import BulletinCompositionExecutor


def _make_job(input_data: dict, workspace_root: str = "") -> MagicMock:
    """Mock Job nesnesi oluşturur."""
    job = MagicMock()
    job.id = "test-job-001"
    input_data["workspace_root"] = workspace_root
    job.input_data_json = json.dumps(input_data, ensure_ascii=False)
    job.workspace_path = workspace_root or None
    return job


def _make_step() -> MagicMock:
    """Mock JobStep nesnesi oluşturur."""
    step = MagicMock()
    step.id = "test-step-001"
    return step


def _write_json(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


class TestBulletinCompositionExecutor:

    def test_step_key(self):
        executor = BulletinCompositionExecutor()
        assert executor.step_key() == "composition"

    @pytest.mark.asyncio
    async def test_execute_produces_composition_props(self):
        """Zorunlu artifact'lar mevcut olduğunda composition_props.json üretilmeli."""
        with tempfile.TemporaryDirectory() as tmpdir:
            artifacts = Path(tmpdir) / "artifacts"
            artifacts.mkdir()

            # Gerekli artifact'lar
            script_data = {
                "items": [
                    {"headline": "Test Haber", "narration": "Test narration", "item_number": 1},
                ],
                "language": "tr",
                "bulletin_id": "b-001",
            }
            audio_manifest = {
                "scenes": [
                    {"audio_path": "/tmp/audio_1.mp3", "duration_seconds": 10.5},
                ],
            }
            metadata = {
                "title": "Test Bülten",
                "description": "Açıklama",
                "tags": ["haber"],
            }

            _write_json(artifacts / "bulletin_script.json", script_data)
            _write_json(artifacts / "audio_manifest.json", audio_manifest)
            _write_json(artifacts / "metadata.json", metadata)

            executor = BulletinCompositionExecutor()
            job = _make_job({"bulletin_id": "b-001", "language": "tr"}, tmpdir)
            step = _make_step()

            result = await executor.execute(job, step)

            assert result["composition_id"] == "NewsBulletin"
            assert result["render_status"] == "props_ready"
            assert result["items_included"] == 1
            assert result["step"] == "composition"

            # Artifact dosyası yazılmış olmalı
            props_file = artifacts / "composition_props.json"
            assert props_file.exists()

            props = json.loads(props_file.read_text())
            assert props["composition_id"] == "NewsBulletin"
            assert props["module_id"] == "news_bulletin"
            assert len(props["props"]["items"]) == 1
            assert props["props"]["items"][0]["headline"] == "Test Haber"

    @pytest.mark.asyncio
    async def test_idempotency_skips_if_props_exist(self):
        """composition_props.json zaten varsa adım atlanmalı."""
        with tempfile.TemporaryDirectory() as tmpdir:
            artifacts = Path(tmpdir) / "artifacts"
            artifacts.mkdir()

            existing_props = {
                "composition_id": "NewsBulletin",
                "render_status": "props_ready",
            }
            _write_json(artifacts / "composition_props.json", existing_props)

            executor = BulletinCompositionExecutor()
            job = _make_job({"bulletin_id": "b-001"}, tmpdir)
            step = _make_step()

            result = await executor.execute(job, step)

            assert result["skipped"] is True
            assert result["composition_id"] == "NewsBulletin"

    @pytest.mark.asyncio
    async def test_missing_script_artifact_raises(self):
        """bulletin_script.json yoksa StepExecutionError fırlatmalı."""
        from app.jobs.exceptions import StepExecutionError

        with tempfile.TemporaryDirectory() as tmpdir:
            artifacts = Path(tmpdir) / "artifacts"
            artifacts.mkdir()

            # Sadece audio_manifest var, script yok
            _write_json(artifacts / "audio_manifest.json", {"scenes": []})

            executor = BulletinCompositionExecutor()
            job = _make_job({"bulletin_id": "b-001"}, tmpdir)
            step = _make_step()

            with pytest.raises(StepExecutionError, match="bulletin_script.json"):
                await executor.execute(job, step)

    @pytest.mark.asyncio
    async def test_missing_audio_manifest_raises(self):
        """audio_manifest.json yoksa StepExecutionError fırlatmalı."""
        from app.jobs.exceptions import StepExecutionError

        with tempfile.TemporaryDirectory() as tmpdir:
            artifacts = Path(tmpdir) / "artifacts"
            artifacts.mkdir()

            _write_json(artifacts / "bulletin_script.json", {"items": [], "language": "tr"})

            executor = BulletinCompositionExecutor()
            job = _make_job({"bulletin_id": "b-001"}, tmpdir)
            step = _make_step()

            with pytest.raises(StepExecutionError, match="audio_manifest.json"):
                await executor.execute(job, step)

    @pytest.mark.asyncio
    async def test_composition_id_from_safe_map(self):
        """composition_id 'NewsBulletin' composition_map'ten doğru gelmeli."""
        from app.modules.standard_video.composition_map import get_composition_id
        assert get_composition_id("news_bulletin") == "NewsBulletin"
