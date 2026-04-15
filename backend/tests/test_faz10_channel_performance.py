"""
Faz 10 — Channel Performance Analytics tests.

Tests:
1. Channel performance endpoint reachable
2. Response contains all metric groups
3. Channel performance with window filter
4. Channel performance with channel_profile_id filter
5. Channel rankings included when no channel filter
6. Daily trend is list
7. Module distribution is list
8. Engagement type distribution is list
9. Empty state returns zeros
10. Channel performance service direct call

PHASE X: HTTP testleri admin_headers kullanir. Admin ownership kontrolunden
gecer (helper ctx.is_admin'de erken donus yapar), boylece channel_profile_id
var/yok gozetmeksizin endpoint kullanilabilir.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/analytics/channel-performance"


# ---------------------------------------------------------------------------
# 1. Endpoint reachable
# ---------------------------------------------------------------------------

async def test_channel_performance_endpoint_reachable(client: AsyncClient, admin_headers: dict[str, str]):
    """GET /analytics/channel-performance should return 200."""
    resp = await client.get(BASE, headers=admin_headers)
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 2. Response contains all metric groups
# ---------------------------------------------------------------------------

async def test_response_contains_all_groups(client: AsyncClient, admin_headers: dict[str, str]):
    """Response must have production, publish, engagement, health, trend sections."""
    resp = await client.get(BASE, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()

    # Production
    assert "total_content" in data
    assert "total_jobs" in data
    assert "job_success_rate" in data
    assert "avg_production_duration_seconds" in data
    assert "retry_rate" in data
    assert "module_distribution" in data

    # Publish
    assert "total_publish" in data
    assert "published_count" in data
    assert "failed_publish" in data
    assert "publish_success_rate" in data

    # Engagement
    assert "total_comments" in data
    assert "replied_comments" in data
    assert "reply_rate" in data
    assert "total_engagement_tasks" in data
    assert "engagement_type_distribution" in data
    assert "total_posts" in data
    assert "total_playlists" in data

    # Health
    assert "total_connections" in data
    assert "connected_connections" in data

    # Trends & rankings
    assert "daily_trend" in data
    assert "channel_rankings" in data
    assert "recent_errors" in data


# ---------------------------------------------------------------------------
# 3. Window filter
# ---------------------------------------------------------------------------

async def test_channel_performance_with_window(client: AsyncClient, admin_headers: dict[str, str]):
    """Endpoint accepts window param."""
    for w in ("last_7d", "last_30d", "last_90d", "all_time"):
        resp = await client.get(BASE, params={"window": w}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["window"] == w


# ---------------------------------------------------------------------------
# 4. Channel profile filter
# ---------------------------------------------------------------------------

async def test_channel_performance_with_channel_filter(client: AsyncClient, admin_headers: dict[str, str]):
    """Endpoint accepts channel_profile_id param."""
    resp = await client.get(BASE, params={"channel_profile_id": "nonexistent-id"}, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["filters_applied"]["channel_profile_id"] == "nonexistent-id"
    # With nonexistent channel, everything should be 0
    assert data["total_jobs"] == 0
    assert data["total_publish"] == 0


# ---------------------------------------------------------------------------
# 5. Channel rankings
# ---------------------------------------------------------------------------

async def test_channel_rankings_included(client: AsyncClient, admin_headers: dict[str, str]):
    """When no channel filter, channel_rankings should be a list."""
    resp = await client.get(BASE, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["channel_rankings"], list)


# ---------------------------------------------------------------------------
# 6. Daily trend
# ---------------------------------------------------------------------------

async def test_daily_trend_is_list(client: AsyncClient, admin_headers: dict[str, str]):
    resp = await client.get(BASE, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["daily_trend"], list)


# ---------------------------------------------------------------------------
# 7. Module distribution
# ---------------------------------------------------------------------------

async def test_module_distribution_is_list(client: AsyncClient, admin_headers: dict[str, str]):
    resp = await client.get(BASE, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["module_distribution"], list)


# ---------------------------------------------------------------------------
# 8. Engagement type distribution
# ---------------------------------------------------------------------------

async def test_engagement_type_distribution_is_list(client: AsyncClient, admin_headers: dict[str, str]):
    resp = await client.get(BASE, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["engagement_type_distribution"], list)


# ---------------------------------------------------------------------------
# 9. Empty state returns zeros
# ---------------------------------------------------------------------------

async def test_empty_state_returns_zeros(client: AsyncClient, admin_headers: dict[str, str]):
    """With a nonexistent channel, all counts should be 0."""
    resp = await client.get(BASE, params={"channel_profile_id": "does-not-exist-12345"}, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_jobs"] == 0
    assert data["total_publish"] == 0
    assert data["total_comments"] == 0
    assert data["total_engagement_tasks"] == 0
    assert data["total_posts"] == 0
    assert data["total_playlists"] == 0
    assert data["total_connections"] == 0


# ---------------------------------------------------------------------------
# 10. Service direct call
# ---------------------------------------------------------------------------

async def test_service_direct_call(db_session: AsyncSession):
    """Direct service call should return valid dict."""
    from app.analytics.service import get_channel_performance

    result = await get_channel_performance(session=db_session, window="all_time")
    assert isinstance(result, dict)
    assert result["window"] == "all_time"
    assert "total_jobs" in result
    assert "total_comments" in result
    assert "channel_rankings" in result
