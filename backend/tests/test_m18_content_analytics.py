"""
M18-A — Content Analytics Metrics testleri.

İçerik düzeyinde analytics metriklerini doğrular.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.analytics.schemas import ContentMetrics, ModuleDistribution, ContentTypeBreakdown


@pytest.mark.asyncio
async def test_content_endpoint_returns_200():
    """Content analytics endpoint 200 döner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/content",
            params={"window": "all_time"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "module_distribution" in data
    assert "content_output_count" in data
    assert "published_content_count" in data
    assert "content_type_breakdown" in data
    assert isinstance(data["module_distribution"], list)
    assert isinstance(data["content_type_breakdown"], list)


@pytest.mark.asyncio
async def test_content_endpoint_with_window():
    """Farklı window parametreleri kabul edilir."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for w in ["last_7d", "last_30d", "last_90d", "all_time"]:
            resp = await client.get(
                "/api/v1/analytics/content",
                params={"window": w},
            )
            assert resp.status_code == 200
            assert resp.json()["window"] == w


@pytest.mark.asyncio
async def test_content_endpoint_invalid_window():
    """Geçersiz window 400 döner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/content",
            params={"window": "invalid"},
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_content_endpoint_date_range():
    """date_from/date_to parametreleri kabul edilir."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/content",
            params={
                "window": "all_time",
                "date_from": "2026-01-01T00:00:00",
                "date_to": "2026-12-31T23:59:59",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["content_output_count"], int)


@pytest.mark.asyncio
async def test_content_endpoint_invalid_date():
    """Geçersiz tarih formatı 400 döner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/content",
            params={"window": "all_time", "date_from": "not-a-date"},
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_content_schema_fields():
    """ContentMetrics schema'sının doğru alanları içerdiğini kontrol eder."""
    fields = set(ContentMetrics.model_fields.keys())
    expected = {
        "window", "module_distribution", "content_output_count",
        "published_content_count", "avg_time_to_publish_seconds",
        "content_type_breakdown", "active_template_count",
        "active_blueprint_count",
    }
    assert expected.issubset(fields)

    md_fields = set(ModuleDistribution.model_fields.keys())
    assert {"module_type", "total_jobs", "completed_jobs", "failed_jobs", "success_rate"}.issubset(md_fields)

    ct_fields = set(ContentTypeBreakdown.model_fields.keys())
    assert {"type", "count"}.issubset(ct_fields)


@pytest.mark.asyncio
async def test_content_type_breakdown_has_two_types():
    """content_type_breakdown her zaman standard_video ve news_bulletin içerir."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/content",
            params={"window": "all_time"},
        )
    data = resp.json()
    types = [ct["type"] for ct in data["content_type_breakdown"]]
    assert "standard_video" in types
    assert "news_bulletin" in types
