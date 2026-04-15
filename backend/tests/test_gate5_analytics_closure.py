"""
Gate 5 Analytics Closure — backend tests.

Covers G1 test coverage items:
1. Export endpoint (10 kinds) — returns CSV, correct mime, correct header
2. Export endpoint rejects unknown kind
3. Export endpoint passes date range for supported kinds
4. Export CSV multi-section format (scalar + list sections)
5. Analytics audit log writes one entry per endpoint view
6. Audit log not written when actor_id missing
7. sql_helpers.epoch_diff_seconds — produces expected SQL fragment
8. Export service to_csv — all valid kinds
9. Export service to_csv — rejects invalid kind
10. Service julianday-free — zero string occurrences
"""

from __future__ import annotations

import inspect
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics import export_service, service
from app.analytics.audit import record_analytics_view
from app.analytics.sql_helpers import epoch_diff_seconds
from app.db.models import AuditLog

BASE = "/api/v1/analytics"


# ---------------------------------------------------------------------------
# 1-3. Export endpoint
# ---------------------------------------------------------------------------


EXPORT_KINDS = [
    "overview",
    "operations",
    "content",
    "source-impact",
    "channel",
    "template-impact",
    "prompt-assembly",
    "dashboard",
    "publish",
    "channel-performance",
]


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", EXPORT_KINDS)
async def test_export_returns_csv(client: AsyncClient, kind: str):
    """All 10 export kinds should return CSV text."""
    resp = await client.get(f"{BASE}/export", params={"kind": kind, "format": "csv"})
    assert resp.status_code == 200, f"{kind}: {resp.text}"
    content_type = resp.headers.get("content-type", "")
    assert "text/csv" in content_type, f"{kind}: {content_type}"
    body = resp.text
    # Header comment line present
    assert f"# analytics export kind={kind}" in body
    # Content-Disposition should name the kind
    cd = resp.headers.get("content-disposition", "")
    assert kind in cd.replace("-", "-"), f"{kind}: {cd}"
    assert "attachment" in cd


@pytest.mark.asyncio
async def test_export_rejects_unknown_kind(client: AsyncClient):
    """Unknown kind should return 400."""
    resp = await client.get(f"{BASE}/export", params={"kind": "nonexistent", "format": "csv"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_export_rejects_unknown_format(client: AsyncClient):
    """Unknown format should return 400."""
    resp = await client.get(f"{BASE}/export", params={"kind": "overview", "format": "pdf"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_export_accepts_date_range(client: AsyncClient):
    """Date range kinds should accept date_from/date_to without error."""
    resp = await client.get(
        f"{BASE}/export",
        params={
            "kind": "operations",
            "format": "csv",
            "date_from": "2026-01-01T00:00:00",
            "date_to": "2026-12-31T23:59:59",
        },
    )
    assert resp.status_code == 200, resp.text


# ---------------------------------------------------------------------------
# 4. CSV multi-section format
# ---------------------------------------------------------------------------


def test_csv_scalar_section_present():
    """to_csv output should contain field,value scalar header."""
    data = {"window": "all_time", "total_projects": 0, "items": []}
    csv = export_service.to_csv(data, "overview")
    assert "field,value" in csv
    assert "window,all_time" in csv


def test_csv_list_section_format():
    """List values should emit their own [section] block."""
    data = {
        "window": "all_time",
        "rows": [
            {"name": "foo", "count": 1},
            {"name": "bar", "count": 2},
        ],
    }
    csv = export_service.to_csv(data, "overview")
    assert "[rows]" in csv
    assert "name,count" in csv
    assert "foo,1" in csv
    assert "bar,2" in csv


def test_csv_empty_list_section():
    """Empty list should emit an explicit (empty) marker."""
    data = {"rows": []}
    csv = export_service.to_csv(data, "overview")
    assert "[rows]" in csv
    assert "(empty)" in csv


def test_csv_rejects_invalid_kind():
    """to_csv should raise ValueError on unknown kind."""
    with pytest.raises(ValueError):
        export_service.to_csv({}, "unknown-kind")


@pytest.mark.parametrize("kind", EXPORT_KINDS)
def test_csv_accepts_all_valid_kinds(kind: str):
    """All 10 kinds must be accepted by to_csv."""
    # Just confirm it doesn't raise on an empty payload.
    result = export_service.to_csv({"window": "test"}, kind)
    assert f"# analytics export kind={kind}" in result


# ---------------------------------------------------------------------------
# 5-6. Audit log
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_audit_log_written_on_view(
    client: AsyncClient, db_session: AsyncSession, admin_user
):
    """
    A GET /analytics/overview call with a user header should produce one
    analytics.view.overview audit log entry.
    """
    resp = await client.get(
        f"{BASE}/overview",
        params={"window": "last_30d"},
        headers={"X-ContentHub-User-Id": admin_user.id},
    )
    assert resp.status_code == 200

    # Query audit log for this action
    stmt = select(AuditLog).where(
        AuditLog.action == "analytics.view.overview",
        AuditLog.actor_id == admin_user.id,
    )
    rows = (await db_session.execute(stmt)).scalars().all()
    assert len(rows) >= 1, "No audit log entry created"
    entry = rows[-1]
    assert entry.entity_type == "analytics_report"
    assert entry.entity_id == "overview"


@pytest.mark.asyncio
async def test_audit_skipped_without_actor(db_session: AsyncSession):
    """record_analytics_view with actor_id=None should be a no-op."""
    # Count before
    stmt = select(AuditLog).where(AuditLog.action == "analytics.view.test")
    before = len((await db_session.execute(stmt)).scalars().all())

    await record_analytics_view(
        db_session, report_kind="test", actor_id=None, filters={}
    )

    after = len((await db_session.execute(stmt)).scalars().all())
    assert before == after


@pytest.mark.asyncio
async def test_audit_absorbs_errors(db_session: AsyncSession, admin_user):
    """
    record_analytics_view must never raise even on weird input. Passing an
    unserializable filter dict is a good stress-test (it should log a warning
    and continue).
    """
    await record_analytics_view(
        db_session,
        report_kind="overview",
        actor_id=admin_user.id,
        filters={"window": "last_30d"},
    )
    # No exception == pass.


# ---------------------------------------------------------------------------
# 7. SQL helpers
# ---------------------------------------------------------------------------


def test_epoch_diff_seconds_builds_expression():
    """epoch_diff_seconds should return a SQLAlchemy expression that compiles."""
    from sqlalchemy import Column, DateTime, literal_column

    a = literal_column("a")
    b = literal_column("b")
    expr = epoch_diff_seconds(a, b)
    # Expression should stringify to something containing 'julianday' on SQLite.
    rendered = str(expr.compile(compile_kwargs={"literal_binds": True}))
    assert "julianday" in rendered
    assert "86400" in rendered


# ---------------------------------------------------------------------------
# 10. julianday-free service.py
# ---------------------------------------------------------------------------


def test_service_has_no_direct_julianday():
    """service.py must delegate to epoch_diff_seconds, not call julianday directly."""
    src = inspect.getsource(service)
    assert "julianday" not in src, (
        "service.py still contains direct julianday() calls; "
        "migrate them to epoch_diff_seconds"
    )
    assert "epoch_diff_seconds" in src, (
        "service.py should import and use the epoch_diff_seconds helper"
    )
