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

import pytest
from httpx import AsyncClient

BASE = "/api/v1/settings"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _payload(**overrides) -> dict:
    base = {
        "key": "test.sample_key",
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
    assert body["key"] == "test.sample_key"
    assert body["group_name"] == "test"
    assert body["type"] == "string"
    assert body["version"] == 1
    assert "id" in body
    assert "created_at" in body

    # Cleanup
    await client.delete(f"{BASE}/{body['id']}") if False else None  # delete not implemented


# ---------------------------------------------------------------------------
# C) List
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_settings_returns_list(client: AsyncClient):
    # Create one so list is non-empty
    create_resp = await client.post(BASE, json=_payload(key="test.list_key"))
    assert create_resp.status_code == 201

    response = await client.get(BASE)
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    keys = [s["key"] for s in body]
    assert "test.list_key" in keys


@pytest.mark.asyncio
async def test_list_settings_group_filter(client: AsyncClient):
    await client.post(BASE, json=_payload(key="test.gf_key", group_name="groupA"))
    await client.post(BASE, json=_payload(key="test.gf_key2", group_name="groupB"))

    resp_a = await client.get(BASE, params={"group_name": "groupA"})
    assert resp_a.status_code == 200
    groups_a = [s["group_name"] for s in resp_a.json()]
    assert all(g == "groupA" for g in groups_a)
    assert any(s["key"] == "test.gf_key" for s in resp_a.json())


# ---------------------------------------------------------------------------
# D) Fetch single
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_setting_by_id(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload(key="test.fetch_key"))
    assert create_resp.status_code == 201
    setting_id = create_resp.json()["id"]

    response = await client.get(f"{BASE}/{setting_id}")
    assert response.status_code == 200
    assert response.json()["id"] == setting_id
    assert response.json()["key"] == "test.fetch_key"


@pytest.mark.asyncio
async def test_get_setting_not_found(client: AsyncClient):
    response = await client.get(f"{BASE}/nonexistent-id-000")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# E) Update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_setting(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload(key="test.update_key"))
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
    await client.post(BASE, json=_payload(key="test.dup_key"))
    resp2 = await client.post(BASE, json=_payload(key="test.dup_key"))
    assert resp2.status_code == 409
