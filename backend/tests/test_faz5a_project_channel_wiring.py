"""
Faz 5a — Project/Channel wiring tests.

Tests:
1. StandardVideo create accepts content_project_id
2. NewsBulletin create accepts content_project_id + channel_profile_id
3. Job create accepts channel_profile_id + content_project_id
4. JobResponse includes the new fields
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE_SV = "/api/v1/modules/standard-video"
BASE_NB = "/api/v1/modules/news-bulletin"
BASE_JOBS = "/api/v1/jobs"


# ---------------------------------------------------------------------------
# 1. StandardVideo — content_project_id round-trip
# ---------------------------------------------------------------------------

async def test_standard_video_create_with_content_project_id(client: AsyncClient):
    """StandardVideo create should accept and store content_project_id."""
    fake_project_id = "proj-00000000-0000-0000-0000-000000000001"
    payload = {
        "topic": "Test video with project link",
        "status": "draft",
        "content_project_id": fake_project_id,
    }
    resp = await client.post(BASE_SV, json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["content_project_id"] == fake_project_id


async def test_standard_video_create_without_content_project_id(client: AsyncClient):
    """StandardVideo create without content_project_id should still work (backward compat)."""
    payload = {"topic": "Test video no project", "status": "draft"}
    resp = await client.post(BASE_SV, json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data.get("content_project_id") is None


# ---------------------------------------------------------------------------
# 2. NewsBulletin — content_project_id + channel_profile_id round-trip
# ---------------------------------------------------------------------------

async def test_news_bulletin_create_with_project_and_channel(client: AsyncClient):
    """NewsBulletin create should accept and store both linkage fields."""
    fake_project_id = "proj-00000000-0000-0000-0000-000000000002"
    fake_channel_id = "chan-00000000-0000-0000-0000-000000000001"
    payload = {
        "topic": "Test bulletin with project and channel",
        "status": "draft",
        "content_project_id": fake_project_id,
        "channel_profile_id": fake_channel_id,
    }
    resp = await client.post(BASE_NB, json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["content_project_id"] == fake_project_id
    assert data["channel_profile_id"] == fake_channel_id


async def test_news_bulletin_create_without_linkage(client: AsyncClient):
    """NewsBulletin create without linkage fields should work (backward compat)."""
    payload = {"topic": "Test bulletin no linkage", "status": "draft"}
    resp = await client.post(BASE_NB, json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data.get("content_project_id") is None
    assert data.get("channel_profile_id") is None


# ---------------------------------------------------------------------------
# 3. Job — channel_profile_id + content_project_id in response
# ---------------------------------------------------------------------------

async def test_job_response_includes_linkage_fields(
    client: AsyncClient, admin_headers: dict[str, str]
):
    """JobResponse should include channel_profile_id and content_project_id fields.

    PHASE X: Jobs create artik auth ister.
    """
    payload = {"module_id": "standard_video", "topic": "Test job linkage fields"}
    resp = await client.post(BASE_JOBS, json=payload, headers=admin_headers)
    assert resp.status_code in (200, 201), resp.text
    data = resp.json()
    # Fields should exist in response (may be null)
    assert "channel_profile_id" in data
    assert "content_project_id" in data


# ---------------------------------------------------------------------------
# 4. StandardVideo list still works
# ---------------------------------------------------------------------------

async def test_standard_video_list_includes_content_project_id(client: AsyncClient):
    """List endpoint should return content_project_id."""
    # Create one with project link
    create_resp = await client.post(BASE_SV, json={
        "topic": "List test video",
        "status": "draft",
        "content_project_id": "proj-list-test-001",
    })
    assert create_resp.status_code == 201

    # List and check
    list_resp = await client.get(BASE_SV)
    assert list_resp.status_code == 200
    items = list_resp.json()
    found = [i for i in items if i.get("content_project_id") == "proj-list-test-001"]
    assert len(found) >= 1
