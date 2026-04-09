"""
Faz 6 — Analytics filter & new endpoint tests.

Tests:
1. Dashboard endpoint returns expected structure
2. Dashboard endpoint accepts entity filters
3. Publish analytics endpoint returns expected structure
4. Overview endpoint accepts entity filters without error
5. Operations endpoint accepts entity filters
6. Content endpoint accepts entity filters
7. Empty filter = cumulative view
8. No-data response handling
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/analytics"


# ---------------------------------------------------------------------------
# 1. Dashboard Summary
# ---------------------------------------------------------------------------

async def test_dashboard_summary_structure(client: AsyncClient):
    """Dashboard endpoint should return all expected fields."""
    resp = await client.get(f"{BASE}/dashboard", params={"window": "all_time"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    # KPIs
    assert "total_projects" in data
    assert "total_jobs" in data
    assert "active_jobs" in data
    assert "total_publish" in data
    assert "publish_success_rate" in data
    assert "avg_production_duration_seconds" in data
    assert "retry_rate" in data
    assert "failed_job_count" in data
    # Operational
    assert "queue_size" in data
    assert "recent_errors" in data
    # Trends
    assert "daily_trend" in data
    assert "module_distribution" in data
    assert "platform_distribution" in data
    assert "filters_applied" in data
    assert isinstance(data["daily_trend"], list)
    assert isinstance(data["module_distribution"], list)


async def test_dashboard_with_entity_filters(client: AsyncClient):
    """Dashboard should accept user_id / channel_profile_id / platform without error."""
    resp = await client.get(f"{BASE}/dashboard", params={
        "window": "last_30d",
        "user_id": "nonexistent-user",
        "channel_profile_id": "nonexistent-channel",
        "platform": "youtube",
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["filters_applied"]["user_id"] == "nonexistent-user"
    assert data["filters_applied"]["platform"] == "youtube"


# ---------------------------------------------------------------------------
# 2. Publish Analytics
# ---------------------------------------------------------------------------

async def test_publish_analytics_structure(client: AsyncClient):
    """Publish analytics endpoint should return expected structure."""
    resp = await client.get(f"{BASE}/publish", params={"window": "all_time"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "total_publish_count" in data
    assert "published_count" in data
    assert "failed_count" in data
    assert "draft_count" in data
    assert "in_review_count" in data
    assert "scheduled_count" in data
    assert "publish_success_rate" in data
    assert "platform_breakdown" in data
    assert "daily_publish_trend" in data
    assert "filters_applied" in data


async def test_publish_analytics_with_platform_filter(client: AsyncClient):
    """Publish analytics should filter by platform."""
    resp = await client.get(f"{BASE}/publish", params={
        "window": "all_time",
        "platform": "youtube",
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["filters_applied"]["platform"] == "youtube"


# ---------------------------------------------------------------------------
# 3. Existing endpoints accept new filters
# ---------------------------------------------------------------------------

async def test_overview_accepts_entity_filters(client: AsyncClient):
    """Overview endpoint should accept user_id etc. without error."""
    resp = await client.get(f"{BASE}/overview", params={
        "window": "all_time",
        "user_id": "any-user",
    })
    assert resp.status_code == 200, resp.text


async def test_operations_accepts_entity_filters(client: AsyncClient):
    """Operations endpoint should accept entity filters."""
    resp = await client.get(f"{BASE}/operations", params={
        "window": "all_time",
        "channel_profile_id": "any-channel",
    })
    assert resp.status_code == 200, resp.text


async def test_content_accepts_entity_filters(client: AsyncClient):
    """Content endpoint should accept entity filters."""
    resp = await client.get(f"{BASE}/content", params={
        "window": "last_7d",
        "user_id": "test-user",
        "platform": "youtube",
    })
    assert resp.status_code == 200, resp.text


# ---------------------------------------------------------------------------
# 4. Cumulative view (no filters)
# ---------------------------------------------------------------------------

async def test_dashboard_cumulative_view(client: AsyncClient):
    """Dashboard with no entity filters returns cumulative data."""
    resp = await client.get(f"{BASE}/dashboard", params={"window": "all_time"})
    assert resp.status_code == 200
    data = resp.json()
    # filters_applied should be empty (or at least no entity filters)
    assert not data["filters_applied"].get("user_id")
    assert not data["filters_applied"].get("channel_profile_id")


# ---------------------------------------------------------------------------
# 5. Empty state handling
# ---------------------------------------------------------------------------

async def test_dashboard_no_data_returns_zeros(client: AsyncClient):
    """With a filter that matches nothing, numeric fields should be 0/null."""
    resp = await client.get(f"{BASE}/dashboard", params={
        "window": "last_7d",
        "user_id": "no-such-user-99999",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_jobs"] == 0
    assert data["total_publish"] == 0
    assert data["active_jobs"] == 0


async def test_publish_analytics_no_data(client: AsyncClient):
    """Publish analytics with no matching data returns zeros."""
    resp = await client.get(f"{BASE}/publish", params={
        "window": "last_7d",
        "user_id": "no-such-user-99999",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_publish_count"] == 0
    assert data["published_count"] == 0
