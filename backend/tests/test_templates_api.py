"""
Phase 18 Templates API tests.

Covers:
  A) templates table exists after migration
  B) POST /templates — create a template
  C) GET /templates  — list templates
  D) GET /templates/{id} — fetch single template
  E) PATCH /templates/{id} — partial update
  F) Invalid payload (missing required fields) returns 422
  G) Not found returns 404
  H) Filter by template_type query param
  I) Negative version returns 422
"""

import uuid
import sqlite3
import pytest
from httpx import AsyncClient

BASE = "/api/v1/templates"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _payload(**overrides) -> dict:
    base = {
        "name": f"Test Template {_uid()}",
        "template_type": "style",
        "owner_scope": "admin",
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# A) Table exists
# ---------------------------------------------------------------------------

def test_templates_table_exists():
    """Check that the templates table was created by the migration."""
    from app.core.config import settings
    db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
    conn = sqlite3.connect(db_path)
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='templates'"
    )
    row = cur.fetchone()
    conn.close()
    assert row is not None, "templates table should exist after migration"


# ---------------------------------------------------------------------------
# B) Create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_template(client: AsyncClient):
    payload = _payload(
        template_type="style",
        owner_scope="admin",
        module_scope="standard_video",
        description="A test style template",
        status="draft",
        version=1,
    )
    resp = await client.post(BASE, json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["name"] == payload["name"]
    assert data["template_type"] == "style"
    assert data["owner_scope"] == "admin"
    assert data["module_scope"] == "standard_video"
    assert data["status"] == "draft"
    assert data["version"] == 1
    assert "id" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# C) List
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_templates(client: AsyncClient):
    payload = _payload()
    await client.post(BASE, json=payload)
    resp = await client.get(BASE)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1


# ---------------------------------------------------------------------------
# D) Get by ID
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_template_by_id(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload())
    assert create_resp.status_code == 201
    template_id = create_resp.json()["id"]

    resp = await client.get(f"{BASE}/{template_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == template_id


# ---------------------------------------------------------------------------
# E) Patch / Update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_template(client: AsyncClient):
    create_resp = await client.post(BASE, json=_payload(status="draft"))
    assert create_resp.status_code == 201
    template_id = create_resp.json()["id"]

    patch_resp = await client.patch(
        f"{BASE}/{template_id}",
        json={"status": "active", "description": "Updated description"},
    )
    assert patch_resp.status_code == 200
    data = patch_resp.json()
    assert data["status"] == "active"
    assert data["description"] == "Updated description"


# ---------------------------------------------------------------------------
# F) Invalid payload — missing required fields
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_template_missing_required(client: AsyncClient):
    resp = await client.post(BASE, json={"name": "only name"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_template_blank_name(client: AsyncClient):
    resp = await client.post(
        BASE,
        json={"name": "   ", "template_type": "style", "owner_scope": "admin"},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# G) Not found
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_template_not_found(client: AsyncClient):
    resp = await client.get(f"{BASE}/nonexistent-id-{_uid()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_template_not_found(client: AsyncClient):
    resp = await client.patch(
        f"{BASE}/nonexistent-id-{_uid()}",
        json={"status": "active"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# H) Filter by template_type
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_filter_by_template_type(client: AsyncClient):
    uid = _uid()
    await client.post(BASE, json=_payload(name=f"style-{uid}", template_type="style"))
    await client.post(BASE, json=_payload(name=f"content-{uid}", template_type="content"))

    resp = await client.get(f"{BASE}?template_type=style")
    assert resp.status_code == 200
    data = resp.json()
    # All returned items must be style type
    for item in data:
        assert item["template_type"] == "style", f"Unexpected type: {item['template_type']}"


# ---------------------------------------------------------------------------
# I) Negative version returns 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_template_negative_version(client: AsyncClient):
    resp = await client.post(
        BASE,
        json={"name": "test", "template_type": "style", "owner_scope": "admin", "version": -1},
    )
    assert resp.status_code == 422
