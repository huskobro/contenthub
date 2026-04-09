"""
Phase 4 Visibility Engine API tests.

Covers:
  A) visibility_rules table exists after migration
  B) POST /visibility-rules — create a rule
  C) GET /visibility-rules  — list rules
  D) GET /visibility-rules/{id} — fetch single rule
  E) PATCH /visibility-rules/{id} — partial update
  F) 404 on unknown id
  G) Invalid payload rejected (priority < 0)
"""

import pytest
from httpx import AsyncClient

BASE = "/api/v1/visibility-rules"


def _payload(**overrides) -> dict:
    base = {
        "rule_type": "field",
        "target_key": "test.field.sample",
        "visible": True,
        "read_only": False,
        "wizard_visible": False,
        "priority": 10,
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# A) Table existence
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_visibility_rules_table_exists(test_engine):
    from sqlalchemy import inspect

    async with test_engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names())
        )
    assert "visibility_rules" in tables


# ---------------------------------------------------------------------------
# B) Create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_visibility_rule(client: AsyncClient):
    response = await client.post(BASE, json=_payload())
    assert response.status_code == 201
    body = response.json()
    assert body["rule_type"] == "field"
    assert body["target_key"] == "test.field.sample"
    assert body["visible"] is True
    assert body["read_only"] is False
    assert body["priority"] == 10
    assert "id" in body
    assert "created_at" in body


# ---------------------------------------------------------------------------
# C) List
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_visibility_rules(client: AsyncClient):
    await client.post(BASE, json=_payload(target_key="test.list.key1"))
    response = await client.get(BASE)
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    keys = [r["target_key"] for r in body]
    assert "test.list.key1" in keys


@pytest.mark.asyncio
async def test_list_visibility_rules_filter_rule_type(client: AsyncClient):
    await client.post(BASE, json=_payload(target_key="test.ft.page", rule_type="page"))
    await client.post(BASE, json=_payload(target_key="test.ft.widget", rule_type="widget"))

    resp = await client.get(BASE, params={"rule_type": "page"})
    assert resp.status_code == 200
    types = [r["rule_type"] for r in resp.json()]
    assert all(t == "page" for t in types)
    assert any(r["target_key"] == "test.ft.page" for r in resp.json())


@pytest.mark.asyncio
async def test_list_visibility_rules_filter_role_scope(client: AsyncClient):
    await client.post(BASE, json=_payload(target_key="test.rs.admin", role_scope="admin"))
    await client.post(BASE, json=_payload(target_key="test.rs.user", role_scope="user"))

    resp = await client.get(BASE, params={"role_scope": "admin"})
    assert resp.status_code == 200
    scopes = [r["role_scope"] for r in resp.json()]
    assert all(s == "admin" for s in scopes)


# ---------------------------------------------------------------------------
# D) Fetch single
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_visibility_rule_by_id(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload(target_key="test.fetch.key"))
    assert create_resp.status_code == 201
    rule_id = create_resp.json()["id"]

    response = await client.get(f"{BASE}/{rule_id}")
    assert response.status_code == 200
    assert response.json()["id"] == rule_id
    assert response.json()["target_key"] == "test.fetch.key"


# ---------------------------------------------------------------------------
# E) Update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_visibility_rule(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload(target_key="test.update.key"))
    assert create_resp.status_code == 201
    rule_id = create_resp.json()["id"]

    patch_resp = await client.patch(
        f"{BASE}/{rule_id}",
        json={"visible": False, "read_only": True, "status": "inactive", "priority": 99},
    )
    assert patch_resp.status_code == 200
    body = patch_resp.json()
    assert body["visible"] is False
    assert body["read_only"] is True
    assert body["status"] == "inactive"
    assert body["priority"] == 99


# ---------------------------------------------------------------------------
# F) 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_visibility_rule_not_found(client: AsyncClient):
    response = await client.get(f"{BASE}/nonexistent-rule-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_visibility_rule_not_found(client: AsyncClient):
    response = await client.patch(
        f"{BASE}/nonexistent-rule-id",
        json={"visible": False},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# G) Invalid payload
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_rule_negative_priority_rejected(client: AsyncClient):
    response = await client.post(BASE, json=_payload(priority=-1))
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_rule_missing_required_fields_rejected(client: AsyncClient):
    # rule_type and target_key are required
    response = await client.post(BASE, json={"visible": True})
    assert response.status_code == 422
