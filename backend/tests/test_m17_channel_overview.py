"""
M17-C — Channel Overview Metrics testleri.

Kanal bazlı yayın özet metriklerini doğrular.

PHASE X: Analytics endpoint'leri auth gerektirir — admin_headers kullanilir.
"""

import pytest
from httpx import AsyncClient
from app.analytics.schemas import ChannelOverviewMetrics, YouTubeChannelMetrics


@pytest.mark.asyncio
async def test_channel_endpoint_returns_200(client: AsyncClient, admin_headers: dict[str, str]):
    """Channel endpoint boş DB'de 200 döner."""
    resp = await client.get(
        "/api/v1/analytics/channel",
        params={"window": "all_time"},
        headers=admin_headers,
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
async def test_channel_invalid_window(client: AsyncClient, admin_headers: dict[str, str]):
    """Geçersiz window 400 döner."""
    resp = await client.get(
        "/api/v1/analytics/channel",
        params={"window": "invalid"},
        headers=admin_headers,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_source_impact_endpoint_returns_200(client: AsyncClient, admin_headers: dict[str, str]):
    """Source impact endpoint boş DB'de 200 döner (admin scope)."""
    resp = await client.get(
        "/api/v1/analytics/source-impact",
        params={"window": "all_time"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["total_sources"], int)
    assert isinstance(data["source_stats"], list)
