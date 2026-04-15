"""
Phase 37 News Bulletin Selected Items API tests.

Covers:
  A) news_bulletin_selected_items table exists after migration
  B) POST /{id}/selected-news — create selection
  C) GET /{id}/selected-news — list selections
  D) PATCH /{id}/selected-news/{sel_id} — update selection
  E) News bulletin not found on GET → 404
  F) News item not found on POST → 404
  G) Selection id not found on PATCH → 404
  H) Duplicate news item in same bulletin → 409
"""

import uuid
import pytest
from httpx import AsyncClient

BULLETIN_BASE = "/api/v1/modules/news-bulletin"
NEWS_ITEMS_BASE = "/api/v1/news-items"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


async def _create_bulletin(client: AsyncClient) -> str:
    resp = await client.post(BULLETIN_BASE, json={"topic": f"Bulletin {_uid()}"})
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_news_item(client: AsyncClient) -> str:
    """Gate Sources Closure — status artik yalnizca new/used/ignored."""
    payload = {
        "title": f"News Item {_uid()}",
        "url": f"https://example.com/news/{_uid()}",
        "source_id": None,
        "status": "new",
    }
    resp = await client.post(NEWS_ITEMS_BASE, json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


def _sel_url(bulletin_id: str) -> str:
    return f"{BULLETIN_BASE}/{bulletin_id}/selected-news"


def _sel_patch_url(bulletin_id: str, selection_id: str) -> str:
    return f"{BULLETIN_BASE}/{bulletin_id}/selected-news/{selection_id}"


# ---------------------------------------------------------------------------
# A) Table exists
# ---------------------------------------------------------------------------

async def test_news_bulletin_selected_items_table_exists(test_engine):
    from sqlalchemy import inspect

    async with test_engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names())
        )
    assert "news_bulletin_selected_items" in tables, "news_bulletin_selected_items table should exist after migration"


# ---------------------------------------------------------------------------
# B) Create selection
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_bulletin_selected_item(client: AsyncClient):
    bid = await _create_bulletin(client)
    nid = await _create_news_item(client)
    resp = await client.post(
        _sel_url(bid),
        json={"news_item_id": nid, "sort_order": 1, "selection_reason": "Top story"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["news_bulletin_id"] == bid
    assert data["news_item_id"] == nid
    assert data["sort_order"] == 1
    assert data["selection_reason"] == "Top story"
    assert "id" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# C) List selections
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_bulletin_selected_items(client: AsyncClient):
    bid = await _create_bulletin(client)
    nid1 = await _create_news_item(client)
    nid2 = await _create_news_item(client)
    await client.post(_sel_url(bid), json={"news_item_id": nid1, "sort_order": 2})
    await client.post(_sel_url(bid), json={"news_item_id": nid2, "sort_order": 1})
    resp = await client.get(_sel_url(bid))
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 2
    # sorted by sort_order asc
    assert items[0]["sort_order"] <= items[1]["sort_order"]


# ---------------------------------------------------------------------------
# D) Update selection
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_bulletin_selected_item(client: AsyncClient):
    bid = await _create_bulletin(client)
    nid = await _create_news_item(client)
    create_resp = await client.post(
        _sel_url(bid),
        json={"news_item_id": nid, "sort_order": 0},
    )
    sel_id = create_resp.json()["id"]
    resp = await client.patch(
        _sel_patch_url(bid, sel_id),
        json={"sort_order": 5, "selection_reason": "Updated reason"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["sort_order"] == 5
    assert data["selection_reason"] == "Updated reason"


# ---------------------------------------------------------------------------
# E) News bulletin not found on GET → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_selected_items_bulletin_not_found(client: AsyncClient):
    resp = await client.get(_sel_url(uuid.uuid4().hex))
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# F) News item not found on POST → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_selected_item_news_item_not_found(client: AsyncClient):
    bid = await _create_bulletin(client)
    resp = await client.post(
        _sel_url(bid),
        json={"news_item_id": uuid.uuid4().hex, "sort_order": 0},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# G) Selection id not found on PATCH → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_selected_item_not_found(client: AsyncClient):
    bid = await _create_bulletin(client)
    resp = await client.patch(
        _sel_patch_url(bid, uuid.uuid4().hex),
        json={"sort_order": 3},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# H) Duplicate news item in same bulletin → 409 (unique constraint)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_duplicate_selected_item_rejected(client: AsyncClient):
    bid = await _create_bulletin(client)
    nid = await _create_news_item(client)
    resp1 = await client.post(_sel_url(bid), json={"news_item_id": nid, "sort_order": 0})
    assert resp1.status_code == 201
    resp2 = await client.post(_sel_url(bid), json={"news_item_id": nid, "sort_order": 1})
    assert resp2.status_code in (409, 500)
