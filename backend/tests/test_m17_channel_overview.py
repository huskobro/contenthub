"""
M17-C — Channel Overview Metrics testleri.

Kanal bazlı yayın özet metriklerini doğrular.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.analytics.schemas import ChannelOverviewMetrics, YouTubeChannelMetrics


@pytest.mark.asyncio
async def test_channel_endpoint_returns_200():
    """Channel endpoint boş DB'de 200 döner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/channel",
            params={"window": "all_time"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "youtube" in data
    assert isinstance(data["youtube"]["total_publish_attempts"], int)
    assert isinstance(data["youtube"]["has_publish_history"], bool)


@pytest.mark.asyncio
async def test_channel_schema_fields():
    """ChannelOverviewMetrics schema'sının doğru alanları içerdiğini kontrol eder."""
    fields = set(ChannelOverviewMetrics.model_fields.keys())
    assert {"window", "youtube"}.issubset(fields)

    yt_fields = set(YouTubeChannelMetrics.model_fields.keys())
    expected = {
        "total_publish_attempts", "published_count", "failed_count",
        "draft_count", "in_progress_count", "publish_success_rate",
        "last_published_at", "has_publish_history",
    }
    assert expected.issubset(yt_fields)


@pytest.mark.asyncio
async def test_channel_invalid_window():
    """Geçersiz window 400 döner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/channel",
            params={"window": "invalid"},
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_source_impact_endpoint_returns_200():
    """Source impact endpoint boş DB'de 200 döner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/source-impact",
            params={"window": "all_time"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["total_sources"], int)
    assert isinstance(data["source_stats"], list)
