"""
Phase 28 News Items API tests.

Covers:
  A) news_items table exists after migration
  B) POST /news-items — create news item
  C) GET /news-items — list items
  D) GET /news-items/{id} — get by id
  E) PATCH /news-items/{id} — partial update
  F) Missing required title → 422
  G) Missing required url → 422
  H) Blank title → 422
  I) Blank url → 422
  J) Blank status on update → 422
  K) GET not found → 404
  L) PATCH not found → 404
  M) Filter by status
  N) Filter by source_id
"""

import uuid
import sqlite3
import pytest
from httpx import AsyncClient

BASE = "/api/v1/news-items"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _url() -> str:
    return f"https://example.com/news/{_uid()}"


# ---------------------------------------------------------------------------
# A) Table exists
# ---------------------------------------------------------------------------

def test_news_items_table_exists():
    from app.core.config import settings
    db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
    conn = sqlite3.connect(db_path)
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='news_items'"
    )
    row = cur.fetchone()
    conn.close()
    assert row is not None, "news_items table should exist after migration"


# ---------------------------------------------------------------------------
# B) Create news item
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_news_item(client: AsyncClient):
    payload = {
        "title": f"Breaking News {_uid()}",
        "url": _url(),
        "status": "new",
        "language": "tr",
        "category": "general",
    }
    resp = await client.post(BASE, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == payload["title"]
    assert data["url"] == payload["url"]
    assert data["status"] == "new"
    assert "id" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# C) List items
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_news_items(client: AsyncClient):
    await client.post(BASE, json={"title": f"Item {_uid()}", "url": _url(), "status": "new"})
    resp = await client.get(BASE)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


# ---------------------------------------------------------------------------
# D) Get by id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_news_item_by_id(client: AsyncClient):
    created = (await client.post(BASE, json={"title": f"Detail {_uid()}", "url": _url(), "status": "new"})).json()
    resp = await client.get(f"{BASE}/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


# ---------------------------------------------------------------------------
# E) Update item
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_news_item(client: AsyncClient):
    created = (await client.post(BASE, json={"title": f"Update {_uid()}", "url": _url(), "status": "new"})).json()
    resp = await client.patch(
        f"{BASE}/{created['id']}",
        json={"status": "reviewed", "summary": "Short summary"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "reviewed"
    assert data["summary"] == "Short summary"


# ---------------------------------------------------------------------------
# F) Missing title → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_missing_title(client: AsyncClient):
    resp = await client.post(BASE, json={"url": _url(), "status": "new"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# G) Missing url → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_missing_url(client: AsyncClient):
    resp = await client.post(BASE, json={"title": "Some title", "status": "new"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# H) Blank title → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_blank_title(client: AsyncClient):
    resp = await client.post(BASE, json={"title": "   ", "url": _url(), "status": "new"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# I) Blank url → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_blank_url(client: AsyncClient):
    resp = await client.post(BASE, json={"title": "Some title", "url": "   ", "status": "new"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# J) Blank status on update → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_blank_status(client: AsyncClient):
    created = (await client.post(BASE, json={"title": f"Item {_uid()}", "url": _url(), "status": "new"})).json()
    resp = await client.patch(f"{BASE}/{created['id']}", json={"status": "  "})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# K) GET not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_news_item_not_found(client: AsyncClient):
    resp = await client.get(f"{BASE}/{uuid.uuid4().hex}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# L) PATCH not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_news_item_not_found(client: AsyncClient):
    resp = await client.patch(f"{BASE}/{uuid.uuid4().hex}", json={"status": "reviewed"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# M) Filter by status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_filter_by_status(client: AsyncClient):
    created = (await client.post(BASE, json={"title": f"Filter {_uid()}", "url": _url(), "status": "new"})).json()
    await client.patch(f"{BASE}/{created['id']}", json={"status": "used"})
    resp = await client.get(f"{BASE}?status=used")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert all(item["status"] == "used" for item in items)


# ---------------------------------------------------------------------------
# N) Filter by source_id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_filter_by_source_id(client: AsyncClient):
    sid = uuid.uuid4().hex
    await client.post(BASE, json={"title": f"Src Filter {_uid()}", "url": _url(), "status": "new", "source_id": sid})
    resp = await client.get(f"{BASE}?source_id={sid}")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert all(item["source_id"] == sid for item in items)
