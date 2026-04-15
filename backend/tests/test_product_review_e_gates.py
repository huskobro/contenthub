"""
Faz E testleri — data_confidence + run_mode gate kararlari.

Kapsam:
  - confidence.compute_data_confidence formulu (dolu vs yarim vs bos veri)
  - confidence.aggregate_confidence (multiple products)
  - confidence.gate_decision kararlari (semi_auto / full_auto + threshold)
  - preview_frame + preview_mini: full_auto + low_confidence -> block
  - preview_frame + preview_mini: semi_auto -> izin + gate kaydi
  - preview_frame + preview_mini: full_auto + high_confidence -> izin + gate kaydi
  - product_scrape artifact'inde data_confidence + primary_data_confidence yazili
    (scrape executor'u dogrudan calismadan artifact'i taklit ederek test
    edilir; executor pathi zaten Faz B testlerde).
"""

from __future__ import annotations

import json
import pathlib
import uuid
from typing import Any

import pytest

from app.modules.product_review.confidence import (
    aggregate_confidence,
    compute_data_confidence,
    gate_decision,
    resolve_setting,
    DEFAULTS,
)
from app.modules.product_review.executors._helpers import (
    _artifact_dir,
    _write_artifact,
)
from app.modules.product_review.executors.preview_frame import (
    ProductReviewPreviewFrameExecutor,
)
from app.modules.product_review.executors.preview_mini import (
    ProductReviewPreviewMiniExecutor,
)


class _FakeJob:
    def __init__(self, id: str, input_data: dict, workspace: str) -> None:
        self.id = id
        self.input_data_json = json.dumps(input_data, ensure_ascii=False)
        self.workspace_path = workspace


class _FakeStep:
    pass


# ---------------------------------------------------------------------------
# compute_data_confidence + aggregate_confidence
# ---------------------------------------------------------------------------


def test_full_product_yields_high_confidence():
    product = {
        "product_id": "P1",
        "name": "Full Product",
        "brand": "BrandX",
        "price": 999.0,
        "currency": "TRY",
        "image_url": "https://cdn.example.com/p1.jpg",
        "confidence": 1.0,
        "rating_value": 4.8,
        "rating_count": 200,
    }
    score = compute_data_confidence(product)
    # 0.45 + 0.20 + 0.15 + 0.10 + 0.05 + 0.05 = 1.00
    assert score == 1.0


def test_partial_product_yields_mid_confidence():
    product = {
        "product_id": "P2",
        "name": "Partial",
        "brand": None,
        "price": None,
        "image_url": "https://x.com/y.jpg",
        "confidence": 0.5,
    }
    score = compute_data_confidence(product)
    # 0.45*0.5 + 0.20 + 0.15 = 0.225 + 0.35 = 0.575
    assert 0.5 <= score <= 0.65


def test_empty_product_yields_zero_confidence():
    assert compute_data_confidence({}) == 0.0
    assert compute_data_confidence({"confidence": 0.1}) == pytest.approx(
        0.045, abs=1e-4
    )


def test_aggregate_confidence_average():
    products = [
        {"name": "A", "confidence": 1.0, "image_url": "x", "price": 1.0,
         "brand": "B", "rating_value": 4.5, "rating_count": 100},
        {},
    ]
    agg = aggregate_confidence(products)
    # (1.0 + 0.0) / 2 = 0.5
    assert agg == 0.5


def test_aggregate_confidence_empty_is_zero():
    assert aggregate_confidence([]) == 0.0


# ---------------------------------------------------------------------------
# gate_decision
# ---------------------------------------------------------------------------


def test_gate_semi_auto_never_blocks():
    d = gate_decision(
        run_mode="semi_auto",
        data_confidence=0.1,
        settings_snapshot=None,
    )
    assert d["run_mode"] == "semi_auto"
    assert d["should_block"] is False
    assert d["full_auto_allowed"] is False
    assert d["preview_l1_required"] is True
    assert d["preview_l2_required"] is True
    assert d["allow_publish_without_review"] is False


def test_gate_full_auto_above_threshold_allowed():
    d = gate_decision(
        run_mode="full_auto",
        data_confidence=0.85,
        settings_snapshot={},  # default 0.75
    )
    assert d["confidence_met"] is True
    assert d["full_auto_allowed"] is True
    assert d["should_block"] is False
    assert "full_auto gecerli" in d["reason"]


def test_gate_full_auto_below_threshold_blocks():
    d = gate_decision(
        run_mode="full_auto",
        data_confidence=0.50,
        settings_snapshot={},
    )
    assert d["confidence_met"] is False
    assert d["full_auto_allowed"] is False
    assert d["should_block"] is True
    assert "bloklandi" in d["reason"]


def test_gate_respects_custom_threshold_in_snapshot():
    d = gate_decision(
        run_mode="full_auto",
        data_confidence=0.60,
        settings_snapshot={"product_review.full_auto.min_confidence": 0.50},
    )
    assert d["confidence_met"] is True
    assert d["should_block"] is False


def test_gate_unknown_run_mode_defaults_semi_auto():
    d = gate_decision(
        run_mode="rogue",
        data_confidence=0.0,
        settings_snapshot=None,
    )
    assert d["run_mode"] == "semi_auto"
    assert d["should_block"] is False


def test_gate_publish_without_review_reads_snapshot():
    d = gate_decision(
        run_mode="full_auto",
        data_confidence=0.9,
        settings_snapshot={
            "product_review.full_auto.allow_publish_without_review": True,
        },
    )
    assert d["allow_publish_without_review"] is True


def test_resolve_setting_falls_back_to_defaults():
    assert (
        resolve_setting(None, "product_review.full_auto.min_confidence")
        == DEFAULTS["product_review.full_auto.min_confidence"]
    )
    assert (
        resolve_setting({}, "product_review.gate.preview_l1_required")
        == DEFAULTS["product_review.gate.preview_l1_required"]
    )


# ---------------------------------------------------------------------------
# preview executor gate
# ---------------------------------------------------------------------------


def _seed_job_artifacts(
    workspace: str, job_id: str, *, confidence: float = 0.95
) -> dict:
    scrape = {
        "products": [
            {
                "product_id": "PE",
                "name": "Gate Test Product",
                "brand": "BrandE",
                "price": 1999.0,
                "currency": "TRY",
                "image_url": "https://cdn.example.com/pe.jpg",
                "parser_source": "jsonld",
                "confidence": confidence,
                "rating_value": 4.6,
                "rating_count": 250,
                "availability": "in_stock",
            }
        ],
        "primary_product_id": "PE",
        "secondary_product_ids": [],
        "data_confidence": aggregate_confidence(
            [
                {
                    "name": "Gate Test Product",
                    "brand": "BrandE",
                    "price": 1999.0,
                    "image_url": "https://cdn.example.com/pe.jpg",
                    "confidence": confidence,
                    "rating_value": 4.6,
                    "rating_count": 250,
                }
            ]
        ),
    }
    metadata = {
        "title": "Gate Test",
        "description": "desc",
        "tags": ["brande", "gate"],
        "legal": {
            "disclosure_applied": True,
            "disclaimer_applied": True,
            "affiliate_enabled": False,
            "affiliate_url_included": False,
            "tos_checkbox_required": True,
        },
    }
    visuals = {
        "primary_image_url": "https://cdn.example.com/pe.jpg",
        "secondary_image_urls": [],
        "fallback_bg_color": "#050818",
    }
    _write_artifact(workspace, job_id, "product_scrape.json", scrape)
    _write_artifact(workspace, job_id, "product_metadata.json", metadata)
    _write_artifact(workspace, job_id, "product_visuals.json", visuals)
    return scrape


@pytest.mark.asyncio
async def test_preview_frame_full_auto_low_confidence_blocks(tmp_path, monkeypatch):
    """full_auto + low scrape_confidence -> StepExecutionError 'bloklandi'."""
    from app.jobs.exceptions import StepExecutionError

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    # scrape confidence = 0.2 -> data_confidence cok dusuk (esik 0.75).
    _seed_job_artifacts(workspace, job_id, confidence=0.20)

    called = {"n": 0}

    async def fake_run(*args, **kwargs):
        called["n"] += 1
        return {"success": True, "returncode": 0}

    monkeypatch.setattr(
        ProductReviewPreviewFrameExecutor, "_run_still", fake_run, raising=True
    )

    input_data = {
        "primary_product_id": "PE",
        "run_mode": "full_auto",
        "_settings_snapshot": {},
    }
    job = _FakeJob(id=job_id, input_data=input_data, workspace=workspace)
    with pytest.raises(StepExecutionError, match="bloklandi"):
        await ProductReviewPreviewFrameExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]
    assert called["n"] == 0  # subprocess hic cagrilmamali


@pytest.mark.asyncio
async def test_preview_frame_full_auto_high_confidence_allowed(tmp_path, monkeypatch):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_job_artifacts(workspace, job_id, confidence=1.0)

    async def fake_run(self: Any, *, props_path: str, output_path: str, job_id: str) -> dict:
        pathlib.Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(output_path).write_bytes(b"\x89PNG\r\n\x1a\n")
        return {"success": True, "returncode": 0}

    monkeypatch.setattr(
        ProductReviewPreviewFrameExecutor, "_run_still", fake_run, raising=True
    )

    input_data = {
        "primary_product_id": "PE",
        "run_mode": "full_auto",
        "_settings_snapshot": {},
    }
    job = _FakeJob(id=job_id, input_data=input_data, workspace=workspace)
    res = await ProductReviewPreviewFrameExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]
    assert res["status"] == "ok"
    assert res["gate"]["run_mode"] == "full_auto"
    assert res["gate"]["full_auto_allowed"] is True
    assert res["gate"]["should_block"] is False
    # preview_frame.json registry'de gate yazili
    reg = json.loads(
        (_artifact_dir(workspace, job_id) / "preview_frame.json").read_text()
    )
    assert reg["gate"]["full_auto_allowed"] is True


@pytest.mark.asyncio
async def test_preview_frame_semi_auto_low_confidence_allowed(tmp_path, monkeypatch):
    """semi_auto ASLA bloklamaz — dusuk confidence olsa bile operator isterse calisir."""
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_job_artifacts(workspace, job_id, confidence=0.10)

    async def fake_run(self: Any, **kwargs) -> dict:
        pathlib.Path(kwargs["output_path"]).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(kwargs["output_path"]).write_bytes(b"\x89PNG\r\n\x1a\n")
        return {"success": True, "returncode": 0}

    monkeypatch.setattr(
        ProductReviewPreviewFrameExecutor, "_run_still", fake_run, raising=True
    )

    input_data = {
        "primary_product_id": "PE",
        "run_mode": "semi_auto",
        "_settings_snapshot": {},
    }
    job = _FakeJob(id=job_id, input_data=input_data, workspace=workspace)
    res = await ProductReviewPreviewFrameExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]
    assert res["status"] == "ok"
    assert res["gate"]["run_mode"] == "semi_auto"
    assert res["gate"]["should_block"] is False


@pytest.mark.asyncio
async def test_preview_mini_full_auto_low_confidence_blocks(tmp_path, monkeypatch):
    from app.jobs.exceptions import StepExecutionError

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_job_artifacts(workspace, job_id, confidence=0.15)

    called = {"n": 0}

    async def fake_run(*args, **kwargs):
        called["n"] += 1
        return {"success": True, "returncode": 0}

    monkeypatch.setattr(
        ProductReviewPreviewMiniExecutor, "_run_media", fake_run, raising=True
    )

    input_data = {
        "primary_product_id": "PE",
        "run_mode": "full_auto",
        "_settings_snapshot": {},
    }
    job = _FakeJob(id=job_id, input_data=input_data, workspace=workspace)
    with pytest.raises(StepExecutionError, match="bloklandi"):
        await ProductReviewPreviewMiniExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]
    assert called["n"] == 0


@pytest.mark.asyncio
async def test_preview_mini_full_auto_custom_threshold_allowed(tmp_path, monkeypatch):
    """full_auto + threshold 0.40 -> confidence 0.55 gecer."""
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_job_artifacts(workspace, job_id, confidence=0.60)  # low-ish

    async def fake_run(self: Any, **kwargs) -> dict:
        pathlib.Path(kwargs["output_path"]).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(kwargs["output_path"]).write_bytes(b"fakemp4")
        return {"success": True, "returncode": 0}

    monkeypatch.setattr(
        ProductReviewPreviewMiniExecutor, "_run_media", fake_run, raising=True
    )

    input_data = {
        "primary_product_id": "PE",
        "run_mode": "full_auto",
        "_settings_snapshot": {
            "product_review.full_auto.min_confidence": 0.40,
        },
    }
    job = _FakeJob(id=job_id, input_data=input_data, workspace=workspace)
    res = await ProductReviewPreviewMiniExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]
    assert res["status"] == "ok"
    assert res["gate"]["min_confidence"] == 0.40
    assert res["gate"]["full_auto_allowed"] is True
    reg = json.loads(
        (_artifact_dir(workspace, job_id) / "preview_mini.json").read_text()
    )
    assert reg["gate"]["min_confidence"] == 0.40


# ---------------------------------------------------------------------------
# product_scrape artifact'inde data_confidence yazili mi? (yapay artifact)
# ---------------------------------------------------------------------------


def test_scrape_artifact_expected_shape_with_data_confidence():
    """product_scrape.py'in artifact formati: data_confidence + primary_data_confidence keyleri var."""
    fake_artifact = {
        "products": [
            {"product_id": "X", "name": "X", "image_url": "a", "confidence": 1.0,
             "price": 10.0, "brand": "B"},
        ],
        "failures": [],
        "primary_product_id": "X",
        "secondary_product_ids": [],
        "min_confidence": 0.5,
        "data_confidence": aggregate_confidence(
            [{"name": "X", "image_url": "a", "confidence": 1.0, "price": 10.0, "brand": "B"}]
        ),
        "primary_data_confidence": compute_data_confidence(
            {"name": "X", "image_url": "a", "confidence": 1.0, "price": 10.0, "brand": "B"}
        ),
    }
    assert fake_artifact["data_confidence"] > 0.8
    assert fake_artifact["primary_data_confidence"] > 0.8
