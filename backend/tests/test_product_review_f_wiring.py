"""
Faz F testleri — TTS/Subtitle/Render/Publish adapter executor'lari +
publish guard (affiliate + price disclaimer) + allow_publish_without_review audit.

Kapsam:
  - tts.py bridge: product_review_script.json -> script.json kopyasini yazar.
  - subtitle.py: standard_video SubtitleStepExecutor delegate eder (imza OK).
  - render.py bridge: product_review_composition.json -> composition_props.json
    render_status=props_ready alaniyla kopyalanir, audio_manifest.json scene
    audio_path/duration_seconds enjekte edilir.
  - publish.py:
      * metadata legal.disclosure_applied=False -> publish fails.
      * metadata legal.disclaimer_applied=False -> publish fails.
      * affiliate_enabled=True + affiliate_url_included=False -> publish fails.
      * publish_record_id yok + allow_publish_without_review=False -> fails.
      * publish_record_id yok + allow_publish_without_review=True -> audited_only.
  - __init__.py export: tum Faz F executor'lari export ediliyor mu?
"""

from __future__ import annotations

import json
import pathlib
import uuid
from typing import Any

import pytest

from app.modules.product_review.executors._helpers import (
    _artifact_dir,
    _write_artifact,
)
from app.modules.product_review.executors.tts import (
    _bridge_script_artifact,
    ProductReviewTTSStepExecutor,
)
from app.modules.product_review.executors.render import (
    _bridge_composition_artifact,
    ProductReviewRenderStepExecutor,
)
from app.modules.product_review.executors.publish import (
    ProductReviewPublishStepExecutor,
    _assert_affiliate_and_disclaimer,
)


class _FakeJob:
    def __init__(self, id: str, input_data: dict, workspace: str) -> None:
        self.id = id
        self.input_data_json = json.dumps(input_data, ensure_ascii=False)
        self.workspace_path = workspace


class _FakeStep:
    artifact_refs_json = None


# ---------------------------------------------------------------------------
# TTS bridge
# ---------------------------------------------------------------------------


def test_tts_bridge_copies_script_artifact(tmp_path):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    script = {"scenes": [{"scene_key": "intro_hook", "narration": "Merhaba"}]}
    _write_artifact(workspace, job_id, "product_review_script.json", script)

    _bridge_script_artifact(workspace, job_id)

    bridged = json.loads(
        (_artifact_dir(workspace, job_id) / "script.json").read_text()
    )
    assert bridged["scenes"][0]["scene_key"] == "intro_hook"
    assert bridged["scenes"][0]["narration"] == "Merhaba"


def test_tts_bridge_missing_source_raises(tmp_path):
    from app.jobs.exceptions import StepExecutionError

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    with pytest.raises(StepExecutionError, match="product_review_script.json"):
        _bridge_script_artifact(workspace, job_id)


# ---------------------------------------------------------------------------
# Render bridge
# ---------------------------------------------------------------------------


def test_render_bridge_writes_props_ready(tmp_path):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    composition = {
        "composition_id": "ProductReview",
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "duration_frames": 1800,
        "props": {
            "template_type": "single",
            "scenes": [
                {"scene_id": "s_0", "scene_key": "intro_hook", "duration_ms": 2500},
            ],
            "total_duration_seconds": 60.0,
        },
    }
    _write_artifact(workspace, job_id, "product_review_composition.json", composition)

    audio_manifest = {
        "scenes": [
            {
                "scene_number": 1,
                "audio_path": "artifacts/audio/scene_1.mp3",
                "duration_seconds": 2.5,
                "narration": "Hi",
            }
        ],
        "total_duration_seconds": 2.5,
    }
    _write_artifact(workspace, job_id, "audio_manifest.json", audio_manifest)
    # subtitles.srt ve word_timing.json yazalim ki relative path'ler eklensin
    d = _artifact_dir(workspace, job_id)
    (d / "subtitles.srt").write_text("1\n00:00:00,000 --> 00:00:02,500\nHi\n")
    (d / "word_timing.json").write_text(json.dumps({"words": []}))

    bridged = _bridge_composition_artifact(workspace, job_id)

    assert bridged["render_status"] == "props_ready"
    assert bridged["composition_id"] == "ProductReview"
    # scenes audio_path enjekte edildi mi?
    assert bridged["props"]["scenes"][0]["audio_path"] == "artifacts/audio/scene_1.mp3"
    assert bridged["props"]["scenes"][0]["duration_seconds"] == 2.5
    # subtitlesSrt + wordTimingPath relative eklendi mi?
    assert bridged["props"]["subtitlesSrt"] == "artifacts/subtitles.srt"
    assert bridged["props"]["wordTimingPath"].endswith("word_timing.json")

    # Dosya yazildi mi?
    bridged_path = _artifact_dir(workspace, job_id) / "composition_props.json"
    assert bridged_path.exists()
    on_disk = json.loads(bridged_path.read_text())
    assert on_disk["render_status"] == "props_ready"


def test_render_bridge_missing_source_raises(tmp_path):
    from app.jobs.exceptions import StepExecutionError

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    with pytest.raises(StepExecutionError, match="product_review_composition.json"):
        _bridge_composition_artifact(workspace, job_id)


# ---------------------------------------------------------------------------
# Publish guards (unit)
# ---------------------------------------------------------------------------


def test_publish_guard_missing_disclosure_raises():
    from app.jobs.exceptions import StepExecutionError

    meta = {"legal": {"disclosure_applied": False, "disclaimer_applied": True}}
    with pytest.raises(StepExecutionError, match="affiliate_disclosure"):
        _assert_affiliate_and_disclaimer(meta)


def test_publish_guard_missing_disclaimer_raises():
    from app.jobs.exceptions import StepExecutionError

    meta = {"legal": {"disclosure_applied": True, "disclaimer_applied": False}}
    with pytest.raises(StepExecutionError, match="price_disclaimer"):
        _assert_affiliate_and_disclaimer(meta)


def test_publish_guard_affiliate_enabled_no_url_raises():
    from app.jobs.exceptions import StepExecutionError

    meta = {
        "legal": {
            "disclosure_applied": True,
            "disclaimer_applied": True,
            "affiliate_enabled": True,
            "affiliate_url_included": False,
        }
    }
    with pytest.raises(StepExecutionError, match="affiliate_url_included"):
        _assert_affiliate_and_disclaimer(meta)


def test_publish_guard_all_ok_no_raise():
    meta = {
        "legal": {
            "disclosure_applied": True,
            "disclaimer_applied": True,
            "affiliate_enabled": False,
            "affiliate_url_included": False,
        }
    }
    # Bu call exception firlatmamali.
    _assert_affiliate_and_disclaimer(meta)


# ---------------------------------------------------------------------------
# Publish executor e2e-lite (DB delegate'i mock'lanmis)
# ---------------------------------------------------------------------------


def _seed_legal_metadata(workspace: str, job_id: str, **overrides) -> None:
    legal = {
        "disclosure_applied": True,
        "disclaimer_applied": True,
        "affiliate_enabled": False,
        "affiliate_url_included": False,
        "tos_checkbox_required": True,
    }
    legal.update(overrides)
    _write_artifact(
        workspace,
        job_id,
        "product_review_metadata.json",
        {
            "title": "T",
            "description": "D",
            "tags": ["t"],
            "legal": legal,
        },
    )


@pytest.mark.asyncio
async def test_publish_executor_metadata_missing_fails(tmp_path):
    from app.jobs.exceptions import StepExecutionError

    executor = ProductReviewPublishStepExecutor(db=None)  # type: ignore[arg-type]
    job = _FakeJob(
        id=uuid.uuid4().hex,
        input_data={"run_mode": "semi_auto", "_settings_snapshot": {}},
        workspace=str(tmp_path),
    )
    with pytest.raises(StepExecutionError, match="metadata artifact bulunamadi"):
        await executor.execute(job, _FakeStep())  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_publish_executor_no_record_id_no_allow_fails(tmp_path):
    from app.jobs.exceptions import StepExecutionError

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_legal_metadata(workspace, job_id)

    executor = ProductReviewPublishStepExecutor(db=None)  # type: ignore[arg-type]
    job = _FakeJob(
        id=job_id,
        input_data={
            "run_mode": "full_auto",
            "_settings_snapshot": {},
        },
        workspace=workspace,
    )
    with pytest.raises(StepExecutionError, match="publish_record_id eksik"):
        await executor.execute(job, _FakeStep())  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_publish_executor_no_record_id_but_allowed_returns_audited(tmp_path):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_legal_metadata(workspace, job_id)

    executor = ProductReviewPublishStepExecutor(db=None)  # type: ignore[arg-type]
    job = _FakeJob(
        id=job_id,
        input_data={
            "run_mode": "full_auto",
            "_settings_snapshot": {
                "product_review.full_auto.allow_publish_without_review": True,
            },
        },
        workspace=workspace,
    )
    res = await executor.execute(job, _FakeStep())  # type: ignore[arg-type]
    assert res["status"] == "audited_only"
    assert res["allow_publish_without_review"] is True
    # Audit dosyasi yazildi mi?
    audit_path = _artifact_dir(workspace, job_id) / "publish_review_audit.json"
    assert audit_path.exists()
    audit = json.loads(audit_path.read_text())
    assert audit["run_mode"] == "full_auto"
    assert audit["allow_publish_without_review"] is True
    assert audit["publish_record_id"] is None


@pytest.mark.asyncio
async def test_publish_executor_missing_disclosure_fails(tmp_path):
    from app.jobs.exceptions import StepExecutionError

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_legal_metadata(workspace, job_id, disclosure_applied=False)

    executor = ProductReviewPublishStepExecutor(db=None)  # type: ignore[arg-type]
    job = _FakeJob(
        id=job_id,
        input_data={"run_mode": "semi_auto", "_settings_snapshot": {}},
        workspace=workspace,
    )
    with pytest.raises(StepExecutionError, match="affiliate_disclosure"):
        await executor.execute(job, _FakeStep())  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_publish_executor_delegates_to_core_when_record_exists(
    tmp_path, monkeypatch
):
    """publish_record_id varsa core PublishStepExecutor delegate edilir."""
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_legal_metadata(workspace, job_id)

    called = {"n": 0}

    async def fake_execute(self, job, step):  # type: ignore[override]
        called["n"] += 1
        return {
            "publish_record_id": "prec-xyz",
            "platform_video_id": "VID123",
            "platform_url": "https://example.com/w/VID123",
            "upload_completed": True,
            "activate_completed": True,
        }

    from app.publish.executor import PublishStepExecutor as _CorePub

    monkeypatch.setattr(_CorePub, "execute", fake_execute, raising=True)

    executor = ProductReviewPublishStepExecutor(db=None)  # type: ignore[arg-type]
    job = _FakeJob(
        id=job_id,
        input_data={
            "run_mode": "semi_auto",
            "publish_record_id": "prec-xyz",
            "_settings_snapshot": {},
        },
        workspace=workspace,
    )
    res = await executor.execute(job, _FakeStep())  # type: ignore[arg-type]
    assert called["n"] == 1
    assert res["module"] == "product_review"
    assert res["platform_video_id"] == "VID123"
    assert res["product_review_gate"]["publish_record_id"] == "prec-xyz"
    assert res["product_review_gate"]["affiliate_disclosure"] is True
    # Audit yine yazildi
    assert (_artifact_dir(workspace, job_id) / "publish_review_audit.json").exists()


# ---------------------------------------------------------------------------
# Executor class export (Faz F ile degisen public API)
# ---------------------------------------------------------------------------


def test_faz_f_executors_exported():
    from app.modules.product_review.executors import (
        ProductReviewTTSStepExecutor as T,
        ProductReviewSubtitleStepExecutor as S,
        ProductReviewRenderStepExecutor as R,
        ProductReviewPublishStepExecutor as P,
    )

    # Class imzalari: TTS registry, Subtitle registry, Render no-arg, Publish db
    assert T.__init__  # type: ignore[truthy-function]
    assert S.__init__  # type: ignore[truthy-function]
    assert R.__init__  # type: ignore[truthy-function]
    assert P.__init__  # type: ignore[truthy-function]


def test_faz_f_tts_wraps_standard_video_tts():
    from app.modules.standard_video.executors.tts import TTSStepExecutor

    executor = ProductReviewTTSStepExecutor(registry=None)  # type: ignore[arg-type]
    assert isinstance(executor._delegate, TTSStepExecutor)
    assert executor.step_key() == "tts"


def test_faz_f_render_wraps_standard_video_render():
    from app.modules.standard_video.executors.render import RenderStepExecutor

    executor = ProductReviewRenderStepExecutor()
    assert isinstance(executor._delegate, RenderStepExecutor)
    assert executor.step_key() == "render"
