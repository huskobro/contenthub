"""
M17-B — Analytics Overview date_from/date_to filtre testleri.

Overview endpoint'inin tarih aralığı filtresini doğru uyguladığını test eder.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_overview_date_from_accepted():
    """date_from parametresi geçerli ISO formatla kabul edilir."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/overview",
            params={"window": "all_time", "date_from": "2026-01-01T00:00:00"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "total_job_count" in data


@pytest.mark.asyncio
async def test_overview_date_to_accepted():
    """date_to parametresi geçerli ISO formatla kabul edilir."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/overview",
            params={"window": "all_time", "date_to": "2026-12-31T23:59:59"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "total_job_count" in data


@pytest.mark.asyncio
async def test_overview_date_range_combined():
    """date_from + date_to birlikte çalışır."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/overview",
            params={
                "window": "all_time",
                "date_from": "2026-01-01T00:00:00",
                "date_to": "2026-12-31T23:59:59",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["total_job_count"], int)  # valid response expected


@pytest.mark.asyncio
async def test_overview_invalid_date_format():
    """Geçersiz tarih formatı 400 döner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/analytics/overview",
            params={"window": "all_time", "date_from": "not-a-date"},
        )
    assert resp.status_code == 400
    assert "date_from" in resp.json()["detail"]
