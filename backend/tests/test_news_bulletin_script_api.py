"""
Phase 33 News Bulletin Script API tests.

Covers:
  A) news_bulletin_scripts table exists after migration
  B) POST /{id}/script — create script
  C) GET /{id}/script — get script
  D) PATCH /{id}/script — update script
  E) Blank content → 422 on create
  F) Blank content on update → 422
  G) POST /{id}/script on unknown bulletin → 404
  H) GET /{id}/script when no script exists → 404
  I) PATCH /{id}/script when no script exists → 404
"""

import uuid
import pytest
from httpx import AsyncClient

BULLETIN_BASE = "/api/v1/modules/news-bulletin"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


async def _create_bulletin(client: AsyncClient) -> str:
    resp = await client.post(BULLETIN_BASE, json={"topic": f"Bulletin {_uid()}"})
    assert resp.status_code == 201
    return resp.json()["id"]


def _script_url(bulletin_id: str) -> str:
    return f"{BULLETIN_BASE}/{bulletin_id}/script"


# ---------------------------------------------------------------------------
# A) Table exists
# ---------------------------------------------------------------------------

async def test_news_bulletin_scripts_table_exists(test_engine):
    from sqlalchemy import inspect

    async with test_engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names())
        )
    assert "news_bulletin_scripts" in tables, "news_bulletin_scripts table should exist after migration"


# ---------------------------------------------------------------------------
# B) Create script
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_bulletin_script(client: AsyncClient):
    bid = await _create_bulletin(client)
    payload = {
        "content": "Bugün teknoloji dünyasında...",
        "source_type": "manual",
        "generation_status": "draft",
    }
    resp = await client.post(_script_url(bid), json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["news_bulletin_id"] == bid
    assert data["content"] == payload["content"]
    assert data["source_type"] == "manual"
    assert data["generation_status"] == "draft"
    assert data["version"] == 1
    assert "id" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# C) Get script
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_bulletin_script(client: AsyncClient):
    bid = await _create_bulletin(client)
    await client.post(_script_url(bid), json={"content": "Script content here."})
    resp = await client.get(_script_url(bid))
    assert resp.status_code == 200
    assert resp.json()["news_bulletin_id"] == bid
    assert resp.json()["content"] == "Script content here."


# ---------------------------------------------------------------------------
# D) Update script
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_bulletin_script(client: AsyncClient):
    bid = await _create_bulletin(client)
    await client.post(_script_url(bid), json={"content": "Initial script."})
    resp = await client.patch(
        _script_url(bid),
        json={"content": "Updated script.", "generation_status": "ready"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["content"] == "Updated script."
    assert data["generation_status"] == "ready"


# ---------------------------------------------------------------------------
# E) Blank content → 422 on create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_blank_content(client: AsyncClient):
    bid = await _create_bulletin(client)
    resp = await client.post(_script_url(bid), json={"content": "   "})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# F) Blank content on update → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_blank_content(client: AsyncClient):
    bid = await _create_bulletin(client)
    await client.post(_script_url(bid), json={"content": "Some content."})
    resp = await client.patch(_script_url(bid), json={"content": "  "})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# G) POST on unknown bulletin → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_script_bulletin_not_found(client: AsyncClient):
    resp = await client.post(
        _script_url(uuid.uuid4().hex),
        json={"content": "Some content."},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# H) GET when no script exists → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_script_not_found(client: AsyncClient):
    bid = await _create_bulletin(client)
    resp = await client.get(_script_url(bid))
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# I) PATCH when no script exists → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_script_not_found(client: AsyncClient):
    bid = await _create_bulletin(client)
    resp = await client.patch(_script_url(bid), json={"content": "Updated."})
    assert resp.status_code == 404
