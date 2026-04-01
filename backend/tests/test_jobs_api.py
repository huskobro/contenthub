"""
Phase 7 Job Engine API tests.

Covers:
  A) jobs and job_steps tables exist after migration
  B) POST /jobs — create a job
  C) GET /jobs  — list jobs
  D) GET /jobs/{id} — fetch single job with steps
  E) GET /jobs — filter by status
  F) GET /jobs — filter by module_type
  G) 404 on unknown job id
  H) Invalid payload rejected (missing module_type)
"""

import pytest
from httpx import AsyncClient

BASE = "/api/v1/jobs"


def _payload(**overrides) -> dict:
    base = {
        "module_type": "standard_video",
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# A) Table existence
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_jobs_tables_exist():
    from sqlalchemy import inspect
    from app.db.session import engine

    async with engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names())
        )
    assert "jobs" in tables
    assert "job_steps" in tables


# ---------------------------------------------------------------------------
# B) Create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_job(client: AsyncClient):
    response = await client.post(BASE, json=_payload())
    assert response.status_code == 201
    body = response.json()
    assert body["module_type"] == "standard_video"
    assert body["status"] == "queued"
    assert body["retry_count"] == 0
    assert body["steps"] == []
    assert "id" in body
    assert "created_at" in body


# ---------------------------------------------------------------------------
# C) List
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_jobs_returns_list(client: AsyncClient):
    await client.post(BASE, json=_payload())
    response = await client.get(BASE)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) >= 1


# ---------------------------------------------------------------------------
# D) Get by id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_job_by_id(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload())
    job_id = create_resp.json()["id"]
    response = await client.get(f"{BASE}/{job_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == job_id
    assert body["module_type"] == "standard_video"
    assert "steps" in body


# ---------------------------------------------------------------------------
# E) Filter by status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_jobs_filter_status(client: AsyncClient):
    await client.post(BASE, json=_payload())
    response = await client.get(BASE, params={"status": "queued"})
    assert response.status_code == 200
    jobs = response.json()
    assert all(j["status"] == "queued" for j in jobs)


# ---------------------------------------------------------------------------
# F) Filter by module_type
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_jobs_filter_module_type(client: AsyncClient):
    await client.post(BASE, json=_payload(module_type="news_bulletin"))
    await client.post(BASE, json=_payload(module_type="standard_video"))
    response = await client.get(BASE, params={"module_type": "news_bulletin"})
    assert response.status_code == 200
    jobs = response.json()
    assert all(j["module_type"] == "news_bulletin" for j in jobs)


# ---------------------------------------------------------------------------
# G) 404 on unknown id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_job_not_found(client: AsyncClient):
    response = await client.get(f"{BASE}/nonexistent-id-xyz")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# H) Missing required field rejected
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_job_missing_module_type_rejected(client: AsyncClient):
    response = await client.post(BASE, json={})
    assert response.status_code == 422
