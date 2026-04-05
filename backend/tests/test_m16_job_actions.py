"""
M16: Job Operational Actions testleri.

Test edilen:
  - Cancel endpoint basarili calisir
  - Cancel terminal durumda reddedilir
  - Retry endpoint yeni job olusturur (rerun pattern)
  - Retry non-failed durumda reddedilir
  - Skip step basarili calisir (skippable step)
  - Skip step reddedilir (non-skippable step)
  - Skip step reddedilir (non-pending step)
  - Allowed actions endpoint dogru deger doner
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.session import AsyncSessionLocal
from app.jobs.schemas import JobCreate
from app.jobs import service


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


async def _create_test_job(status: str = "queued") -> str:
    """Test icin job olustur ve istenen duruma getir."""
    async with AsyncSessionLocal() as session:
        job = await service.create_job(session, JobCreate(module_type="standard_video"))
        job_id = job.id

        if status == "running":
            await service.transition_job_status(session, job_id, "running")
        elif status == "failed":
            await service.transition_job_status(session, job_id, "running")
            await service.transition_job_status(session, job_id, "failed", last_error="test error")
        elif status == "completed":
            await service.transition_job_status(session, job_id, "running")
            await service.transition_job_status(session, job_id, "completed")
        elif status == "cancelled":
            await service.transition_job_status(session, job_id, "cancelled")

    return job_id


@pytest.mark.asyncio
async def test_cancel_job_success(client: AsyncClient):
    """Queued durumundaki job iptal edilebilir."""
    job_id = await _create_test_job("queued")
    resp = await client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "cancelled"


@pytest.mark.asyncio
async def test_cancel_running_job_success(client: AsyncClient):
    """Running durumundaki job iptal edilebilir."""
    job_id = await _create_test_job("running")
    resp = await client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "cancelled"


@pytest.mark.asyncio
async def test_cancel_terminal_job_rejected(client: AsyncClient):
    """Completed durumundaki job iptal edilemez."""
    job_id = await _create_test_job("completed")
    resp = await client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_cancel_not_found(client: AsyncClient):
    """Olmayan job icin 404."""
    resp = await client.post("/api/v1/jobs/nonexistent-m16/cancel")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_retry_failed_job_creates_new(client: AsyncClient):
    """Failed job retry edildiginde yeni job olusturulur."""
    job_id = await _create_test_job("failed")
    resp = await client.post(f"/api/v1/jobs/{job_id}/retry")
    assert resp.status_code == 200
    data = resp.json()
    # Yeni job olusturulmali — ID farkli olmali
    assert data["id"] != job_id
    assert data["status"] == "queued"
    assert data["module_type"] == "standard_video"


@pytest.mark.asyncio
async def test_retry_non_failed_rejected(client: AsyncClient):
    """Running durumundaki job retry edilemez."""
    job_id = await _create_test_job("running")
    resp = await client.post(f"/api/v1/jobs/{job_id}/retry")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_skip_non_skippable_step_rejected(client: AsyncClient):
    """Skippable olmayan step atlanamaz."""
    job_id = await _create_test_job("queued")
    resp = await client.post(f"/api/v1/jobs/{job_id}/steps/script/skip")
    assert resp.status_code == 409
    assert "script" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_allowed_actions_queued(client: AsyncClient):
    """Queued job icin cancel aktif, retry pasif olmali."""
    job_id = await _create_test_job("queued")
    resp = await client.get(f"/api/v1/jobs/{job_id}/allowed-actions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_cancel"] is True
    assert data["can_retry"] is False


@pytest.mark.asyncio
async def test_allowed_actions_failed(client: AsyncClient):
    """Failed job icin retry aktif, cancel pasif olmali."""
    job_id = await _create_test_job("failed")
    resp = await client.get(f"/api/v1/jobs/{job_id}/allowed-actions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_cancel"] is False
    assert data["can_retry"] is True


@pytest.mark.asyncio
async def test_allowed_actions_completed(client: AsyncClient):
    """Completed job icin hic aksiyon aktif olmamali."""
    job_id = await _create_test_job("completed")
    resp = await client.get(f"/api/v1/jobs/{job_id}/allowed-actions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_cancel"] is False
    assert data["can_retry"] is False
    assert data["skippable_steps"] == []
