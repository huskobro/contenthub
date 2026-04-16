"""
Faz B integration testleri — Products + ProductReviews CRUD API + executor
chain (deterministik v0: script, metadata, visuals, composition).

In-memory DB uzerinde FastAPI TestClient (conftest'teki `client`) + JWT
admin header ile calisir.
"""

from __future__ import annotations

import json
from pathlib import Path
import os
import tempfile
import uuid
from typing import Optional

import pytest
from sqlalchemy import select

from app.db.models import Product, ProductReview, ProductSnapshot


# ---------------------------------------------------------------------------
# Products CRUD
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_post_product_creates_with_canonical_url(client, admin_headers):
    r = await client.post(
        "/api/v1/product-review/products",
        headers=admin_headers,
        json={
            "source_url": "https://www.amazon.com.tr/dp/B08XL2KZ?tag=affX&ref=srY",
            "name": "Test Urun 1",
            "is_test_data": True,
        },
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["source_url"].startswith("https://www.amazon.com.tr/")
    assert data["canonical_url"] == "https://www.amazon.com.tr/dp/B08XL2KZ"
    assert data["name"] == "Test Urun 1"
    assert data["is_test_data"] is True


@pytest.mark.asyncio
async def test_post_product_idempotent_on_same_canonical(client, admin_headers):
    url1 = "https://shop.example.com/p/abc?utm_source=fb&ref=tag1"
    url2 = "https://shop.example.com/p/abc?utm_campaign=x&gclid=y"
    r1 = await client.post(
        "/api/v1/product-review/products",
        headers=admin_headers,
        json={"source_url": url1, "name": "Same Product", "is_test_data": True},
    )
    assert r1.status_code == 201
    r2 = await client.post(
        "/api/v1/product-review/products",
        headers=admin_headers,
        json={"source_url": url2, "name": "Same Product TRY2", "is_test_data": True},
    )
    assert r2.status_code == 201
    # ayni canonical → ayni id donulur (idempotent)
    assert r1.json()["id"] == r2.json()["id"]
    # ikinci POST yeni kayit yaratmadi → name override yok
    assert r2.json()["name"] == "Same Product"


@pytest.mark.asyncio
async def test_get_product_list_and_detail(client, admin_headers):
    # Seed
    r = await client.post(
        "/api/v1/product-review/products",
        headers=admin_headers,
        json={
            "source_url": "https://shop.example.com/p/list-test-1",
            "name": "List Test A",
            "is_test_data": True,
        },
    )
    pid = r.json()["id"]

    list_r = await client.get(
        "/api/v1/product-review/products?include_test_data=true",
        headers=admin_headers,
    )
    assert list_r.status_code == 200
    data = list_r.json()
    assert data["total"] >= 1
    assert any(item["id"] == pid for item in data["items"])

    detail_r = await client.get(
        f"/api/v1/product-review/products/{pid}",
        headers=admin_headers,
    )
    assert detail_r.status_code == 200
    assert detail_r.json()["id"] == pid


@pytest.mark.asyncio
async def test_get_product_404(client, admin_headers):
    r = await client.get(
        "/api/v1/product-review/products/does-not-exist",
        headers=admin_headers,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_post_product_rejects_non_http(client, admin_headers):
    r = await client.post(
        "/api/v1/product-review/products",
        headers=admin_headers,
        json={"source_url": "ftp://example.com/p", "name": "X"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_scrape_endpoint_rejects_ssrf(client, admin_headers):
    """Scrape trigger SSRF guard — localhost host reddedilir."""
    # Bir product yarat (localhost URL — yaratma valid, scrape fail)
    r = await client.post(
        "/api/v1/product-review/products",
        headers=admin_headers,
        json={
            "source_url": "http://localhost/fake-product",
            "name": "SSRF target",
            "is_test_data": True,
        },
    )
    pid = r.json()["id"]
    scrape = await client.post(
        f"/api/v1/product-review/products/{pid}/scrape",
        headers=admin_headers,
    )
    assert scrape.status_code == 200
    body = scrape.json()
    assert body["status"] == "failed"
    assert "ssrf_blocked" in (body["error"] or "")


# ---------------------------------------------------------------------------
# ProductReviews CRUD
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_product_review_create_requires_existing_primary(client, admin_headers):
    r = await client.post(
        "/api/v1/product-review/product-reviews",
        headers=admin_headers,
        json={
            "topic": "Boş primary testi",
            "template_type": "single",
            "primary_product_id": "nonexistent-id",
        },
    )
    assert r.status_code == 400
    assert "primary_product_id" in r.text


@pytest.mark.asyncio
async def test_product_review_create_ok(client, admin_headers):
    # Primary product
    p = await client.post(
        "/api/v1/product-review/products",
        headers=admin_headers,
        json={
            "source_url": "https://shop.example.com/p/review-1",
            "name": "Review Primary",
            "is_test_data": True,
        },
    )
    pid = p.json()["id"]

    r = await client.post(
        "/api/v1/product-review/product-reviews",
        headers=admin_headers,
        json={
            "topic": "Review Primary inceleme",
            "template_type": "single",
            "primary_product_id": pid,
            "run_mode": "semi_auto",
            "language": "tr",
            "orientation": "vertical",
            "duration_seconds": 60,
            "is_test_data": True,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["template_type"] == "single"
    assert body["primary_product_id"] == pid
    assert body["affiliate_enabled"] is False
    assert body["orientation"] == "vertical"


# ---------------------------------------------------------------------------
# Executor chain — deterministic v0 (script → metadata → visuals → composition)
# ---------------------------------------------------------------------------


class _FakeJob:
    """Minimal duck-typed Job — executor'lar sadece .id, .input_data_json,
    .workspace_path kullaniyor."""

    def __init__(self, id: str, input_data: dict, workspace: str) -> None:
        self.id = id
        self.input_data_json = json.dumps(input_data, ensure_ascii=False)
        self.workspace_path = workspace


class _FakeStep:
    pass


@pytest.mark.asyncio
async def test_executor_chain_script_metadata_visuals_composition(tmp_path):
    """
    Scrape artifact'ini elle yaz → script → metadata → visuals → composition
    akisini calistir. Son composition artifact'i composition_id='ProductReview'
    ve beklenen props ile donulmeli.
    """
    from app.modules.product_review.executors._helpers import _write_artifact
    from app.modules.product_review.executors.script import (
        ProductReviewScriptStepExecutor,
    )
    from app.modules.product_review.executors.metadata import (
        ProductReviewMetadataStepExecutor,
    )
    from app.modules.product_review.executors.visuals import (
        ProductReviewVisualsStepExecutor,
    )
    from app.modules.product_review.executors.composition import (
        ProductReviewCompositionStepExecutor,
    )

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    # Manual scrape artifact — single product with image & price
    scrape = {
        "products": [
            {
                "product_id": "P-1",
                "name": "Apple iPhone 15 Pro",
                "brand": "Apple",
                "price": 54999.0,
                "currency": "TRY",
                "image_url": "https://cdn.example.com/iphone15.jpg",
                "parser_source": "jsonld",
                "confidence": 0.9,
            }
        ],
        "primary_product_id": "P-1",
        "secondary_product_ids": [],
        "min_confidence": 0.5,
    }
    _write_artifact(workspace, job_id, "product_scrape.json", scrape)

    input_data = {
        "template_type": "single",
        "primary_product_id": "P-1",
        "language": "tr",
        "orientation": "vertical",
        "duration_seconds": 60,
        "affiliate_enabled": False,
        "_settings_snapshot": {
            "product_review.legal.affiliate_disclosure_text": (
                "Test disclosure affiliate metni — kaldirilamaz, "
                "description'a eklenir."
            ),
            "product_review.legal.price_disclaimer_text": (
                "Fiyatlar video kayit anina aittir; degisebilir."
            ),
            "product_review.legal.tos_checkbox_required": True,
        },
    }
    job = _FakeJob(id=job_id, input_data=input_data, workspace=workspace)
    step = _FakeStep()

    # 1. Script
    # Faz D: single template 8-sahne plani kullanir (intro_hook, hero_card,
    # price_reveal, feature_callout, spec_grid, social_proof, pros_cons, cta_outro)
    script_res = await ProductReviewScriptStepExecutor().execute(job, step)  # type: ignore[arg-type]
    assert script_res["status"] == "ok"
    assert script_res["scenes_count"] == 8

    script_json = json.loads(Path(script_res["artifact_path"]).read_text())
    assert script_json["template_type"] == "single"
    assert script_json["language"] == "tr"
    assert len(script_json["scenes"]) == 8
    # Toplam sure 60s olmali (60 * 1000 = 60000 ms)
    total_ms = sum(s["duration_ms"] for s in script_json["scenes"])
    assert total_ms == 60_000
    # Scene key'ler scenes.tsx paketiyle ayni olmali
    expected_single_keys = {
        "intro_hook", "hero_card", "price_reveal", "feature_callout",
        "spec_grid", "social_proof", "pros_cons", "cta_outro",
    }
    assert {s["scene_key"] for s in script_json["scenes"]} == expected_single_keys

    # 2. Metadata
    meta_res = await ProductReviewMetadataStepExecutor().execute(job, step)  # type: ignore[arg-type]
    assert meta_res["status"] == "ok"
    meta_json = json.loads(Path(meta_res["artifact_path"]).read_text())
    # Title + disclosure + disclaimer zorunlu
    assert "Inceleme" in meta_json["title"] or "Review" in meta_json["title"]
    assert "Test disclosure affiliate metni" in meta_json["description"]
    assert "Fiyatlar video kayit anina" in meta_json["description"]
    assert meta_json["legal"]["disclosure_applied"] is True
    assert meta_json["legal"]["disclaimer_applied"] is True
    assert meta_json["legal"]["tos_checkbox_required"] is True
    assert "apple" in meta_json["tags"]

    # 3. Visuals
    vis_res = await ProductReviewVisualsStepExecutor().execute(job, step)  # type: ignore[arg-type]
    assert vis_res["status"] == "ok"
    vis_json = json.loads(Path(vis_res["artifact_path"]).read_text())
    assert vis_json["primary_image_url"] == "https://cdn.example.com/iphone15.jpg"

    # 4. Composition
    comp_res = await ProductReviewCompositionStepExecutor().execute(job, step)  # type: ignore[arg-type]
    assert comp_res["status"] == "ok"
    assert comp_res["composition_id"] == "ProductReview"
    assert comp_res["width"] == 1080
    assert comp_res["height"] == 1920
    assert comp_res["fps"] == 30
    assert comp_res["duration_frames"] == 60 * 30

    comp_json = json.loads(Path(comp_res["artifact_path"]).read_text())
    assert comp_json["composition_id"] == "ProductReview"
    assert comp_json["props"]["visuals"]["primary_image_url"] == (
        "https://cdn.example.com/iphone15.jpg"
    )
    assert len(comp_json["props"]["scenes"]) == 8
    assert comp_json["props"]["metadata"]["legal"]["disclosure_applied"] is True
    # Faz D: composition props artik products/primary/secondary/blueprint da icerir
    assert comp_json["props"]["template_type"] == "single"
    assert comp_json["props"]["primary_product_id"] == "P-1"
    assert comp_json["props"]["secondary_product_ids"] == []
    assert comp_json["props"]["blueprint"]["blueprint_id"] == "product_review_v1"
    assert comp_json["props"]["blueprint"]["version"] == 1
    assert len(comp_json["props"]["products"]) == 1


@pytest.mark.asyncio
async def test_visuals_fails_without_primary_image(tmp_path):
    """Primary product image_url yoksa visuals hata verir (deterministic fallback yok)."""
    from app.modules.product_review.executors._helpers import _write_artifact
    from app.modules.product_review.executors.visuals import (
        ProductReviewVisualsStepExecutor,
    )
    from app.jobs.exceptions import StepExecutionError

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    scrape = {"products": [{"product_id": "P-nox", "name": "X", "image_url": None}]}
    _write_artifact(workspace, job_id, "product_scrape.json", scrape)

    job = _FakeJob(
        id=job_id,
        input_data={"template_type": "single"},
        workspace=workspace,
    )
    step = _FakeStep()
    with pytest.raises(StepExecutionError) as excinfo:
        await ProductReviewVisualsStepExecutor().execute(job, step)  # type: ignore[arg-type]
    assert "gorsel" in str(excinfo.value).lower() or "image" in str(excinfo.value).lower()


@pytest.mark.asyncio
async def test_metadata_injects_legal_from_settings_defaults(tmp_path):
    """Settings snapshot bossa default TR metinleri kullanilir."""
    from app.modules.product_review.executors._helpers import _write_artifact
    from app.modules.product_review.executors.metadata import (
        ProductReviewMetadataStepExecutor,
    )

    workspace = str(tmp_path)
    job_id = uuid.uuid4().hex
    scrape = {
        "products": [
            {
                "product_id": "P-d",
                "name": "Default Test Product",
                "price": 100.0,
                "currency": "TRY",
                "image_url": "https://x.com/y.jpg",
            }
        ]
    }
    _write_artifact(workspace, job_id, "product_scrape.json", scrape)

    job = _FakeJob(
        id=job_id,
        input_data={
            "template_type": "single",
            "language": "tr",
            "_settings_snapshot": {},  # bos
        },
        workspace=workspace,
    )
    step = _FakeStep()
    res = await ProductReviewMetadataStepExecutor().execute(job, step)  # type: ignore[arg-type]
    assert res["status"] == "ok"
    meta = json.loads(Path(res["artifact_path"]).read_text())
    # Default TR disclosure metni kaldirilamaz — kontrolu:
    assert "affiliate" in meta["description"].lower()
    assert meta["legal"]["disclosure_applied"] is True
