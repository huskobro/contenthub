"""
Phase 13 Standard Video Metadata API tests.

Covers:
  A) standard_video_metadata table exists after migration
  B) POST /{id}/metadata — create metadata
  C) GET /{id}/metadata  — fetch metadata
  D) PATCH /{id}/metadata — update metadata
  E) Standard video not found → 404 on metadata create
  F) Metadata not found → 404 on GET when none exists
  G) Blank title rejected on create
  H) Blank title rejected on update
"""

import pytest
from httpx import AsyncClient

BASE_VIDEO = "/api/v1/modules/standard-video"


async def _create_video(client: AsyncClient) -> str:
    resp = await client.post(BASE_VIDEO, json={"topic": "Metadata test topic"})
    assert resp.status_code == 201
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# A) Table existence
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_standard_video_metadata_table_exists():
    from sqlalchemy import inspect
    from app.db.session import engine

    async with engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names())
        )
    assert "standard_video_metadata" in tables


# ---------------------------------------------------------------------------
# B) Create metadata
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_metadata(client: AsyncClient):
    video_id = await _create_video(client)
    response = await client.post(
        f"{BASE_VIDEO}/{video_id}/metadata",
        json={
            "title": "Yapay Zeka ve Gelecek",
            "description": "Bu video yapay zekanın geleceğini anlatıyor.",
            "category": "education",
            "language": "tr",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["standard_video_id"] == video_id
    assert body["title"] == "Yapay Zeka ve Gelecek"
    assert body["category"] == "education"
    assert body["language"] == "tr"
    assert body["generation_status"] == "draft"
    assert body["version"] == 1
    assert "id" in body


# ---------------------------------------------------------------------------
# C) Get metadata
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_metadata(client: AsyncClient):
    video_id = await _create_video(client)
    await client.post(
        f"{BASE_VIDEO}/{video_id}/metadata",
        json={"title": "Test Başlığı"},
    )
    response = await client.get(f"{BASE_VIDEO}/{video_id}/metadata")
    assert response.status_code == 200
    assert response.json()["title"] == "Test Başlığı"


# ---------------------------------------------------------------------------
# D) Update metadata
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_metadata(client: AsyncClient):
    video_id = await _create_video(client)
    await client.post(f"{BASE_VIDEO}/{video_id}/metadata", json={"title": "İlk Başlık"})
    response = await client.patch(
        f"{BASE_VIDEO}/{video_id}/metadata",
        json={"title": "Güncellenmiş Başlık", "generation_status": "ready"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Güncellenmiş Başlık"
    assert body["generation_status"] == "ready"


# ---------------------------------------------------------------------------
# E) Standard video not found → 404 on metadata create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_metadata_video_not_found(client: AsyncClient):
    response = await client.post(
        f"{BASE_VIDEO}/nonexistent-video-id/metadata",
        json={"title": "Başlık"},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# F) Metadata not found → 404 on GET
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_metadata_not_found(client: AsyncClient):
    video_id = await _create_video(client)
    response = await client.get(f"{BASE_VIDEO}/{video_id}/metadata")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# G) Blank title rejected on create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_metadata_blank_title_rejected(client: AsyncClient):
    video_id = await _create_video(client)
    response = await client.post(
        f"{BASE_VIDEO}/{video_id}/metadata",
        json={"title": "   "},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# H) Blank title rejected on update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_metadata_blank_title_rejected(client: AsyncClient):
    video_id = await _create_video(client)
    await client.post(f"{BASE_VIDEO}/{video_id}/metadata", json={"title": "Gerçek Başlık"})
    response = await client.patch(
        f"{BASE_VIDEO}/{video_id}/metadata",
        json={"title": ""},
    )
    assert response.status_code == 422
