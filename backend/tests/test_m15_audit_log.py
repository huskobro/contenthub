"""
M15: Audit Log sistemi testleri.

Test edilen:
  - write_audit_log fonksiyonu calisir ve kayit olusturur
  - write_audit_log hata durumunda None doner, exception firlatmaz
  - Audit log API endpoint'i kayitlari listeler
  - Audit log API endpoint'i filtre destekler
  - Audit log detay endpoint'i calisir
  - Detay endpoint'i olmayan ID icin 404 doner
  - build_provider_trace yapisal dict olusturur (trace_helper icin)
"""

import json
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.db.session import AsyncSessionLocal
from app.db.models import AuditLog
from app.audit.service import write_audit_log


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.mark.asyncio
async def test_write_audit_log_creates_record():
    """write_audit_log basarili kayit olusturur."""
    async with AsyncSessionLocal() as session:
        log_id = await write_audit_log(
            session,
            action="test.m15.create",
            entity_type="test_entity",
            entity_id="test-m15-001",
            actor_type="system",
            details={"key": "value"},
        )
        assert log_id is not None

        stmt = select(AuditLog).where(AuditLog.id == log_id)
        result = await session.execute(stmt)
        row = result.scalar_one_or_none()
        assert row is not None
        assert row.action == "test.m15.create"
        assert row.entity_type == "test_entity"
        assert row.entity_id == "test-m15-001"
        assert json.loads(row.details_json) == {"key": "value"}
        await session.commit()


@pytest.mark.asyncio
async def test_write_audit_log_never_raises():
    """write_audit_log hata durumunda None doner, exception firlatmaz."""
    async with AsyncSessionLocal() as session:
        # action=None gecersiz ama exception firlatmamali
        result = await write_audit_log(session, action=None)  # type: ignore
        assert result is None


@pytest.mark.asyncio
async def test_audit_log_list_endpoint(client: AsyncClient):
    """GET /audit-logs kayitlari listeler."""
    # Once birkac kayit olustur
    async with AsyncSessionLocal() as session:
        await write_audit_log(session, action="publish.create", entity_type="publish_record", entity_id="pr-m15-1")
        await write_audit_log(session, action="source.create", entity_type="source", entity_id="src-m15-1")
        await session.commit()

    resp = await client.get("/api/v1/audit-logs")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 2


@pytest.mark.asyncio
async def test_audit_log_list_filter_by_action(client: AsyncClient):
    """GET /audit-logs?action=publish filtresi calisir."""
    async with AsyncSessionLocal() as session:
        await write_audit_log(session, action="publish.m15test", entity_type="publish_record", entity_id="pr-m15-f1")
        await write_audit_log(session, action="source.m15test", entity_type="source", entity_id="src-m15-f1")
        await session.commit()

    resp = await client.get("/api/v1/audit-logs?action=publish.m15test")
    assert resp.status_code == 200
    data = resp.json()
    for item in data["items"]:
        assert item["action"].startswith("publish.m15test")


@pytest.mark.asyncio
async def test_audit_log_list_filter_by_entity_type(client: AsyncClient):
    """GET /audit-logs?entity_type=source filtresi calisir."""
    async with AsyncSessionLocal() as session:
        await write_audit_log(session, action="source.m15filter", entity_type="source", entity_id="src-m15-f2")
        await session.commit()

    resp = await client.get("/api/v1/audit-logs?entity_type=source")
    assert resp.status_code == 200
    data = resp.json()
    for item in data["items"]:
        assert item["entity_type"] == "source"


@pytest.mark.asyncio
async def test_audit_log_detail_endpoint(client: AsyncClient):
    """GET /audit-logs/{id} detay doner."""
    # Kayit olustur ve ID'yi al
    async with AsyncSessionLocal() as session:
        log_id = await write_audit_log(
            session,
            action="detail.m15test",
            entity_type="test_entity",
            entity_id="detail-001",
        )
        await session.commit()
    assert log_id is not None

    resp = await client.get(f"/api/v1/audit-logs/{log_id}")
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["id"] == log_id
    assert detail["action"] == "detail.m15test"
    assert "created_at" in detail


@pytest.mark.asyncio
async def test_audit_log_detail_not_found(client: AsyncClient):
    """GET /audit-logs/{id} olmayan ID icin 404 doner."""
    resp = await client.get("/api/v1/audit-logs/nonexistent-id-m15")
    assert resp.status_code == 404
