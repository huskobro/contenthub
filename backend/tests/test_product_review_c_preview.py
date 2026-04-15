"""
Faz C smoke testleri — preview executors + style blueprint seed + Remotion
Root.tsx'de product_review composition kayitlari.

Bu testler gercek `npx remotion` subprocess'i cagirmaz; render call'i
monkeypatch ile success dondurur. Prop jenerasyonu, idempotency,
blueprint snapshot, ve artifact traceability dogrulanir.

Ek olarak:
- composition_map.PREVIEW_COMPOSITION_MAP ['ProductReviewPreviewFrame',
  'ProductReviewMini'] sahipligine sahip mi?
- renderer/src/Root.tsx icinde composition kayitlari var mi? (plain text)
- renderer/src/templates/product-review/components/scenes.tsx 10 scene
  icerir mi?
- product_review_v1 blueprint seed idempotent mi?
"""

from __future__ import annotations

import asyncio
import json
import pathlib
import uuid
from typing import Any

import pytest

from app.modules.product_review.blueprint_seed import (
    BLUEPRINT_NAME,
    MODULE_SCOPE,
    seed_product_review_blueprints,
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
from app.modules.standard_video.composition_map import (
    PREVIEW_COMPOSITION_MAP,
    get_preview_composition_id,
)


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
RENDERER_SRC = REPO_ROOT / "renderer" / "src"


class _FakeJob:
    def __init__(self, id: str, input_data: dict, workspace: str) -> None:
        self.id = id
        self.input_data_json = json.dumps(input_data, ensure_ascii=False)
        self.workspace_path = workspace


class _FakeStep:
    pass


# ---------------------------------------------------------------------------
# composition_map
# ---------------------------------------------------------------------------


def test_preview_composition_map_has_product_review_entries():
    assert PREVIEW_COMPOSITION_MAP["product_review_preview"] == "ProductReviewPreviewFrame"
    assert PREVIEW_COMPOSITION_MAP["product_review_mini"] == "ProductReviewMini"
    assert get_preview_composition_id("product_review_preview") == "ProductReviewPreviewFrame"
    assert get_preview_composition_id("product_review_mini") == "ProductReviewMini"


# ---------------------------------------------------------------------------
# Renderer side files present
# ---------------------------------------------------------------------------


def test_renderer_product_review_composition_files_exist():
    for rel in [
        "compositions/ProductReviewComposition.tsx",
        "compositions/ProductReviewPreviewFrame.tsx",
        "compositions/ProductReviewMini.tsx",
        "templates/product-review/shared/palette.ts",
        "templates/product-review/shared/types.ts",
        "templates/product-review/shared/chrome.tsx",
        "templates/product-review/components/scenes.tsx",
    ]:
        p = RENDERER_SRC / rel
        assert p.exists(), f"Eksik: {rel}"


def test_renderer_root_registers_three_product_review_compositions():
    root = (RENDERER_SRC / "Root.tsx").read_text(encoding="utf-8")
    for cid in ["ProductReview", "ProductReviewPreviewFrame", "ProductReviewMini"]:
        assert f'id="{cid}"' in root, f"Root.tsx composition kayit eksik: {cid}"


def test_scenes_file_defines_all_10_scene_components():
    scenes = (RENDERER_SRC / "templates/product-review/components/scenes.tsx").read_text(
        encoding="utf-8"
    )
    expected = [
        "IntroHookScene", "HeroCardScene", "PriceRevealScene",
        "FeatureCalloutScene", "SpecGridScene", "ComparisonRowScene",
        "SocialProofScene", "ProsConsScene", "VerdictCardScene",
        "CtaOutroScene",
    ]
    for name in expected:
        assert f"export function {name}" in scenes, f"Sahne bileseni eksik: {name}"
    for key in [
        "intro_hook", "hero_card", "price_reveal", "feature_callout",
        "spec_grid", "comparison_row", "social_proof", "pros_cons",
        "verdict_card", "cta_outro",
    ]:
        assert key in scenes, f"Sahne key string'i scenes.tsx icinde bulunamadi: {key}"


# ---------------------------------------------------------------------------
# Blueprint seeder idempotency
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_blueprint_seed_is_idempotent(db_session):
    first = await seed_product_review_blueprints(db_session)
    second = await seed_product_review_blueprints(db_session)
    assert first in (0, 1)
    # Ikinci cagrida asla yeni kayit olmamali
    assert second == 0

    # DB'de tek kayit olmali
    from sqlalchemy import select
    from app.db.models import StyleBlueprint

    res = await db_session.execute(
        select(StyleBlueprint).where(
            StyleBlueprint.name == BLUEPRINT_NAME,
            StyleBlueprint.module_scope == MODULE_SCOPE,
        )
    )
    rows = list(res.scalars().all())
    assert len(rows) == 1
    bp = rows[0]
    assert bp.status == "active"
    assert bp.version == 1
    for col in (
        "visual_rules_json", "motion_rules_json", "layout_rules_json",
        "subtitle_rules_json", "thumbnail_rules_json", "preview_strategy_json",
    ):
        val = getattr(bp, col)
        assert val, f"{col} bos olamaz"
        data = json.loads(val)
        assert isinstance(data, dict)

    prev = json.loads(bp.preview_strategy_json)
    assert prev["level_1"]["composition_id"] == "ProductReviewPreviewFrame"
    assert prev["level_2"]["composition_id"] == "ProductReviewMini"
    assert prev["level_3"]["composition_id"] == "ProductReview"


# ---------------------------------------------------------------------------
# preview_frame executor — happy path via monkeypatched subprocess
# ---------------------------------------------------------------------------


def _seed_job_artifacts(workspace: str, job_id: str) -> dict:
    scrape = {
        "products": [
            {
                "product_id": "P1",
                "name": "Preview Phone",
                "brand": "Acme",
                "price": 9999.0,
                "currency": "TRY",
                "image_url": "https://cdn.example.com/p1.jpg",
                "parser_source": "jsonld",
                "confidence": 0.92,
                "rating_value": 4.7,
                "rating_count": 1234,
                "availability": "in_stock",
            }
        ],
        "primary_product_id": "P1",
        "secondary_product_ids": [],
    }
    metadata = {
        "title": "Acme Preview Phone Inceleme",
        "description": "Test description. Affiliate disclosure.",
        "tags": ["acme", "preview", "phone"],
        "legal": {
            "disclosure_applied": True,
            "disclaimer_applied": True,
            "affiliate_enabled": False,
            "affiliate_url_included": False,
            "tos_checkbox_required": True,
        },
    }
    visuals = {
        "primary_image_url": "https://cdn.example.com/p1.jpg",
        "secondary_image_urls": [],
        "fallback_bg_color": "#050818",
    }
    _write_artifact(workspace, job_id, "product_scrape.json", scrape)
    _write_artifact(workspace, job_id, "product_metadata.json", metadata)
    _write_artifact(workspace, job_id, "product_visuals.json", visuals)
    return {"scrape": scrape, "metadata": metadata, "visuals": visuals}


@pytest.mark.asyncio
async def test_preview_frame_generates_props_and_artifact(tmp_path, monkeypatch):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_job_artifacts(workspace, job_id)

    async def fake_run(self: Any, *, props_path: str, output_path: str, job_id: str) -> dict:  # type: ignore[override]
        # subprocess yerine dosyayi kendimiz yaziyormus gibi tak
        pathlib.Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(output_path).write_bytes(b"\x89PNG\r\n\x1a\n")
        return {"success": True, "returncode": 0}

    monkeypatch.setattr(
        ProductReviewPreviewFrameExecutor,
        "_run_still",
        fake_run,
        raising=True,
    )

    input_data = {
        "template_type": "single",
        "primary_product_id": "P1",
        "orientation": "vertical",
        "language": "tr",
        "_settings_snapshot": {
            "product_review.legal.price_disclaimer_text": "Fiyatlar degisebilir.",
            "product_review.blueprint.tone": "electric",
            "product_review.preview.frame_scene_key": "hero_card",
        },
    }
    job = _FakeJob(id=job_id, input_data=input_data, workspace=workspace)
    step = _FakeStep()

    res = await ProductReviewPreviewFrameExecutor().execute(job, step)  # type: ignore[arg-type]
    assert res["status"] == "ok"
    assert res["composition_id"] == "ProductReviewPreviewFrame"
    assert res["scene_key"] == "hero_card"
    assert res["level"] == 1

    # Props dosyasi var mi + blueprint yansitilmis mi?
    props_path = _artifact_dir(workspace, job_id) / "preview_frame_props.json"
    assert props_path.exists()
    props = json.loads(props_path.read_text(encoding="utf-8"))
    assert props["scene_key"] == "hero_card"
    assert props["primary_product_id"] == "P1"
    assert props["orientation"] == "vertical"
    assert props["language"] == "tr"
    assert props["blueprint"]["blueprint_id"] == "product_review_v1"
    assert props["blueprint"]["tone"] == "electric"
    assert props["blueprint"]["priceDisclaimerText"] == "Fiyatlar degisebilir."

    # Artifact registry
    reg = json.loads((_artifact_dir(workspace, job_id) / "preview_frame.json").read_text())
    assert reg["blueprint_id"] == "product_review_v1"
    assert reg["blueprint_version"] == 1
    assert reg["level"] == 1


@pytest.mark.asyncio
async def test_preview_frame_idempotent(tmp_path, monkeypatch):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_job_artifacts(workspace, job_id)

    call_counter = {"n": 0}

    async def fake_run(self: Any, *, props_path: str, output_path: str, job_id: str) -> dict:  # type: ignore[override]
        call_counter["n"] += 1
        pathlib.Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(output_path).write_bytes(b"\x89PNG\r\n\x1a\n")
        return {"success": True, "returncode": 0}

    monkeypatch.setattr(
        ProductReviewPreviewFrameExecutor, "_run_still", fake_run, raising=True
    )

    input_data = {"primary_product_id": "P1", "_settings_snapshot": {}}
    job = _FakeJob(id=job_id, input_data=input_data, workspace=workspace)
    step = _FakeStep()
    ex = ProductReviewPreviewFrameExecutor()
    first = await ex.execute(job, step)  # type: ignore[arg-type]
    second = await ex.execute(job, step)  # type: ignore[arg-type]
    assert first["status"] == "ok"
    assert second["status"] == "skipped_idempotent"
    assert call_counter["n"] == 1


@pytest.mark.asyncio
async def test_preview_frame_requires_scrape(tmp_path):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    # scrape yok
    from app.jobs.exceptions import StepExecutionError

    job = _FakeJob(
        id=job_id,
        input_data={"primary_product_id": "P1", "_settings_snapshot": {}},
        workspace=workspace,
    )
    step = _FakeStep()
    with pytest.raises(StepExecutionError):
        await ProductReviewPreviewFrameExecutor().execute(job, step)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# preview_mini executor — happy path via monkeypatched subprocess
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_preview_mini_generates_mp4_props_and_artifact(tmp_path, monkeypatch):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_job_artifacts(workspace, job_id)

    async def fake_run(self: Any, *, props_path: str, output_path: str, job_id: str) -> dict:  # type: ignore[override]
        pathlib.Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(output_path).write_bytes(b"\x00\x00\x00\x20ftypmp42")
        return {"success": True, "returncode": 0}

    monkeypatch.setattr(
        ProductReviewPreviewMiniExecutor, "_run_media", fake_run, raising=True
    )

    input_data = {
        "template_type": "single",
        "primary_product_id": "P1",
        "orientation": "horizontal",
        "language": "tr",
        "_settings_snapshot": {"product_review.blueprint.tone": "gold"},
    }
    job = _FakeJob(id=job_id, input_data=input_data, workspace=workspace)
    step = _FakeStep()
    res = await ProductReviewPreviewMiniExecutor().execute(job, step)  # type: ignore[arg-type]
    assert res["status"] == "ok"
    assert res["composition_id"] == "ProductReviewMini"
    assert res["level"] == 2
    assert res["scenes"] == ["intro_hook", "hero_card", "price_reveal", "cta_outro"]
    assert res["duration_seconds"] == 10

    props = json.loads((_artifact_dir(workspace, job_id) / "preview_mini_props.json").read_text())
    assert props["orientation"] == "horizontal"
    assert props["blueprint"]["tone"] == "gold"
    assert len(props["scenes"]) == 4
    assert props["duration_seconds"] == 10

    reg = json.loads((_artifact_dir(workspace, job_id) / "preview_mini.json").read_text())
    assert reg["level"] == 2
    assert reg["blueprint_id"] == "product_review_v1"


@pytest.mark.asyncio
async def test_preview_mini_idempotent(tmp_path, monkeypatch):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _seed_job_artifacts(workspace, job_id)

    calls = {"n": 0}

    async def fake_run(self: Any, *, props_path: str, output_path: str, job_id: str) -> dict:  # type: ignore[override]
        calls["n"] += 1
        pathlib.Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(output_path).write_bytes(b"fake_mp4")
        return {"success": True, "returncode": 0}

    monkeypatch.setattr(
        ProductReviewPreviewMiniExecutor, "_run_media", fake_run, raising=True
    )

    input_data = {"primary_product_id": "P1", "_settings_snapshot": {}}
    job = _FakeJob(id=job_id, input_data=input_data, workspace=workspace)
    step = _FakeStep()
    ex = ProductReviewPreviewMiniExecutor()
    r1 = await ex.execute(job, step)  # type: ignore[arg-type]
    r2 = await ex.execute(job, step)  # type: ignore[arg-type]
    assert r1["status"] == "ok"
    assert r2["status"] == "skipped_idempotent"
    assert calls["n"] == 1


@pytest.mark.asyncio
async def test_preview_mini_requires_scrape(tmp_path):
    from app.jobs.exceptions import StepExecutionError

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    job = _FakeJob(
        id=job_id,
        input_data={"primary_product_id": "P1", "_settings_snapshot": {}},
        workspace=workspace,
    )
    step = _FakeStep()
    with pytest.raises(StepExecutionError):
        await ProductReviewPreviewMiniExecutor().execute(job, step)  # type: ignore[arg-type]
