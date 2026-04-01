"""
Phase 3 Settings Registry API tests.

Covers:
  A) settings table exists after migration
  B) POST /settings — create a setting
  C) GET /settings  — list settings
  D) GET /settings/{id} — fetch single setting
  E) PATCH /settings/{id} — partial update + version bump
  F) Duplicate key returns 409
  G) Existing health tests are not broken (verified in separate file)
"""

import uuid
import pytest
from httpx import AsyncClient

BASE = "/api/v1/settings"


def _uid() -> str:
    """Short unique suffix so test keys never collide across runs."""
    return uuid.uuid4().hex[:8]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _payload(**overrides) -> dict:
    base = {
        "key": f"test.sample_key.{_uid()}",
        "group_name": "test",
        "type": "string",
        "default_value_json": '"hello"',
        "admin_value_json": '"hello"',
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# A) Table existence
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_settings_table_exists():
    """settings table must exist in the migrated database."""
    from sqlalchemy import inspect, text
    from app.db.session import engine

    async with engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names())
        )
    assert "settings" in tables


# ---------------------------------------------------------------------------
# B) Create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_setting(client: AsyncClient):
    response = await client.post(BASE, json=_payload())
    assert response.status_code == 201
    body = response.json()
    assert body["key"].startswith("test.sample_key.")
    assert body["group_name"] == "test"
    assert body["type"] == "string"
    assert body["version"] == 1
    assert "id" in body
    assert "created_at" in body


# ---------------------------------------------------------------------------
# C) List
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_settings_returns_list(client: AsyncClient):
    # Create one so list is non-empty
    created = await client.post(BASE, json=_payload())
    assert created.status_code == 201
    created_key = created.json()["key"]

    response = await client.get(BASE)
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    keys = [s["key"] for s in body]
    assert created_key in keys


@pytest.mark.asyncio
async def test_list_settings_group_filter(client: AsyncClient):
    uid = _uid()
    await client.post(BASE, json=_payload(key=f"test.gf_key.{uid}", group_name="groupA"))
    await client.post(BASE, json=_payload(key=f"test.gf_key2.{uid}", group_name="groupB"))

    resp_a = await client.get(BASE, params={"group_name": "groupA"})
    assert resp_a.status_code == 200
    groups_a = [s["group_name"] for s in resp_a.json()]
    assert all(g == "groupA" for g in groups_a)
    assert any(s["key"] == f"test.gf_key.{uid}" for s in resp_a.json())


# ---------------------------------------------------------------------------
# D) Fetch single
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_setting_by_id(client: AsyncClient):
    p = _payload()
    create_resp = await client.post(BASE, json=p)
    assert create_resp.status_code == 201
    setting_id = create_resp.json()["id"]

    response = await client.get(f"{BASE}/{setting_id}")
    assert response.status_code == 200
    assert response.json()["id"] == setting_id
    assert response.json()["key"] == p["key"]


@pytest.mark.asyncio
async def test_get_setting_not_found(client: AsyncClient):
    response = await client.get(f"{BASE}/nonexistent-id-000")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# E) Update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_setting(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload())
    assert create_resp.status_code == 201
    setting_id = create_resp.json()["id"]

    patch_resp = await client.patch(
        f"{BASE}/{setting_id}",
        json={"help_text": "Updated help", "status": "inactive"},
    )
    assert patch_resp.status_code == 200
    body = patch_resp.json()
    assert body["help_text"] == "Updated help"
    assert body["status"] == "inactive"
    # Version must be incremented
    assert body["version"] == 2


@pytest.mark.asyncio
async def test_update_setting_not_found(client: AsyncClient):
    response = await client.patch(
        f"{BASE}/nonexistent-id-000",
        json={"status": "inactive"},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# F) Duplicate key → 409
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_duplicate_key_returns_409(client: AsyncClient):
    dup_key = f"test.dup_key.{_uid()}"
    await client.post(BASE, json=_payload(key=dup_key))
    resp2 = await client.post(BASE, json=_payload(key=dup_key))
    assert resp2.status_code == 409
