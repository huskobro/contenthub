"""
M16: Audit Log Hardening testleri.

Test edilen:
  - Tarih araligi filtresi (date_from, date_to) calisir
  - Gecersiz tarih formati reddedilir
  - Job aksiyonlari audit log kaydi olusturur
"""

import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta

from app.main import app
from app.db.session import AsyncSessionLocal
from app.audit.service import write_audit_log


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.mark.asyncio
async def test_date_from_filter(client: AsyncClient):
    """date_from filtresi calisir."""
    async with AsyncSessionLocal() as session:
        await write_audit_log(
            session, action="m16.date_test",
            entity_type="test", entity_id="dt-1",
        )
        await session.commit()

    # Gelecek tarihle filtre -> bos sonuc donmeli (naive format kullan)
    future = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")
    resp = await client.get(f"/api/v1/audit-logs?date_from={future}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_date_to_filter(client: AsyncClient):
    """date_to filtresi calisir."""
    past = (datetime.now(timezone.utc) - timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%S")
    resp = await client.get(f"/api/v1/audit-logs?date_to={past}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_date_range_combined(client: AsyncClient):
    """date_from + date_to birlikte calisir."""
    async with AsyncSessionLocal() as session:
        await write_audit_log(
            session, action="m16.range_test",
            entity_type="test", entity_id="rng-1",
        )
        await session.commit()

    now = datetime.now(timezone.utc)
    date_from = (now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S")
    date_to = (now + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S")
    resp = await client.get(f"/api/v1/audit-logs?date_from={date_from}&date_to={date_to}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_invalid_date_format(client: AsyncClient):
    """Gecersiz tarih formati 400 doner."""
    resp = await client.get("/api/v1/audit-logs?date_from=not-a-date")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_job_actions_create_audit_records(client: AsyncClient):
    """Job cancel aksiyonu audit log kaydi olusturur."""
    from app.jobs.schemas import JobCreate
    from app.jobs import service

    async with AsyncSessionLocal() as session:
        job = await service.create_job(session, JobCreate(module_type="standard_video"))
        job_id = job.id

    # Cancel
    resp = await client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert resp.status_code == 200

    # Audit log kontrol
    resp2 = await client.get(f"/api/v1/audit-logs?action=job.cancel&entity_id={job_id}")
    assert resp2.status_code == 200
    data = resp2.json()
    assert data["total"] >= 1
    assert data["items"][0]["action"] == "job.cancel"
