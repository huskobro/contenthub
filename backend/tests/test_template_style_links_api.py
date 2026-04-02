"""
Phase 43 Template Style Links API tests.

Covers:
  A) template_style_links table exists after migration
  B) POST /template-style-links — create link
  C) GET /template-style-links — list links
  D) GET /template-style-links/{id} — detail
  E) PATCH /template-style-links/{id} — update
  F) Invalid payload → 422
  G) Template not found → 404
  H) Style blueprint not found → 404
  I) Duplicate create → 409
  J) Link id not found → 404
"""

import uuid
import sqlite3
import pytest
from httpx import AsyncClient

BASE = "/api/v1/template-style-links"
TEMPLATES_BASE = "/api/v1/templates"
BLUEPRINTS_BASE = "/api/v1/style-blueprints"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


async def _create_template(client: AsyncClient) -> str:
    resp = await client.post(
        TEMPLATES_BASE,
        json={
            "name": f"Template {_uid()}",
            "template_type": "style",
            "owner_scope": "admin",
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_blueprint(client: AsyncClient) -> str:
    resp = await client.post(
        BLUEPRINTS_BASE,
        json={"name": f"Blueprint {_uid()}"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# A) Table exists
# ---------------------------------------------------------------------------

def test_template_style_links_table_exists():
    from app.core.config import settings
    db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
    conn = sqlite3.connect(db_path)
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='template_style_links'"
    )
    row = cur.fetchone()
    conn.close()
    assert row is not None, "template_style_links table should exist after migration"


# ---------------------------------------------------------------------------
# B) Create link
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_template_style_link(client: AsyncClient):
    tid = await _create_template(client)
    bid = await _create_blueprint(client)
    resp = await client.post(
        BASE,
        json={
            "template_id": tid,
            "style_blueprint_id": bid,
            "link_role": "primary",
            "status": "active",
            "notes": "test link",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["template_id"] == tid
    assert data["style_blueprint_id"] == bid
    assert data["link_role"] == "primary"
    assert data["status"] == "active"
    assert data["notes"] == "test link"
    assert "id" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# C) List links
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_template_style_links(client: AsyncClient):
    tid = await _create_template(client)
    bid1 = await _create_blueprint(client)
    bid2 = await _create_blueprint(client)
    await client.post(BASE, json={"template_id": tid, "style_blueprint_id": bid1})
    await client.post(BASE, json={"template_id": tid, "style_blueprint_id": bid2})
    resp = await client.get(BASE, params={"template_id": tid})
    assert resp.status_code == 200
    items = resp.json()
    ids = [i["style_blueprint_id"] for i in items]
    assert bid1 in ids
    assert bid2 in ids


# ---------------------------------------------------------------------------
# D) Detail
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_template_style_link_detail(client: AsyncClient):
    tid = await _create_template(client)
    bid = await _create_blueprint(client)
    create_resp = await client.post(
        BASE, json={"template_id": tid, "style_blueprint_id": bid}
    )
    link_id = create_resp.json()["id"]
    resp = await client.get(f"{BASE}/{link_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == link_id


# ---------------------------------------------------------------------------
# E) Update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_template_style_link(client: AsyncClient):
    tid = await _create_template(client)
    bid = await _create_blueprint(client)
    create_resp = await client.post(
        BASE, json={"template_id": tid, "style_blueprint_id": bid, "link_role": "primary"}
    )
    link_id = create_resp.json()["id"]
    resp = await client.patch(
        f"{BASE}/{link_id}",
        json={"link_role": "fallback", "status": "inactive", "notes": "updated"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["link_role"] == "fallback"
    assert data["status"] == "inactive"
    assert data["notes"] == "updated"


# ---------------------------------------------------------------------------
# F) Invalid payload → 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_link_missing_required_fields(client: AsyncClient):
    resp = await client.post(BASE, json={"link_role": "primary"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# G) Template not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_link_template_not_found(client: AsyncClient):
    bid = await _create_blueprint(client)
    resp = await client.post(
        BASE,
        json={"template_id": uuid.uuid4().hex, "style_blueprint_id": bid},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# H) Style blueprint not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_link_blueprint_not_found(client: AsyncClient):
    tid = await _create_template(client)
    resp = await client.post(
        BASE,
        json={"template_id": tid, "style_blueprint_id": uuid.uuid4().hex},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# I) Duplicate → 409
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_duplicate_link_rejected(client: AsyncClient):
    tid = await _create_template(client)
    bid = await _create_blueprint(client)
    resp1 = await client.post(BASE, json={"template_id": tid, "style_blueprint_id": bid})
    assert resp1.status_code == 201
    resp2 = await client.post(BASE, json={"template_id": tid, "style_blueprint_id": bid})
    assert resp2.status_code == 409


# ---------------------------------------------------------------------------
# J) Link id not found → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_link_not_found(client: AsyncClient):
    resp = await client.get(f"{BASE}/{uuid.uuid4().hex}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_link_not_found(client: AsyncClient):
    resp = await client.patch(f"{BASE}/{uuid.uuid4().hex}", json={"status": "inactive"})
    assert resp.status_code == 404
