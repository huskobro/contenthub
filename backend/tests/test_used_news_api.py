"""
Phase 29 Used News Registry API tests.

Covers:
  A) used_news_registry table exists after migration
  B) POST /used-news — create record
  C) GET /used-news — list records
  D) GET /used-news/{id} — get by id
  E) PATCH /used-news/{id} — partial update
  F) Missing required news_item_id → 422
  G) Missing required usage_type → 422
  H) Missing required target_module → 422
  I) Blank usage_type → 422
  J) Blank target_module on update → 422
  K) News item not found → 404 on create
  L) GET not found → 404
  M) PATCH not found → 404
  N) Filter by news_item_id
"""

import uuid
import sqlite3
import pytest
from httpx import AsyncClient

BASE = "/api/v1/used-news"
NEWS_BASE = "/api/v1/news-items"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _url() -> str:
    return f"https://example.com/news/{_uid()}"


async def _create_news_item(client: AsyncClient) -> str:
    resp = await client.post(
        NEWS_BASE,
        json={"title": f"Item {_uid()}", "url": _url(), "status": "new"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# A) Table exists
# ---------------------------------------------------------------------------

def test_used_news_registry_table_exists():
    from app.core.config import settings
    db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
    conn = sqlite3.connect(db_path)
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='used_news_registry'"
    )
    row = cur.fetchone()
    conn.close()
    assert row is not None, "used_news_registry table should exist after migration"


# ---------------------------------------------------------------------------
# B) Create record
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_used_news(client: AsyncClient):
    news_id = await _create_news_item(client)
    payload = {
        "news_item_id": news_id,
        "usage_type": "draft",
        "target_module": "news_bulletin",
        "usage_context": "Morning bulletin",
    }
    resp = await client.post(BASE, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["news_item_id"] == news_id
    assert data["usage_type"] == "draft"
    assert data["target_module"] == "news_bulletin"
    assert data["usage_context"] == "Morning bulletin"
    assert "id" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# C) List records
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_used_news(client: AsyncClient):
    news_id = await _create_news_item(client)
    await client.post(BASE, json={"news_item_id": news_id, "usage_type": "published", "target_module": "news_bulletin"})
    resp = await client.get(BASE)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


# ---------------------------------------------------------------------------
# D) Get by id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_used_news_by_id(client: AsyncClient):
    news_id = await _create_news_item(client)
    created = (await client.post(BASE, json={"news_item_id": news_id, "usage_type": "reserved", "target_module": "standard_video"})).json()
    resp = await client.get(f"{BASE}/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


# ---------------------------------------------------------------------------
# E) Update record
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_used_news(client: AsyncClient):
    news_id = await _create_news_item(client)
    created = (await client.post(BASE, json={"news_item_id": news_id, "usage_type": "draft", "target_module": "news_bulletin"})).json()
    resp = await client.patch(
        f"{BASE}/{created['id']}",
        json={"usage_type": "published", "notes": "Updated note"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["usage_type"] == "published"
    assert data["notes"] == "Updated note"


# ---------------------------------------------------------------------------
# F) Missing news_item_id → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_missing_news_item_id(client: AsyncClient):
    resp = await client.post(BASE, json={"usage_type": "draft", "target_module": "news_bulletin"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# G) Missing usage_type → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_missing_usage_type(client: AsyncClient):
    news_id = await _create_news_item(client)
    resp = await client.post(BASE, json={"news_item_id": news_id, "target_module": "news_bulletin"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# H) Missing target_module → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_missing_target_module(client: AsyncClient):
    news_id = await _create_news_item(client)
    resp = await client.post(BASE, json={"news_item_id": news_id, "usage_type": "draft"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# I) Blank usage_type → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_blank_usage_type(client: AsyncClient):
    news_id = await _create_news_item(client)
    resp = await client.post(BASE, json={"news_item_id": news_id, "usage_type": "  ", "target_module": "news_bulletin"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# J) Blank target_module on update → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_blank_target_module(client: AsyncClient):
    news_id = await _create_news_item(client)
    created = (await client.post(BASE, json={"news_item_id": news_id, "usage_type": "draft", "target_module": "news_bulletin"})).json()
    resp = await client.patch(f"{BASE}/{created['id']}", json={"target_module": "   "})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# K) News item not found → 404 on create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_news_item_not_found(client: AsyncClient):
    resp = await client.post(BASE, json={"news_item_id": uuid.uuid4().hex, "usage_type": "draft", "target_module": "news_bulletin"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# L) GET not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_used_news_not_found(client: AsyncClient):
    resp = await client.get(f"{BASE}/{uuid.uuid4().hex}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# M) PATCH not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_used_news_not_found(client: AsyncClient):
    resp = await client.patch(f"{BASE}/{uuid.uuid4().hex}", json={"usage_type": "published"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# N) Filter by news_item_id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_filter_by_news_item_id(client: AsyncClient):
    news_id = await _create_news_item(client)
    await client.post(BASE, json={"news_item_id": news_id, "usage_type": "draft", "target_module": "news_bulletin"})
    resp = await client.get(f"{BASE}?news_item_id={news_id}")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert all(item["news_item_id"] == news_id for item in items)
