"""
Phase 23 News Sources API tests.

Covers:
  A) news_sources table exists after migration
  B) POST /sources — create RSS source
  C) POST /sources — create manual_url source
  D) POST /sources — create api source
  E) GET /sources  — list sources
  F) GET /sources/{id} — get by id
  G) PATCH /sources/{id} — partial update
  H) Missing required field → 422
  I) Blank name → 422
  J) RSS without feed_url → 422
  K) manual_url without base_url → 422
  L) api without api_endpoint → 422
  M) GET not found → 404
  N) PATCH not found → 404
  O) Filter by source_type
"""

import uuid
import pytest
from httpx import AsyncClient

BASE = "/api/v1/sources"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


# ---------------------------------------------------------------------------
# A) Table exists
# ---------------------------------------------------------------------------

async def test_news_sources_table_exists(test_engine):
    from sqlalchemy import inspect

    async with test_engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names())
        )
    assert "news_sources" in tables, "news_sources table should exist after migration"


# ---------------------------------------------------------------------------
# B) Create RSS source
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_rss_source(client: AsyncClient):
    payload = {
        "name": f"RSS Source {_uid()}",
        "source_type": "rss",
        "feed_url": "https://example.com/feed.xml",
        "status": "active",
        "language": "tr",
        "category": "tech",
    }
    resp = await client.post(BASE, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["source_type"] == "rss"
    assert data["feed_url"] == "https://example.com/feed.xml"
    assert "id" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# C) Create manual_url source
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_manual_url_source(client: AsyncClient):
    payload = {
        "name": f"Manual Source {_uid()}",
        "source_type": "manual_url",
        "base_url": "https://example.com",
        "status": "active",
    }
    resp = await client.post(BASE, json=payload)
    assert resp.status_code == 201
    assert resp.json()["source_type"] == "manual_url"
    assert resp.json()["base_url"] == "https://example.com"


# ---------------------------------------------------------------------------
# D) Create api source
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_api_source(client: AsyncClient):
    payload = {
        "name": f"API Source {_uid()}",
        "source_type": "api",
        "api_endpoint": "https://api.example.com/news",
        "status": "active",
        "trust_level": "high",
    }
    resp = await client.post(BASE, json=payload)
    assert resp.status_code == 201
    assert resp.json()["source_type"] == "api"
    assert resp.json()["api_endpoint"] == "https://api.example.com/news"


# ---------------------------------------------------------------------------
# E) List sources
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_sources(client: AsyncClient):
    payload = {"name": f"List Test {_uid()}", "source_type": "rss", "feed_url": "https://x.com/f.xml"}
    await client.post(BASE, json=payload)
    resp = await client.get(BASE)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


# ---------------------------------------------------------------------------
# F) Get by id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_source_by_id(client: AsyncClient):
    payload = {"name": f"Detail Test {_uid()}", "source_type": "manual_url", "base_url": "https://x.com"}
    created = (await client.post(BASE, json=payload)).json()
    resp = await client.get(f"{BASE}/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


# ---------------------------------------------------------------------------
# G) Update source
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_source(client: AsyncClient):
    payload = {"name": f"Update Test {_uid()}", "source_type": "rss", "feed_url": "https://x.com/f.xml"}
    created = (await client.post(BASE, json=payload)).json()
    resp = await client.patch(
        f"{BASE}/{created['id']}",
        json={"status": "paused", "notes": "paused for now"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "paused"
    assert resp.json()["notes"] == "paused for now"


# ---------------------------------------------------------------------------
# H) Missing required field → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_source_missing_required(client: AsyncClient):
    resp = await client.post(BASE, json={})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# I) Blank name → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_source_blank_name(client: AsyncClient):
    resp = await client.post(BASE, json={"name": "   ", "source_type": "rss", "feed_url": "https://x.com/f.xml"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# J) RSS without feed_url → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_rss_without_feed_url(client: AsyncClient):
    resp = await client.post(BASE, json={"name": "No Feed", "source_type": "rss"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# K) manual_url without base_url → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_manual_url_without_base_url(client: AsyncClient):
    resp = await client.post(BASE, json={"name": "No Base", "source_type": "manual_url"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# L) api without api_endpoint → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_api_without_endpoint(client: AsyncClient):
    resp = await client.post(BASE, json={"name": "No Endpoint", "source_type": "api"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# M) GET not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_source_not_found(client: AsyncClient):
    resp = await client.get(f"{BASE}/{uuid.uuid4().hex}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# N) PATCH not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_source_not_found(client: AsyncClient):
    resp = await client.patch(f"{BASE}/{uuid.uuid4().hex}", json={"status": "paused"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# O) Filter by source_type
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_filter_by_source_type(client: AsyncClient):
    unique_feed = f"https://unique{_uid()}.com/feed.xml"
    payload = {"name": f"Filter Test {_uid()}", "source_type": "rss", "feed_url": unique_feed}
    await client.post(BASE, json=payload)
    resp = await client.get(f"{BASE}?source_type=rss")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert all(item["source_type"] == "rss" for item in items)
