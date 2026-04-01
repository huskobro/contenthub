"""
Phase 21 Style Blueprints API tests.

Covers:
  A) style_blueprints table exists after migration
  B) POST /style-blueprints — create
  C) GET /style-blueprints  — list
  D) GET /style-blueprints/{id} — get by id
  E) PATCH /style-blueprints/{id} — partial update
  F) Missing required field returns 422
  G) Blank name returns 422
  H) GET not found returns 404
  I) PATCH not found returns 404
  J) Filter by module_scope
  K) Negative version returns 422
"""

import uuid
import sqlite3
import pytest
from httpx import AsyncClient

BASE = "/api/v1/style-blueprints"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _payload(**overrides) -> dict:
    base = {"name": f"Test Blueprint {_uid()}"}
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# A) Table exists
# ---------------------------------------------------------------------------

def test_style_blueprints_table_exists():
    from app.core.config import settings
    db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
    conn = sqlite3.connect(db_path)
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='style_blueprints'"
    )
    row = cur.fetchone()
    conn.close()
    assert row is not None, "style_blueprints table should exist after migration"


# ---------------------------------------------------------------------------
# B) Create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_style_blueprint(client: AsyncClient):
    payload = _payload(
        module_scope="standard_video",
        status="draft",
        version=1,
        visual_rules_json='{"bg_color": "#000"}',
        notes="A test blueprint",
    )
    resp = await client.post(BASE, json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == payload["name"]
    assert data["module_scope"] == "standard_video"
    assert data["status"] == "draft"
    assert data["version"] == 1
    assert data["visual_rules_json"] == '{"bg_color": "#000"}'
    assert "id" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# C) List
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_style_blueprints(client: AsyncClient):
    payload = _payload(status="active")
    await client.post(BASE, json=payload)
    resp = await client.get(BASE)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


# ---------------------------------------------------------------------------
# D) Get by id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_style_blueprint_by_id(client: AsyncClient):
    payload = _payload(notes="detail test")
    created = (await client.post(BASE, json=payload)).json()
    resp = await client.get(f"{BASE}/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]
    assert resp.json()["name"] == payload["name"]


# ---------------------------------------------------------------------------
# E) Update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_style_blueprint(client: AsyncClient):
    payload = _payload(status="draft")
    created = (await client.post(BASE, json=payload)).json()
    resp = await client.patch(
        f"{BASE}/{created['id']}",
        json={"status": "active", "notes": "updated notes"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert data["notes"] == "updated notes"


# ---------------------------------------------------------------------------
# F) Missing required field → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_blueprint_missing_required(client: AsyncClient):
    resp = await client.post(BASE, json={})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# G) Blank name → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_blueprint_blank_name(client: AsyncClient):
    resp = await client.post(BASE, json={"name": "   "})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# H) GET not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_blueprint_not_found(client: AsyncClient):
    fake_id = uuid.uuid4().hex
    resp = await client.get(f"{BASE}/{fake_id}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# I) PATCH not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_blueprint_not_found(client: AsyncClient):
    fake_id = uuid.uuid4().hex
    resp = await client.patch(f"{BASE}/{fake_id}", json={"status": "active"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# J) Filter by module_scope
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_filter_by_module_scope(client: AsyncClient):
    scope = f"module_{_uid()}"
    payload = _payload(module_scope=scope)
    await client.post(BASE, json=payload)
    resp = await client.get(f"{BASE}?module_scope={scope}")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert all(item["module_scope"] == scope for item in items)


# ---------------------------------------------------------------------------
# K) Negative version → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_blueprint_negative_version(client: AsyncClient):
    resp = await client.post(BASE, json={"name": "neg test", "version": -1})
    assert resp.status_code == 422
