"""
Phase 50 News Bulletin Used News Enforcement Backend tests.

Covers:
  A) No used news → used_news_count=0, used_news_warning=False on list
  B) No used news → used_news_count=0, used_news_warning=False on create
  C) Used news record exists → used_news_count>0, used_news_warning=True on list
  D) Used news record exists → used_news_count>0, used_news_warning=True on create
  E) last_usage_type and last_target_module populated correctly
  F) Multiple used news records → used_news_count is correct
  G) Enforcement fields present in list response
  H) Enforcement fields present in create response
  I) Existing selected news list behavior unchanged (returns items)
  J) PATCH still works and doesn't break
"""

import uuid
import pytest
from httpx import AsyncClient

BULLETIN_BASE = "/api/v1/modules/news-bulletin"
NEWS_ITEMS_BASE = "/api/v1/news-items"
USED_NEWS_BASE = "/api/v1/used-news"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


async def _create_bulletin(client: AsyncClient) -> str:
    resp = await client.post(BULLETIN_BASE, json={"topic": f"Bulletin {_uid()}"})
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_news_item(client: AsyncClient) -> str:
    payload = {
        "title": f"News Item {_uid()}",
        "url": f"https://example.com/news/{_uid()}",
        "status": "new",
    }
    resp = await client.post(NEWS_ITEMS_BASE, json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_used_news(client: AsyncClient, news_item_id: str, usage_type: str = "bulletin", target_module: str = "news_bulletin") -> str:
    resp = await client.post(USED_NEWS_BASE, json={
        "news_item_id": news_item_id,
        "usage_type": usage_type,
        "target_module": target_module,
    })
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_no_used_news_list_no_warning(client: AsyncClient):
    """A) No used news → enforcement fields are zero/false in list."""
    bulletin_id = await _create_bulletin(client)
    news_item_id = await _create_news_item(client)

    # Add selected item
    resp = await client.post(f"{BULLETIN_BASE}/{bulletin_id}/selected-news", json={
        "news_item_id": news_item_id, "sort_order": 1
    })
    assert resp.status_code == 201

    # List
    resp = await client.get(f"{BULLETIN_BASE}/{bulletin_id}/selected-news")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["used_news_count"] == 0
    assert items[0]["used_news_warning"] is False
    assert items[0]["last_usage_type"] is None
    assert items[0]["last_target_module"] is None


@pytest.mark.asyncio
async def test_no_used_news_create_no_warning(client: AsyncClient):
    """B) No used news → enforcement fields are zero/false in create response."""
    bulletin_id = await _create_bulletin(client)
    news_item_id = await _create_news_item(client)

    resp = await client.post(f"{BULLETIN_BASE}/{bulletin_id}/selected-news", json={
        "news_item_id": news_item_id, "sort_order": 1
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["used_news_count"] == 0
    assert data["used_news_warning"] is False
    assert data["last_usage_type"] is None
    assert data["last_target_module"] is None


@pytest.mark.asyncio
async def test_used_news_exists_list_warning(client: AsyncClient):
    """C) Used news record exists → warning=True in list."""
    bulletin_id = await _create_bulletin(client)
    news_item_id = await _create_news_item(client)

    # Create used news record first
    await _create_used_news(client, news_item_id, "bulletin", "news_bulletin")

    # Add selected item
    resp = await client.post(f"{BULLETIN_BASE}/{bulletin_id}/selected-news", json={
        "news_item_id": news_item_id, "sort_order": 1
    })
    assert resp.status_code == 201

    # List
    resp = await client.get(f"{BULLETIN_BASE}/{bulletin_id}/selected-news")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["used_news_count"] >= 1
    assert items[0]["used_news_warning"] is True


@pytest.mark.asyncio
async def test_used_news_exists_create_warning(client: AsyncClient):
    """D) Used news record exists → warning=True in create response."""
    bulletin_id = await _create_bulletin(client)
    news_item_id = await _create_news_item(client)

    # Create used news record first
    await _create_used_news(client, news_item_id, "bulletin", "news_bulletin")

    resp = await client.post(f"{BULLETIN_BASE}/{bulletin_id}/selected-news", json={
        "news_item_id": news_item_id, "sort_order": 1
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["used_news_count"] >= 1
    assert data["used_news_warning"] is True


@pytest.mark.asyncio
async def test_last_usage_type_and_module_populated(client: AsyncClient):
    """E) last_usage_type and last_target_module populated correctly."""
    bulletin_id = await _create_bulletin(client)
    news_item_id = await _create_news_item(client)

    await _create_used_news(client, news_item_id, "published", "standard_video")

    resp = await client.post(f"{BULLETIN_BASE}/{bulletin_id}/selected-news", json={
        "news_item_id": news_item_id, "sort_order": 1
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["last_usage_type"] == "published"
    assert data["last_target_module"] == "standard_video"


@pytest.mark.asyncio
async def test_multiple_used_news_count(client: AsyncClient):
    """F) Multiple used news records → used_news_count is correct."""
    bulletin_id = await _create_bulletin(client)
    news_item_id = await _create_news_item(client)

    await _create_used_news(client, news_item_id, "draft", "news_bulletin")
    await _create_used_news(client, news_item_id, "published", "news_bulletin")

    resp = await client.post(f"{BULLETIN_BASE}/{bulletin_id}/selected-news", json={
        "news_item_id": news_item_id, "sort_order": 1
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["used_news_count"] == 2


@pytest.mark.asyncio
async def test_enforcement_fields_in_list_response(client: AsyncClient):
    """G) Enforcement fields present in list response."""
    bulletin_id = await _create_bulletin(client)
    news_item_id = await _create_news_item(client)

    await client.post(f"{BULLETIN_BASE}/{bulletin_id}/selected-news", json={
        "news_item_id": news_item_id, "sort_order": 1
    })

    resp = await client.get(f"{BULLETIN_BASE}/{bulletin_id}/selected-news")
    assert resp.status_code == 200
    items = resp.json()
    assert "used_news_count" in items[0]
    assert "used_news_warning" in items[0]
    assert "last_usage_type" in items[0]
    assert "last_target_module" in items[0]


@pytest.mark.asyncio
async def test_enforcement_fields_in_create_response(client: AsyncClient):
    """H) Enforcement fields present in create response."""
    bulletin_id = await _create_bulletin(client)
    news_item_id = await _create_news_item(client)

    resp = await client.post(f"{BULLETIN_BASE}/{bulletin_id}/selected-news", json={
        "news_item_id": news_item_id, "sort_order": 1
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "used_news_count" in data
    assert "used_news_warning" in data
    assert "last_usage_type" in data
    assert "last_target_module" in data


@pytest.mark.asyncio
async def test_list_returns_items(client: AsyncClient):
    """I) Existing selected news list behavior unchanged."""
    bulletin_id = await _create_bulletin(client)
    news_item_id = await _create_news_item(client)

    await client.post(f"{BULLETIN_BASE}/{bulletin_id}/selected-news", json={
        "news_item_id": news_item_id, "sort_order": 5
    })

    resp = await client.get(f"{BULLETIN_BASE}/{bulletin_id}/selected-news")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["news_item_id"] == news_item_id
    assert items[0]["sort_order"] == 5


@pytest.mark.asyncio
async def test_patch_still_works(client: AsyncClient):
    """J) PATCH still works after enforcement changes."""
    bulletin_id = await _create_bulletin(client)
    news_item_id = await _create_news_item(client)

    create_resp = await client.post(f"{BULLETIN_BASE}/{bulletin_id}/selected-news", json={
        "news_item_id": news_item_id, "sort_order": 1
    })
    sel_id = create_resp.json()["id"]

    patch_resp = await client.patch(
        f"{BULLETIN_BASE}/{bulletin_id}/selected-news/{sel_id}",
        json={"sort_order": 10, "selection_reason": "top story"}
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["sort_order"] == 10
    assert patch_resp.json()["selection_reason"] == "top story"
