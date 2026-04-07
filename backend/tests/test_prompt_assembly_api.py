"""Integration tests for Prompt Assembly API endpoints."""

import json
import pytest
from httpx import AsyncClient

BASE = "/api/v1/prompt-assembly"


@pytest.mark.asyncio
async def test_list_blocks_empty(client: AsyncClient):
    """Before seed, may return seeded blocks."""
    resp = await client.get(f"{BASE}/blocks")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_create_block(client: AsyncClient):
    payload = {
        "key": "test.block.api",
        "title": "API Test Block",
        "kind": "behavior_block",
        "content_template": "Test content with {{variable}}",
        "module_scope": "news_bulletin",
        "order_index": 50,
    }
    resp = await client.post(f"{BASE}/blocks", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["key"] == "test.block.api"
    assert data["kind"] == "behavior_block"
    assert data["effective_template"] == "Test content with {{variable}}"
    assert data["source_kind"] == "builtin_default"


@pytest.mark.asyncio
async def test_update_block_admin_override(client: AsyncClient):
    # Create first
    create_resp = await client.post(f"{BASE}/blocks", json={
        "key": "test.block.override",
        "title": "Override Test",
        "kind": "behavior_block",
        "content_template": "Original content",
    })
    block_id = create_resp.json()["id"]

    # Update with admin override
    update_resp = await client.patch(f"{BASE}/blocks/{block_id}", json={
        "admin_override_template": "Admin modified content",
    })
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["admin_override_template"] == "Admin modified content"
    assert data["effective_template"] == "Admin modified content"
    assert data["source_kind"] == "admin_override"
    assert data["version"] == 2


@pytest.mark.asyncio
async def test_protected_block_cannot_disable(client: AsyncClient):
    create_resp = await client.post(f"{BASE}/blocks", json={
        "key": "test.core.protected",
        "title": "Protected Core",
        "kind": "core_system",
        "content_template": "System instruction",
    })
    block_id = create_resp.json()["id"]

    update_resp = await client.patch(f"{BASE}/blocks/{block_id}", json={
        "status": "disabled",
    })
    assert update_resp.status_code == 422


@pytest.mark.asyncio
async def test_preview_dry_run(client: AsyncClient):
    # Create a block first
    await client.post(f"{BASE}/blocks", json={
        "key": "test.preview.system",
        "title": "Preview System",
        "kind": "core_system",
        "content_template": "You are a helper for {{topic}}.",
        "module_scope": "news_bulletin",
        "order_index": 0,
    })

    resp = await client.post(f"{BASE}/preview", json={
        "module_scope": "news_bulletin",
        "step_key": "script",
        "data_overrides": {"topic": "technology"},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_dry_run"] is True
    assert data["data_source"] == "sample_input"
    assert "technology" in data["final_prompt_text"]
    assert len(data["included_blocks"]) >= 1
