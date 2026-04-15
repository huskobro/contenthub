"""
Phase 26 Source Scans API tests.

Covers:
  A) source_scans table exists after migration
  B) POST /source-scans — create scan record
  C) GET /source-scans — list scans
  D) GET /source-scans/{id} — get by id
  E) PATCH /source-scans/{id} — partial update
  F) Missing required field → 422
  G) Invalid source_id → 404
  H) GET not found → 404
  I) PATCH not found → 404
  J) Filter by source_id
  K) Filter by status
  L) Negative result_count → 422
  M) Blank status on update → 422
"""

import uuid
import pytest
from httpx import AsyncClient

BASE = "/api/v1/source-scans"
SOURCES_BASE = "/api/v1/sources"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


async def _create_source(client: AsyncClient) -> str:
    """Helper: create a NewsSource and return its id."""
    payload = {
        "name": f"Test Source {_uid()}",
        "source_type": "rss",
        "feed_url": f"https://example.com/{_uid()}.xml",
    }
    resp = await client.post(SOURCES_BASE, json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# A) Table exists
# ---------------------------------------------------------------------------

async def test_source_scans_table_exists(test_engine):
    from sqlalchemy import inspect

    async with test_engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names())
        )
    assert "source_scans" in tables, "source_scans table should exist after migration"


# ---------------------------------------------------------------------------
# B) Create scan
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_scan(client: AsyncClient):
    source_id = await _create_source(client)
    payload = {
        "source_id": source_id,
        "scan_mode": "manual",
    }
    resp = await client.post(BASE, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["source_id"] == source_id
    assert data["scan_mode"] == "manual"
    assert data["status"] == "queued"
    assert "id" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# C) List scans
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_scans(client: AsyncClient):
    source_id = await _create_source(client)
    await client.post(BASE, json={"source_id": source_id, "scan_mode": "manual"})
    resp = await client.get(BASE)
    assert resp.status_code == 200
    # Gate Sources Closure — pagination envelope
    data = resp.json()
    assert isinstance(data, dict)
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert data["total"] >= 1


# ---------------------------------------------------------------------------
# D) Get by id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_scan_by_id(client: AsyncClient):
    source_id = await _create_source(client)
    created = (await client.post(BASE, json={"source_id": source_id, "scan_mode": "auto"})).json()
    resp = await client.get(f"{BASE}/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


# ---------------------------------------------------------------------------
# E) Update scan
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_scan(client: AsyncClient):
    source_id = await _create_source(client)
    created = (await client.post(BASE, json={"source_id": source_id, "scan_mode": "manual"})).json()
    resp = await client.patch(
        f"{BASE}/{created['id']}",
        json={"status": "completed", "result_count": 5, "notes": "done"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["result_count"] == 5
    assert data["notes"] == "done"


# ---------------------------------------------------------------------------
# F) Missing required field → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_scan_missing_source_id(client: AsyncClient):
    resp = await client.post(BASE, json={"scan_mode": "manual"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_scan_missing_scan_mode(client: AsyncClient):
    resp = await client.post(BASE, json={"source_id": "some-id"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# G) Invalid source_id → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_scan_invalid_source_id(client: AsyncClient):
    resp = await client.post(BASE, json={"source_id": uuid.uuid4().hex, "scan_mode": "manual"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# H) GET not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_scan_not_found(client: AsyncClient):
    resp = await client.get(f"{BASE}/{uuid.uuid4().hex}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# I) PATCH not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_scan_not_found(client: AsyncClient):
    resp = await client.patch(f"{BASE}/{uuid.uuid4().hex}", json={"status": "failed"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# J) Filter by source_id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_filter_by_source_id(client: AsyncClient):
    source_id = await _create_source(client)
    await client.post(BASE, json={"source_id": source_id, "scan_mode": "manual"})
    resp = await client.get(f"{BASE}?source_id={source_id}")
    assert resp.status_code == 200
    # Gate Sources Closure — pagination envelope
    items = resp.json()["items"]
    assert len(items) >= 1
    assert all(item["source_id"] == source_id for item in items)


# ---------------------------------------------------------------------------
# K) Filter by status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_filter_by_status(client: AsyncClient):
    source_id = await _create_source(client)
    created = (await client.post(BASE, json={"source_id": source_id, "scan_mode": "manual"})).json()
    await client.patch(f"{BASE}/{created['id']}", json={"status": "failed"})
    resp = await client.get(f"{BASE}?status=failed")
    assert resp.status_code == 200
    # Gate Sources Closure — pagination envelope
    items = resp.json()["items"]
    assert len(items) >= 1
    assert all(item["status"] == "failed" for item in items)


# ---------------------------------------------------------------------------
# L) Negative result_count → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_negative_result_count(client: AsyncClient):
    source_id = await _create_source(client)
    created = (await client.post(BASE, json={"source_id": source_id, "scan_mode": "manual"})).json()
    resp = await client.patch(f"{BASE}/{created['id']}", json={"result_count": -1})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# M) Blank status on update → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_blank_status_on_update(client: AsyncClient):
    source_id = await _create_source(client)
    created = (await client.post(BASE, json={"source_id": source_id, "scan_mode": "manual"})).json()
    resp = await client.patch(f"{BASE}/{created['id']}", json={"status": "   "})
    assert resp.status_code == 422
