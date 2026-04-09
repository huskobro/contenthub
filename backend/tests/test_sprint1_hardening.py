"""
Sprint 1 — Must-Fix Hardening Tests.

Tests:
  1. JWT secret loads from env (not hardcoded)
  2. Default caller role is "user" (not "admin")
  3. Legacy header bypass requires debug mode
  4. Unauthenticated admin endpoint returns 401
  5. User role on admin endpoint returns 403
  6. Wizard config seed creates configs on empty DB
  7. Job completed → notification emitted (job_completed in map)
  8. Job completed → draft publish record created
  9. Fresh DB alembic chain is valid (single head)
"""

from __future__ import annotations

import json
import pytest
from unittest.mock import patch
from uuid import uuid4 as _uuid4
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.session import get_db
from app.db.models import Base, User, Job
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

_uuid = lambda: str(_uuid4())

# ---------------------------------------------------------------------------
# DB fixtures
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


async def _override_get_db():
    async with TestSession() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session():
    async with TestSession() as session:
        yield session


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_admin(db: AsyncSession) -> User:
    from app.auth.password import hash_password
    slug = f"admin-{_uuid()[:8]}"
    u = User(
        email=f"{slug}@test.com",
        display_name="Test Admin",
        slug=slug,
        role="admin",
        status="active",
        password_hash=hash_password("testpass123"),
    )
    db.add(u)
    await db.commit()
    return u


async def _create_user(db: AsyncSession) -> User:
    from app.auth.password import hash_password
    slug = f"user-{_uuid()[:8]}"
    u = User(
        email=f"{slug}@test.com",
        display_name="Test User",
        slug=slug,
        role="user",
        status="active",
        password_hash=hash_password("testpass123"),
    )
    db.add(u)
    await db.commit()
    return u


def _get_token_for_user(user: User) -> str:
    from app.auth.jwt import create_access_token
    return create_access_token({"sub": user.id})


# ---------------------------------------------------------------------------
# Test 1: JWT secret is not the old hardcoded value
# ---------------------------------------------------------------------------

def test_jwt_secret_not_hardcoded():
    from app.auth.jwt import SECRET_KEY
    assert SECRET_KEY != "contenthub-dev-secret-change-in-production", \
        "JWT secret should not be the old hardcoded value"


# ---------------------------------------------------------------------------
# Test 2: Default caller role is "user"
# ---------------------------------------------------------------------------

def test_default_caller_role_is_user():
    from app.visibility.dependencies import get_caller_role
    import inspect
    # get_caller_role is a sync function with a default param
    sig = inspect.signature(get_caller_role)
    # Call with no header
    result = get_caller_role(x_contenthub_role=None)
    assert result == "user", "Default role should be 'user', not 'admin'"


# ---------------------------------------------------------------------------
# Test 3: Legacy header bypass requires debug mode
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_legacy_header_bypass_requires_debug(db_session, client):
    admin = await _create_admin(db_session)
    # With debug=False, legacy header should NOT authenticate
    with patch("app.auth.dependencies.settings") as mock_settings:
        mock_settings.debug = False
        resp = await client.get(
            "/api/v1/users",
            headers={"X-ContentHub-User-Id": admin.id},
        )
        assert resp.status_code == 401, "Legacy header should be rejected when debug=False"


# ---------------------------------------------------------------------------
# Test 4: Unauthenticated admin endpoint returns 401
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unauthenticated_admin_endpoint_returns_401(client):
    resp = await client.get("/api/v1/users")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Test 5: User role on admin endpoint returns 403
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_role_denied_admin_endpoint(db_session, client):
    user = await _create_user(db_session)
    token = _get_token_for_user(user)
    resp = await client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403, "Non-admin user should be denied on admin endpoint"


# ---------------------------------------------------------------------------
# Test 6: Wizard config seed works
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_wizard_config_seed(db_session):
    from app.wizard_configs.seed import seed_wizard_configs
    count = await seed_wizard_configs(db_session)
    assert count >= 2, "Should seed at least 2 wizard configs (standard_video + news_bulletin)"
    # Idempotent — running again should insert 0
    count2 = await seed_wizard_configs(db_session)
    assert count2 == 0, "Second seed should insert 0 (idempotent)"


# ---------------------------------------------------------------------------
# Test 7: job_completed is in notification map
# ---------------------------------------------------------------------------

def test_job_completed_in_notification_map():
    from app.automation.event_hooks import _NOTIFICATION_MAP
    assert "job_completed" in _NOTIFICATION_MAP, "job_completed must be in notification map"
    severity, scope, label = _NOTIFICATION_MAP["job_completed"]
    assert severity == "success"
    assert scope == "user"


# ---------------------------------------------------------------------------
# Test 8: Job completed triggers publish record creation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_job_completed_creates_publish_record(db_session):
    """Verify that transitioning a job to completed calls create_publish_record_from_job."""
    from app.jobs.service import transition_job_status

    admin = await _create_admin(db_session)
    job = Job(
        module_type="standard_video",
        status="running",
        owner_id=admin.id,
    )
    db_session.add(job)
    await db_session.commit()

    # Transition to completed — should attempt publish record creation
    from unittest.mock import AsyncMock
    with patch("app.publish.service.create_publish_record_from_job", new_callable=AsyncMock) as mock_pub:
        mock_pub.return_value = None  # Simulate a PublishRecord
        await transition_job_status(db_session, job.id, "completed")
        mock_pub.assert_called_once()
        call_kwargs = mock_pub.call_args
        assert call_kwargs[1].get("job_id") == job.id or (len(call_kwargs[0]) > 1 and call_kwargs[0][1] == job.id)


# ---------------------------------------------------------------------------
# Test 9: Alembic chain has single head
# ---------------------------------------------------------------------------

def test_alembic_single_head():
    """Verify alembic has exactly one head revision."""
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    import os

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    script = ScriptDirectory.from_config(alembic_cfg)
    heads = list(script.get_heads())
    assert len(heads) == 1, f"Expected 1 head, got {len(heads)}: {heads}"
