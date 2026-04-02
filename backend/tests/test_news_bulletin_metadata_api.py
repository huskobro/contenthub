"""
Phase 34 News Bulletin Metadata API tests.

Covers:
  A) news_bulletin_metadata table exists after migration
  B) POST /{id}/metadata — create metadata
  C) GET /{id}/metadata — get metadata
  D) PATCH /{id}/metadata — update metadata
  E) POST /{id}/metadata on unknown bulletin → 404
  F) GET /{id}/metadata when no metadata exists → 404
  G) PATCH /{id}/metadata when no metadata exists → 404
"""

import uuid
import sqlite3
import pytest
from httpx import AsyncClient

BULLETIN_BASE = "/api/v1/modules/news-bulletin"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


async def _create_bulletin(client: AsyncClient) -> str:
    resp = await client.post(BULLETIN_BASE, json={"topic": f"Bulletin {_uid()}"})
    assert resp.status_code == 201
    return resp.json()["id"]


def _meta_url(bulletin_id: str) -> str:
    return f"{BULLETIN_BASE}/{bulletin_id}/metadata"


# ---------------------------------------------------------------------------
# A) Table exists
# ---------------------------------------------------------------------------

def test_news_bulletin_metadata_table_exists():
    from app.core.config import settings
    db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
    conn = sqlite3.connect(db_path)
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='news_bulletin_metadata'"
    )
    row = cur.fetchone()
    conn.close()
    assert row is not None, "news_bulletin_metadata table should exist after migration"


# ---------------------------------------------------------------------------
# B) Create metadata
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_bulletin_metadata(client: AsyncClient):
    bid = await _create_bulletin(client)
    payload = {
        "title": "Tech Bülteni Başlık",
        "description": "Günün teknoloji haberleri.",
        "tags_json": '["tech","ai"]',
        "category": "news",
        "language": "tr",
        "source_type": "manual",
        "generation_status": "draft",
    }
    resp = await client.post(_meta_url(bid), json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["news_bulletin_id"] == bid
    assert data["title"] == "Tech Bülteni Başlık"
    assert data["description"] == "Günün teknoloji haberleri."
    assert data["category"] == "news"
    assert data["version"] == 1
    assert data["generation_status"] == "draft"
    assert "id" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# C) Get metadata
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_bulletin_metadata(client: AsyncClient):
    bid = await _create_bulletin(client)
    await client.post(_meta_url(bid), json={"title": "Meta title", "language": "en"})
    resp = await client.get(_meta_url(bid))
    assert resp.status_code == 200
    assert resp.json()["news_bulletin_id"] == bid
    assert resp.json()["title"] == "Meta title"


# ---------------------------------------------------------------------------
# D) Update metadata
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_bulletin_metadata(client: AsyncClient):
    bid = await _create_bulletin(client)
    await client.post(_meta_url(bid), json={"title": "Initial title"})
    resp = await client.patch(
        _meta_url(bid),
        json={"title": "Updated title", "generation_status": "ready"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Updated title"
    assert data["generation_status"] == "ready"


# ---------------------------------------------------------------------------
# E) POST on unknown bulletin → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_metadata_bulletin_not_found(client: AsyncClient):
    resp = await client.post(
        _meta_url(uuid.uuid4().hex),
        json={"title": "Some title"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# F) GET when no metadata exists → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_metadata_not_found(client: AsyncClient):
    bid = await _create_bulletin(client)
    resp = await client.get(_meta_url(bid))
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# G) PATCH when no metadata exists → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_metadata_not_found(client: AsyncClient):
    bid = await _create_bulletin(client)
    resp = await client.patch(_meta_url(bid), json={"title": "Updated"})
    assert resp.status_code == 404
