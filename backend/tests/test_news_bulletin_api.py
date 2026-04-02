"""
Phase 30 News Bulletin API tests.

Covers:
  A) news_bulletins table exists after migration
  B) POST /modules/news-bulletin — create bulletin
  C) GET /modules/news-bulletin — list bulletins
  D) GET /modules/news-bulletin/{id} — get by id
  E) PATCH /modules/news-bulletin/{id} — partial update
  F) Missing required topic → 422
  G) Blank topic → 422
  H) Blank topic on update → 422
  I) Negative target_duration_seconds → 422
  J) GET not found → 404
  K) PATCH not found → 404
"""

import uuid
import sqlite3
import pytest
from httpx import AsyncClient

BASE = "/api/v1/modules/news-bulletin"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


# ---------------------------------------------------------------------------
# A) Table exists
# ---------------------------------------------------------------------------

def test_news_bulletins_table_exists():
    from app.core.config import settings
    db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
    conn = sqlite3.connect(db_path)
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='news_bulletins'"
    )
    row = cur.fetchone()
    conn.close()
    assert row is not None, "news_bulletins table should exist after migration"


# ---------------------------------------------------------------------------
# B) Create bulletin
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_news_bulletin(client: AsyncClient):
    payload = {
        "topic": f"Daily Tech Bulletin {_uid()}",
        "language": "tr",
        "tone": "formal",
        "bulletin_style": "studio",
        "source_mode": "manual",
        "target_duration_seconds": 120,
    }
    resp = await client.post(BASE, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["topic"] == payload["topic"]
    assert data["status"] == "draft"
    assert data["target_duration_seconds"] == 120
    assert "id" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# C) List bulletins
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_news_bulletins(client: AsyncClient):
    await client.post(BASE, json={"topic": f"Bulletin {_uid()}"})
    resp = await client.get(BASE)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


# ---------------------------------------------------------------------------
# D) Get by id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_news_bulletin_by_id(client: AsyncClient):
    created = (await client.post(BASE, json={"topic": f"Detail {_uid()}"})).json()
    resp = await client.get(f"{BASE}/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


# ---------------------------------------------------------------------------
# E) Update bulletin
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_news_bulletin(client: AsyncClient):
    created = (await client.post(BASE, json={"topic": f"Update {_uid()}"})).json()
    resp = await client.patch(
        f"{BASE}/{created['id']}",
        json={"status": "in_progress", "brief": "Focus on tech news"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "in_progress"
    assert data["brief"] == "Focus on tech news"


# ---------------------------------------------------------------------------
# F) Missing topic → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_missing_topic(client: AsyncClient):
    resp = await client.post(BASE, json={"language": "tr"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# G) Blank topic on create → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_blank_topic(client: AsyncClient):
    resp = await client.post(BASE, json={"topic": "   "})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# H) Blank topic on update → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_blank_topic(client: AsyncClient):
    created = (await client.post(BASE, json={"topic": f"Item {_uid()}"})).json()
    resp = await client.patch(f"{BASE}/{created['id']}", json={"topic": "  "})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# I) Negative target_duration_seconds → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_negative_duration(client: AsyncClient):
    resp = await client.post(BASE, json={"topic": f"Bulletin {_uid()}", "target_duration_seconds": -10})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# J) GET not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_news_bulletin_not_found(client: AsyncClient):
    resp = await client.get(f"{BASE}/{uuid.uuid4().hex}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# K) PATCH not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_news_bulletin_not_found(client: AsyncClient):
    resp = await client.patch(f"{BASE}/{uuid.uuid4().hex}", json={"status": "done"})
    assert resp.status_code == 404
