"""
Phase 12 Standard Video Script API tests.

Covers:
  A) standard_video_scripts table exists after migration
  B) POST /{id}/script — create a script
  C) GET /{id}/script  — fetch the script
  D) PATCH /{id}/script — update the script
  E) Standard video not found → 404 on script create
  F) Script not found → 404 on GET when no script exists
  G) Blank content rejected on create
  H) Blank content rejected on update
"""

import pytest
from httpx import AsyncClient

BASE_VIDEO = "/api/v1/modules/standard-video"


async def _create_video(client: AsyncClient) -> str:
    resp = await client.post(BASE_VIDEO, json={"topic": "Script test topic"})
    assert resp.status_code == 201
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# A) Table existence
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_standard_video_scripts_table_exists(test_engine):
    from sqlalchemy import inspect

    async with test_engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names())
        )
    assert "standard_video_scripts" in tables


# ---------------------------------------------------------------------------
# B) Create script
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_script(client: AsyncClient):
    video_id = await _create_video(client)
    response = await client.post(
        f"{BASE_VIDEO}/{video_id}/script",
        json={"content": "Bu bir test scriptidir.", "source_type": "manual"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["standard_video_id"] == video_id
    assert body["content"] == "Bu bir test scriptidir."
    assert body["source_type"] == "manual"
    assert body["generation_status"] == "draft"
    assert body["version"] == 1
    assert "id" in body


# ---------------------------------------------------------------------------
# C) Get script
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_script(client: AsyncClient):
    video_id = await _create_video(client)
    await client.post(
        f"{BASE_VIDEO}/{video_id}/script",
        json={"content": "Script içeriği"},
    )
    response = await client.get(f"{BASE_VIDEO}/{video_id}/script")
    assert response.status_code == 200
    assert response.json()["content"] == "Script içeriği"


# ---------------------------------------------------------------------------
# D) Update script
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_script(client: AsyncClient):
    video_id = await _create_video(client)
    await client.post(f"{BASE_VIDEO}/{video_id}/script", json={"content": "İlk içerik"})
    response = await client.patch(
        f"{BASE_VIDEO}/{video_id}/script",
        json={"content": "Güncellenmiş içerik", "generation_status": "ready"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["content"] == "Güncellenmiş içerik"
    assert body["generation_status"] == "ready"


# ---------------------------------------------------------------------------
# E) Standard video not found → 404 on script create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_script_video_not_found(client: AsyncClient):
    response = await client.post(
        f"{BASE_VIDEO}/nonexistent-video-id/script",
        json={"content": "Some content"},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# F) Script not found → 404 on GET
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_script_not_found(client: AsyncClient):
    video_id = await _create_video(client)
    response = await client.get(f"{BASE_VIDEO}/{video_id}/script")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# G) Blank content rejected on create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_script_blank_content_rejected(client: AsyncClient):
    video_id = await _create_video(client)
    response = await client.post(
        f"{BASE_VIDEO}/{video_id}/script",
        json={"content": "   "},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# H) Blank content rejected on update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_script_blank_content_rejected(client: AsyncClient):
    video_id = await _create_video(client)
    await client.post(f"{BASE_VIDEO}/{video_id}/script", json={"content": "Gerçek içerik"})
    response = await client.patch(
        f"{BASE_VIDEO}/{video_id}/script",
        json={"content": ""},
    )
    assert response.status_code == 422
