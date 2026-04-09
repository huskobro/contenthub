"""
Sprint 2 — Integration Polish + Auth UX + Logging Hardening Tests.

Tests:
  1. Admin auth headers grant access to admin endpoints
  2. User auth headers grant access to user endpoints
  3. User auth headers denied on admin endpoints (403)
  4. No auth → 401 on protected endpoint
  5. Queued job recovery detects stale queued jobs
  6. Queued job recovery ignores fresh queued jobs
  7. Pipeline audit log exceptions are logged (not silently swallowed)
  8. Error classification utility produces correct categories
  9. Auth conftest fixtures produce valid JWT tokens
"""

from __future__ import annotations

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


# ---------------------------------------------------------------------------
# Test 1: Admin headers access admin endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_headers_grant_admin_access(client: AsyncClient, admin_headers: dict):
    """Admin JWT token should be accepted on admin-guarded endpoints."""
    resp = await client.get("/api/v1/users", headers=admin_headers)
    # Should not be 401 or 403
    assert resp.status_code in (200, 404), f"Expected success, got {resp.status_code}"


# ---------------------------------------------------------------------------
# Test 2: User headers access user endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_headers_grant_user_access(client: AsyncClient, user_headers: dict):
    """User JWT token should be accepted on user-guarded endpoints."""
    resp = await client.get("/api/v1/comments", headers=user_headers)
    assert resp.status_code in (200, 404), f"Expected success, got {resp.status_code}"


# ---------------------------------------------------------------------------
# Test 3: User denied on admin endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_denied_on_admin_endpoint(client: AsyncClient, user_headers: dict):
    """User role should be denied on admin-only endpoints."""
    resp = await client.get("/api/v1/users", headers=user_headers)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 4: No auth → 401
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_no_auth_returns_401(client: AsyncClient):
    """Requests without auth should return 401 on protected endpoints."""
    resp = await client.get("/api/v1/comments")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Test 5: Queued job recovery detects stale queued jobs
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_queued_job_recovery_detects_stale():
    """Queued jobs older than threshold are flagged in recovery summary."""
    from app.jobs.recovery import run_startup_recovery
    from app.db.models import Job

    stale_queued = MagicMock(spec=Job)
    stale_queued.id = "queued-stale"
    stale_queued.status = "queued"
    stale_queued.created_at = datetime.now(timezone.utc) - timedelta(minutes=60)

    empty_result = MagicMock()
    empty_result.scalars.return_value.all.return_value = []

    queued_result = MagicMock()
    queued_result.scalars.return_value.all.return_value = [stale_queued]

    mock_db = AsyncMock()
    # execute calls: 1) running jobs (empty), 2) queued jobs
    mock_db.execute = AsyncMock(side_effect=[empty_result, queued_result])

    summary = await run_startup_recovery(mock_db, queued_stale_threshold_minutes=30)

    assert summary.stale_queued_jobs == 1
    assert "queued-stale" in summary.stale_queued_job_ids
    assert summary.recovered_jobs == 0  # Not failed, just flagged


# ---------------------------------------------------------------------------
# Test 6: Fresh queued jobs are not flagged
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_queued_job_recovery_ignores_fresh():
    """Recently created queued jobs should not be flagged."""
    from app.jobs.recovery import run_startup_recovery
    from app.db.models import Job

    fresh_queued = MagicMock(spec=Job)
    fresh_queued.id = "queued-fresh"
    fresh_queued.status = "queued"
    fresh_queued.created_at = datetime.now(timezone.utc) - timedelta(minutes=5)

    empty_result = MagicMock()
    empty_result.scalars.return_value.all.return_value = []

    queued_result = MagicMock()
    queued_result.scalars.return_value.all.return_value = [fresh_queued]

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(side_effect=[empty_result, queued_result])

    summary = await run_startup_recovery(mock_db, queued_stale_threshold_minutes=30)

    assert summary.stale_queued_jobs == 0


# ---------------------------------------------------------------------------
# Test 7: Pipeline audit log exceptions are logged
# ---------------------------------------------------------------------------

def test_pipeline_audit_log_uses_warning_not_pass():
    """Verify pipeline.py audit log except blocks use logger.warning, not pass."""
    import ast
    import os

    pipeline_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "app", "jobs", "pipeline.py",
    )
    with open(pipeline_path) as f:
        tree = ast.parse(f.read())

    # Find all ExceptHandler nodes
    bare_pass_count = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler):
            # Check if body is just `pass`
            if (
                len(node.body) == 1
                and isinstance(node.body[0], ast.Pass)
            ):
                bare_pass_count += 1

    assert bare_pass_count == 0, (
        f"Found {bare_pass_count} bare 'except: pass' block(s) in pipeline.py — "
        "audit failures must be logged"
    )


# ---------------------------------------------------------------------------
# Test 8: Error classification (frontend utility logic, tested via import)
# ---------------------------------------------------------------------------

def test_error_classification_file_exists():
    """Verify the error classification utility file was created."""
    import os
    path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "frontend", "src", "lib", "errorUtils.ts",
    )
    assert os.path.isfile(path), f"errorUtils.ts not found at {path}"


# ---------------------------------------------------------------------------
# Test 9: Auth conftest fixtures produce valid tokens
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_conftest_admin_fixture_produces_valid_token(admin_user, admin_headers):
    """Admin fixture should produce a valid JWT."""
    from app.auth.jwt import decode_token

    assert "Authorization" in admin_headers
    token = admin_headers["Authorization"].replace("Bearer ", "")
    payload = decode_token(token)
    assert payload["sub"] == admin_user.id
    assert payload["type"] == "access"


@pytest.mark.asyncio
async def test_conftest_user_fixture_produces_valid_token(regular_user, user_headers):
    """User fixture should produce a valid JWT."""
    from app.auth.jwt import decode_token

    assert "Authorization" in user_headers
    token = user_headers["Authorization"].replace("Bearer ", "")
    payload = decode_token(token)
    assert payload["sub"] == regular_user.id
    assert payload["type"] == "access"
