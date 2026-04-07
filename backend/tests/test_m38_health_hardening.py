"""
Tests — M38 Hardening: Health endpoint + WAL checkpoint + startup validation.
"""

import pytest
import sys
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import wal_checkpoint


@pytest.mark.asyncio
async def test_health_endpoint_returns_200():
    """Health endpoint returns 200 with real diagnostics."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded", "error")
    assert "python_version" in data
    assert "venv_active" in data
    assert "db_connected" in data
    assert "db_wal_mode" in data


@pytest.mark.asyncio
async def test_health_db_connected():
    """Health endpoint reports DB as connected when DB is available."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/health")
    data = resp.json()
    assert data["db_connected"] is True


@pytest.mark.asyncio
async def test_health_python_version():
    """Health endpoint reports correct Python version."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/health")
    data = resp.json()
    expected = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    assert data["python_version"] == expected


@pytest.mark.asyncio
async def test_wal_checkpoint_runs():
    """WAL checkpoint function runs without error."""
    result = await wal_checkpoint()
    assert "busy" in result
    assert "log" in result
    assert "checkpointed" in result
    assert result["busy"] >= 0 or result["busy"] == -1


@pytest.mark.asyncio
async def test_health_status_ok_when_db_connected():
    """Status should be 'ok' when DB is connected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/health")
    data = resp.json()
    if data["db_connected"]:
        assert data["status"] == "ok"
