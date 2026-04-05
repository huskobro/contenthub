"""
M16: Provider Trace → Analytics Integration testleri.

Test edilen:
  - Operations metrikleri provider_stats alani icerir
  - provider_stats bos liste donebilir (trace verisi yoksa)
  - provider_stats schema alanlari dogru
"""

import json
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.session import AsyncSessionLocal
from app.db.models import Job, JobStep

import uuid
from datetime import datetime, timezone


def _uuid():
    return str(uuid.uuid4())


def _now():
    return datetime.now(timezone.utc)


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.mark.asyncio
async def test_operations_includes_provider_stats(client: AsyncClient):
    """Operations metrikleri provider_stats listesi icerir."""
    resp = await client.get("/api/v1/analytics/operations?window=all_time")
    assert resp.status_code == 200
    data = resp.json()
    assert "provider_stats" in data
    assert isinstance(data["provider_stats"], list)


@pytest.mark.asyncio
async def test_provider_stats_from_trace_data(client: AsyncClient):
    """Trace verisi olan step'ler provider_stats'a yansir."""
    # Job + Step olustur trace JSON ile
    async with AsyncSessionLocal() as session:
        job = Job(
            id=_uuid(),
            module_type="standard_video",
            status="completed",
            retry_count=0,
            created_at=_now(),
            started_at=_now(),
            finished_at=_now(),
        )
        session.add(job)
        await session.flush()

        trace = json.dumps({
            "provider_trace": {
                "provider_name": "test_openai_m16",
                "provider_kind": "llm",
                "model": "gpt-4o",
                "success": True,
                "latency_ms": 1500.0,
                "input_tokens": 100,
                "output_tokens": 200,
                "cost_usd_estimate": 0.005,
            }
        })

        step = JobStep(
            id=_uuid(),
            job_id=job.id,
            step_key="script",
            step_order=1,
            status="completed",
            provider_trace_json=trace,
            created_at=_now(),
            started_at=_now(),
            finished_at=_now(),
        )
        session.add(step)
        await session.commit()

    resp = await client.get("/api/v1/analytics/operations?window=all_time")
    assert resp.status_code == 200
    data = resp.json()

    # test_openai_m16 provider'i provider_stats'da olmali
    found = [p for p in data["provider_stats"] if p["provider_name"] == "test_openai_m16"]
    assert len(found) >= 1
    p = found[0]
    assert p["provider_kind"] == "llm"
    assert p["total_calls"] >= 1
    assert p["failed_calls"] == 0
    assert p["avg_latency_ms"] is not None
    assert p["total_estimated_cost_usd"] is not None


@pytest.mark.asyncio
async def test_provider_stats_schema_fields():
    """ProviderStat schema gerekli alanlari icerir."""
    from app.analytics.schemas import ProviderStat

    p = ProviderStat(
        provider_name="test",
        provider_kind="llm",
        total_calls=10,
        failed_calls=2,
        error_rate=0.2,
        avg_latency_ms=1500.0,
        total_estimated_cost_usd=0.05,
        total_input_tokens=1000,
        total_output_tokens=2000,
    )
    assert p.provider_name == "test"
    assert p.error_rate == 0.2
    assert p.total_input_tokens == 1000
