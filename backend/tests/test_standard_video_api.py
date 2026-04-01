"""
Phase 11 Standard Video API tests.

Covers:
  A) standard_videos table exists after migration
  B) POST /modules/standard-video — create a record
  C) GET /modules/standard-video  — list records
  D) GET /modules/standard-video/{id} — fetch single record
  E) PATCH /modules/standard-video/{id} — partial update
  F) Invalid payload rejected (missing topic)
  G) 404 on unknown id
  H) Negative target_duration_seconds rejected
"""

import pytest
from httpx import AsyncClient

BASE = "/api/v1/modules/standard-video"


def _payload(**overrides) -> dict:
    base = {
        "topic": "Yapay Zeka ve Gelecek",
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# A) Table existence
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_standard_videos_table_exists():
    from sqlalchemy import inspect
    from app.db.session import engine

    async with engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names())
        )
    assert "standard_videos" in tables


# ---------------------------------------------------------------------------
# B) Create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_standard_video(client: AsyncClient):
    response = await client.post(BASE, json=_payload(title="Test Video", language="tr"))
    assert response.status_code == 201
    body = response.json()
    assert body["topic"] == "Yapay Zeka ve Gelecek"
    assert body["title"] == "Test Video"
    assert body["language"] == "tr"
    assert body["status"] == "draft"
    assert "id" in body
    assert "created_at" in body


# ---------------------------------------------------------------------------
# C) List
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_standard_videos(client: AsyncClient):
    await client.post(BASE, json=_payload())
    response = await client.get(BASE)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) >= 1


# ---------------------------------------------------------------------------
# D) Get by id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_standard_video_by_id(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload(tone="formal"))
    item_id = create_resp.json()["id"]
    response = await client.get(f"{BASE}/{item_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == item_id
    assert body["tone"] == "formal"


# ---------------------------------------------------------------------------
# E) Partial update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_patch_standard_video(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload())
    item_id = create_resp.json()["id"]
    response = await client.patch(f"{BASE}/{item_id}", json={"status": "ready", "language": "en"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["language"] == "en"
    # topic unchanged
    assert body["topic"] == "Yapay Zeka ve Gelecek"


# ---------------------------------------------------------------------------
# F) Missing required field rejected
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_standard_video_missing_topic_rejected(client: AsyncClient):
    response = await client.post(BASE, json={"title": "No topic here"})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# G) 404 on unknown id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_standard_video_not_found(client: AsyncClient):
    response = await client.get(f"{BASE}/nonexistent-id-xyz")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# H) Negative target_duration_seconds rejected
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_standard_video_negative_duration_rejected(client: AsyncClient):
    response = await client.post(BASE, json=_payload(target_duration_seconds=-60))
    assert response.status_code == 422
