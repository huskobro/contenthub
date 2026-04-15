"""
Faz D testleri — 3 template branch (single / comparison / alternatives).

Kapsam:
  - Per-template service validation (create_product_review)
  - script.py template branching (scene_key'ler Remotion scenes.tsx ile ayni)
  - composition.py template branching (products/primary/secondary/blueprint
    props'ta mevcut)
  - metadata.py template branching (title + tags template'e gore degisir)
  - narration dolu + product_refs dogru

Tum testler subprocess cagirmaz; deterministic executor + artifact olusturma.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

import pytest

from app.modules.product_review.executors._helpers import (
    _artifact_dir,
    _write_artifact,
)
from app.modules.product_review.executors.composition import (
    ProductReviewCompositionStepExecutor,
)
from app.modules.product_review.executors.metadata import (
    ProductReviewMetadataStepExecutor,
)
from app.modules.product_review.executors.script import (
    ProductReviewScriptStepExecutor,
)
from app.modules.product_review.executors.visuals import (
    ProductReviewVisualsStepExecutor,
)


class _FakeJob:
    def __init__(self, id: str, input_data: dict, workspace: str) -> None:
        self.id = id
        self.input_data_json = json.dumps(input_data, ensure_ascii=False)
        self.workspace_path = workspace


class _FakeStep:
    pass


# ---------------------------------------------------------------------------
# Scrape fixtures (3 varyant)
# ---------------------------------------------------------------------------


def _scrape_single() -> dict:
    return {
        "products": [
            {
                "product_id": "P-SINGLE",
                "name": "Apple iPhone 15 Pro",
                "brand": "Apple",
                "price": 54999.0,
                "currency": "TRY",
                "image_url": "https://cdn.example.com/iphone15.jpg",
                "rating_value": 4.6,
                "rating_count": 1234,
                "parser_source": "jsonld",
                "confidence": 0.95,
                "availability": "in_stock",
            }
        ],
        "primary_product_id": "P-SINGLE",
        "secondary_product_ids": [],
    }


def _scrape_comparison() -> dict:
    return {
        "products": [
            {
                "product_id": "P-A",
                "name": "Apple iPhone 15 Pro",
                "brand": "Apple",
                "price": 54999.0,
                "currency": "TRY",
                "image_url": "https://cdn.example.com/iphone15.jpg",
                "parser_source": "jsonld",
                "confidence": 0.95,
            },
            {
                "product_id": "P-B",
                "name": "Samsung Galaxy S24 Ultra",
                "brand": "Samsung",
                "price": 62999.0,
                "currency": "TRY",
                "image_url": "https://cdn.example.com/s24.jpg",
                "parser_source": "jsonld",
                "confidence": 0.93,
            },
        ],
        "primary_product_id": "P-A",
        "secondary_product_ids": ["P-B"],
    }


def _scrape_alternatives() -> dict:
    return {
        "products": [
            {
                "product_id": "P-MAIN",
                "name": "Sony WH-1000XM5",
                "brand": "Sony",
                "price": 13499.0,
                "currency": "TRY",
                "image_url": "https://cdn.example.com/sony-xm5.jpg",
                "parser_source": "jsonld",
                "confidence": 0.95,
            },
            {
                "product_id": "P-ALT1",
                "name": "Bose QuietComfort Ultra",
                "brand": "Bose",
                "price": 15999.0,
                "currency": "TRY",
                "image_url": "https://cdn.example.com/bose-qc.jpg",
                "parser_source": "jsonld",
                "confidence": 0.90,
            },
            {
                "product_id": "P-ALT2",
                "name": "Sennheiser Momentum 4",
                "brand": "Sennheiser",
                "price": 11999.0,
                "currency": "TRY",
                "image_url": "https://cdn.example.com/sen-m4.jpg",
                "parser_source": "jsonld",
                "confidence": 0.88,
            },
        ],
        "primary_product_id": "P-MAIN",
        "secondary_product_ids": ["P-ALT1", "P-ALT2"],
    }


# ---------------------------------------------------------------------------
# script.py template branching
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_single_template_script_has_expected_scenes(tmp_path):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _write_artifact(workspace, job_id, "product_scrape.json", _scrape_single())

    job = _FakeJob(
        id=job_id,
        input_data={
            "template_type": "single",
            "primary_product_id": "P-SINGLE",
            "language": "tr",
            "orientation": "vertical",
            "duration_seconds": 60,
        },
        workspace=workspace,
    )
    res = await ProductReviewScriptStepExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]
    assert res["status"] == "ok"
    assert res["template_type"] == "single"
    assert res["scenes_count"] == 8

    data = json.loads(open(res["artifact_path"]).read())
    keys = [s["scene_key"] for s in data["scenes"]]
    assert keys == [
        "intro_hook", "hero_card", "price_reveal", "feature_callout",
        "spec_grid", "social_proof", "pros_cons", "cta_outro",
    ]
    # Tum narration'lar dolu olmali
    assert all(s["narration"] for s in data["scenes"])
    # product_refs single icin primary id olmali
    assert all(s["product_refs"] == ["P-SINGLE"] for s in data["scenes"])
    # Duration topi 60000 ms
    assert sum(s["duration_ms"] for s in data["scenes"]) == 60_000


@pytest.mark.asyncio
async def test_comparison_template_script_uses_comparison_row_scenes(tmp_path):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _write_artifact(workspace, job_id, "product_scrape.json", _scrape_comparison())

    job = _FakeJob(
        id=job_id,
        input_data={
            "template_type": "comparison",
            "primary_product_id": "P-A",
            "secondary_product_ids": ["P-B"],
            "language": "tr",
            "orientation": "vertical",
            "duration_seconds": 80,
        },
        workspace=workspace,
    )
    res = await ProductReviewScriptStepExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]
    assert res["status"] == "ok"
    assert res["template_type"] == "comparison"
    data = json.loads(open(res["artifact_path"]).read())
    keys = [s["scene_key"] for s in data["scenes"]]
    # comparison planinda comparison_row + verdict_card zorunlu
    assert "comparison_row" in keys
    assert "verdict_card" in keys
    # comparison_row sahnesinde iki product_ref olmali
    cmp_row = next(s for s in data["scenes"] if s["scene_key"] == "comparison_row")
    assert set(cmp_row["product_refs"]) == {"P-A", "P-B"}
    # Narration'lar dolu
    assert all(s["narration"] for s in data["scenes"])


@pytest.mark.asyncio
async def test_alternatives_template_script_has_two_comparison_rows(tmp_path):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _write_artifact(workspace, job_id, "product_scrape.json", _scrape_alternatives())

    job = _FakeJob(
        id=job_id,
        input_data={
            "template_type": "alternatives",
            "primary_product_id": "P-MAIN",
            "secondary_product_ids": ["P-ALT1", "P-ALT2"],
            "language": "tr",
            "orientation": "vertical",
            "duration_seconds": 90,
        },
        workspace=workspace,
    )
    res = await ProductReviewScriptStepExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]
    assert res["status"] == "ok"
    assert res["template_type"] == "alternatives"
    data = json.loads(open(res["artifact_path"]).read())
    keys = [s["scene_key"] for s in data["scenes"]]
    assert keys.count("comparison_row") == 2, keys
    # Ilk comparison_row -> alt1, ikinci -> alt2
    cmp_rows = [s for s in data["scenes"] if s["scene_key"] == "comparison_row"]
    assert set(cmp_rows[0]["product_refs"]) == {"P-MAIN", "P-ALT1"}
    assert set(cmp_rows[1]["product_refs"]) == {"P-MAIN", "P-ALT2"}
    # verdict_card her 3 urunu referanslar
    verdict = next(s for s in data["scenes"] if s["scene_key"] == "verdict_card")
    assert set(verdict["product_refs"]) == {"P-MAIN", "P-ALT1", "P-ALT2"}


@pytest.mark.asyncio
async def test_comparison_template_requires_at_least_two_products(tmp_path):
    """Executor fail-fast: scrape'te sadece 1 urun varsa comparison hata verir."""
    from app.jobs.exceptions import StepExecutionError

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _write_artifact(workspace, job_id, "product_scrape.json", _scrape_single())

    job = _FakeJob(
        id=job_id,
        input_data={
            "template_type": "comparison",
            "primary_product_id": "P-SINGLE",
            "language": "tr",
            "duration_seconds": 60,
        },
        workspace=workspace,
    )
    with pytest.raises(StepExecutionError):
        await ProductReviewScriptStepExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_alternatives_template_requires_at_least_three_products(tmp_path):
    from app.jobs.exceptions import StepExecutionError

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _write_artifact(
        workspace,
        job_id,
        "product_scrape.json",
        _scrape_comparison(),  # sadece 2 urun
    )

    job = _FakeJob(
        id=job_id,
        input_data={
            "template_type": "alternatives",
            "primary_product_id": "P-A",
            "secondary_product_ids": ["P-B"],
            "language": "tr",
            "duration_seconds": 60,
        },
        workspace=workspace,
    )
    with pytest.raises(StepExecutionError):
        await ProductReviewScriptStepExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# metadata.py template branching
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_comparison_metadata_title_contains_vs(tmp_path):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _write_artifact(workspace, job_id, "product_scrape.json", _scrape_comparison())

    job = _FakeJob(
        id=job_id,
        input_data={
            "template_type": "comparison",
            "primary_product_id": "P-A",
            "secondary_product_ids": ["P-B"],
            "language": "tr",
            "orientation": "vertical",
            "_settings_snapshot": {},
        },
        workspace=workspace,
    )
    res = await ProductReviewMetadataStepExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]
    assert res["status"] == "ok"
    data = json.loads(open(res["artifact_path"]).read())
    assert "vs" in data["title"].lower()
    assert "iphone 15 pro" in data["title"].lower()
    assert "samsung galaxy s24 ultra" in data["title"].lower()
    # Tag'lerde her iki marka olmali
    tag_set = {t.lower() for t in data["tags"]}
    assert "apple" in tag_set
    assert "samsung" in tag_set
    assert "karsilastirma" in tag_set or "comparison" in tag_set


@pytest.mark.asyncio
async def test_alternatives_metadata_tags_include_all_brands(tmp_path):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _write_artifact(workspace, job_id, "product_scrape.json", _scrape_alternatives())

    job = _FakeJob(
        id=job_id,
        input_data={
            "template_type": "alternatives",
            "primary_product_id": "P-MAIN",
            "secondary_product_ids": ["P-ALT1", "P-ALT2"],
            "language": "tr",
            "orientation": "vertical",
            "_settings_snapshot": {},
        },
        workspace=workspace,
    )
    res = await ProductReviewMetadataStepExecutor().execute(job, _FakeStep())  # type: ignore[arg-type]
    assert res["status"] == "ok"
    data = json.loads(open(res["artifact_path"]).read())
    # Title "alternatif" icermeli
    assert (
        "alternatif" in data["title"].lower()
        or "alternatives" in data["title"].lower()
    )
    # Tum 3 marka tag olmali
    tag_set = {t.lower() for t in data["tags"]}
    assert "sony" in tag_set
    assert "bose" in tag_set
    assert "sennheiser" in tag_set
    # Description alt urun adlarini icermeli
    assert "bose" in data["description"].lower()
    assert "sennheiser" in data["description"].lower()


# ---------------------------------------------------------------------------
# composition.py template branching
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_composition_contains_products_and_blueprint(tmp_path):
    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    _write_artifact(workspace, job_id, "product_scrape.json", _scrape_comparison())

    input_data = {
        "template_type": "comparison",
        "primary_product_id": "P-A",
        "secondary_product_ids": ["P-B"],
        "language": "tr",
        "orientation": "vertical",
        "duration_seconds": 80,
        "_settings_snapshot": {
            "product_review.blueprint.tone": "crimson",
            "product_review.legal.price_disclaimer_text": "Fiyatlar degisebilir.",
        },
    }
    job = _FakeJob(id=job_id, input_data=input_data, workspace=workspace)
    step = _FakeStep()

    await ProductReviewScriptStepExecutor().execute(job, step)  # type: ignore[arg-type]
    await ProductReviewMetadataStepExecutor().execute(job, step)  # type: ignore[arg-type]
    await ProductReviewVisualsStepExecutor().execute(job, step)  # type: ignore[arg-type]
    comp_res = await ProductReviewCompositionStepExecutor().execute(job, step)  # type: ignore[arg-type]
    assert comp_res["status"] == "ok"
    assert comp_res["composition_id"] == "ProductReview"
    assert comp_res["template_type"] == "comparison"

    data = json.loads(open(comp_res["artifact_path"]).read())
    props = data["props"]
    assert props["template_type"] == "comparison"
    assert props["primary_product_id"] == "P-A"
    assert props["secondary_product_ids"] == ["P-B"]
    assert len(props["products"]) == 2
    assert props["blueprint"]["blueprint_id"] == "product_review_v1"
    assert props["blueprint"]["version"] == 1
    assert props["blueprint"]["tone"] == "crimson"
    assert props["blueprint"]["priceDisclaimerText"] == "Fiyatlar degisebilir."
    # Scene key'ler comparison planindan
    keys = [s["scene_key"] for s in props["scenes"]]
    assert "comparison_row" in keys
    assert "verdict_card" in keys


# ---------------------------------------------------------------------------
# service.py per-template validation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_service_single_ignores_secondaries(db_session):
    """single template'de secondary_product_ids verilirse servis temizler."""
    from app.modules.product_review import schemas, service

    # Primary olarak bir product olustur
    p = await service.create_product(
        db_session,
        schemas.ProductCreate(
            source_url="https://shop.example.com/single-ignore",
            name="Test Single",
            is_test_data=True,
        ),
    )
    prod = p[0]

    # Secondary icin var olmayan id'ler verilirse bile single temizler (ignore eder)
    created = await service.create_product_review(
        db_session,
        schemas.ProductReviewCreate(
            topic="Test single ignores secondaries",
            template_type="single",
            primary_product_id=prod.id,
            secondary_product_ids=["does-not-exist-id"],
            is_test_data=True,
        ),
    )
    assert created.template_type == "single"
    # Temizlenmis olmali (var olmayanlar kontrol edilmemeli cunku silindi)
    assert json.loads(created.secondary_product_ids_json) == []


@pytest.mark.asyncio
async def test_service_comparison_requires_one_secondary(db_session):
    from app.modules.product_review import schemas, service

    p = await service.create_product(
        db_session,
        schemas.ProductCreate(
            source_url="https://shop.example.com/cmp-a",
            name="Cmp A",
            is_test_data=True,
        ),
    )
    prod = p[0]

    with pytest.raises(ValueError, match="comparison template en az 2"):
        await service.create_product_review(
            db_session,
            schemas.ProductReviewCreate(
                topic="Test comparison fails",
                template_type="comparison",
                primary_product_id=prod.id,
                secondary_product_ids=[],  # bos -> hata
                is_test_data=True,
            ),
        )


@pytest.mark.asyncio
async def test_service_alternatives_requires_two_secondaries(db_session):
    from app.modules.product_review import schemas, service

    p = await service.create_product(
        db_session,
        schemas.ProductCreate(
            source_url="https://shop.example.com/alt-main",
            name="Alt Main",
            is_test_data=True,
        ),
    )
    prod = p[0]
    p2 = await service.create_product(
        db_session,
        schemas.ProductCreate(
            source_url="https://shop.example.com/alt-2",
            name="Alt 2",
            is_test_data=True,
        ),
    )

    with pytest.raises(ValueError, match="alternatives template en az 3"):
        await service.create_product_review(
            db_session,
            schemas.ProductReviewCreate(
                topic="Test alternatives fails",
                template_type="alternatives",
                primary_product_id=prod.id,
                secondary_product_ids=[p2[0].id],  # sadece 1 -> hata
                is_test_data=True,
            ),
        )


@pytest.mark.asyncio
async def test_service_rejects_primary_in_secondary_list(db_session):
    """primary_product_id secondary'nin icinde olamaz (duplicate guard)."""
    from app.modules.product_review import schemas, service

    p = await service.create_product(
        db_session,
        schemas.ProductCreate(
            source_url="https://shop.example.com/dup-guard",
            name="Dup Guard",
            is_test_data=True,
        ),
    )
    prod = p[0]

    with pytest.raises(ValueError, match="primary_product_id, secondary"):
        await service.create_product_review(
            db_session,
            schemas.ProductReviewCreate(
                topic="Dup guard",
                template_type="comparison",
                primary_product_id=prod.id,
                secondary_product_ids=[prod.id],
                is_test_data=True,
            ),
        )


@pytest.mark.asyncio
async def test_service_alternatives_happy_path(db_session):
    from app.modules.product_review import schemas, service

    main = await service.create_product(
        db_session,
        schemas.ProductCreate(
            source_url="https://shop.example.com/alt-h-main",
            name="AltH Main",
            is_test_data=True,
        ),
    )
    alt1 = await service.create_product(
        db_session,
        schemas.ProductCreate(
            source_url="https://shop.example.com/alt-h-1",
            name="AltH 1",
            is_test_data=True,
        ),
    )
    alt2 = await service.create_product(
        db_session,
        schemas.ProductCreate(
            source_url="https://shop.example.com/alt-h-2",
            name="AltH 2",
            is_test_data=True,
        ),
    )

    created = await service.create_product_review(
        db_session,
        schemas.ProductReviewCreate(
            topic="Alternatives happy",
            template_type="alternatives",
            primary_product_id=main[0].id,
            secondary_product_ids=[alt1[0].id, alt2[0].id],
            is_test_data=True,
        ),
    )
    assert created.template_type == "alternatives"
    assert json.loads(created.secondary_product_ids_json) == [alt1[0].id, alt2[0].id]
