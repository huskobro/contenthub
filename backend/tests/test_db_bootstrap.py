"""
Phase 2 DB Bootstrap Tests.

Verifies:
  - Async engine and session factory are importable and functional
  - All three foundation tables exist in the migrated database
  - WAL mode is enabled on each new connection
  - Foreign key enforcement is active on each new connection
  - A full CRUD round-trip works on AppState (smoke test for write path)
"""

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal, engine
from app.db.models import AppState


EXPECTED_TABLES = {"app_state", "audit_logs", "users"}


@pytest.mark.asyncio
async def test_engine_connects():
    """Engine can open a connection without error."""
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        row = result.fetchone()
    assert row[0] == 1


@pytest.mark.asyncio
async def test_wal_mode_enabled():
    """Every new connection must report WAL journal mode."""
    async with engine.connect() as conn:
        result = await conn.execute(text("PRAGMA journal_mode"))
        mode = result.fetchone()[0]
    assert mode == "wal", f"Expected WAL, got: {mode}"


@pytest.mark.asyncio
async def test_foreign_keys_enabled():
    """Every new connection must have foreign key enforcement on."""
    async with engine.connect() as conn:
        result = await conn.execute(text("PRAGMA foreign_keys"))
        fk = result.fetchone()[0]
    assert fk == 1, f"Expected foreign_keys=1, got: {fk}"


@pytest.mark.asyncio
async def test_foundation_tables_exist():
    """All three bootstrap tables must exist after migration."""
    async with engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names())
        )
    missing = EXPECTED_TABLES - tables
    assert not missing, f"Missing tables: {missing}"


@pytest.mark.asyncio
async def test_session_factory_yields_session():
    """AsyncSessionLocal must yield a valid AsyncSession."""
    async with AsyncSessionLocal() as session:
        assert isinstance(session, AsyncSession)


@pytest.mark.asyncio
async def test_app_state_crud():
    """Write and read an AppState row as a write-path smoke test."""
    async with AsyncSessionLocal() as session:
        async with session.begin():
            row = AppState(key="__bootstrap_test__", value_json='{"ok": true}')
            session.add(row)

        # Read it back
        result = await session.execute(
            text("SELECT key, value_json FROM app_state WHERE key = '__bootstrap_test__'")
        )
        found = result.fetchone()

    assert found is not None, "Row not found after insert"
    assert found[0] == "__bootstrap_test__"
    assert '"ok": true' in found[1]

    # Cleanup: remove the test row
    async with AsyncSessionLocal() as session:
        async with session.begin():
            await session.execute(
                text("DELETE FROM app_state WHERE key = '__bootstrap_test__'")
            )
