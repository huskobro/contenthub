"""
Faz 12 — Template Gallery + Preview-First Selection UX tests.

Tests:
1. Template list returns active templates with version field
2. StyleBlueprint list returns active blueprints with version field
3. Template response includes style_profile_json for preview rendering
4. StyleBlueprint response includes visual/motion/layout/subtitle/thumbnail rules
5. Template create preserves version for traceability
6. StyleBlueprint create preserves version for traceability
7. Template list filters by module_scope (gallery filtering)
8. StyleBlueprint list filters by module_scope (gallery filtering)
9. Template style_profile_json round-trip (color/font preview data)
10. StyleBlueprint rules JSON round-trip (visual preview data)
"""

import json
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

TEMPLATES_BASE = "/api/v1/templates"
BLUEPRINTS_BASE = "/api/v1/style-blueprints"


# ---------------------------------------------------------------------------
# 1. Template list returns active templates with version field
# ---------------------------------------------------------------------------

async def test_template_list_has_version(client: AsyncClient):
    """Template list endpoint should return items with version field."""
    # Create a template first
    resp = await client.post(TEMPLATES_BASE, json={
        "name": "Faz12 Test Template",
        "template_type": "style",
        "owner_scope": "system",
        "module_scope": "standard_video",
        "status": "active",
        "version": 1,
    })
    assert resp.status_code in (200, 201)

    # List templates
    resp = await client.get(TEMPLATES_BASE, params={"status": "active"})
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    assert len(items) >= 1
    for item in items:
        assert "version" in item
        assert "id" in item


# ---------------------------------------------------------------------------
# 2. StyleBlueprint list returns active blueprints with version field
# ---------------------------------------------------------------------------

async def test_blueprint_list_has_version(client: AsyncClient):
    """StyleBlueprint list endpoint should return items with version field."""
    resp = await client.post(BLUEPRINTS_BASE, json={
        "name": "Faz12 Test Blueprint",
        "module_scope": "standard_video",
        "status": "active",
        "version": 1,
    })
    assert resp.status_code in (200, 201)

    resp = await client.get(BLUEPRINTS_BASE, params={"status": "active"})
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    assert len(items) >= 1
    for item in items:
        assert "version" in item
        assert "id" in item


# ---------------------------------------------------------------------------
# 3. Template response includes style_profile_json for preview rendering
# ---------------------------------------------------------------------------

async def test_template_includes_style_profile(client: AsyncClient):
    """Template response should include style_profile_json for visual preview."""
    style_profile = {"primary_color": "#6366f1", "secondary_color": "#a5b4fc", "font_style": "sans-serif"}
    resp = await client.post(TEMPLATES_BASE, json={
        "name": "Faz12 Preview Template",
        "template_type": "style",
        "owner_scope": "system",
        "style_profile_json": json.dumps(style_profile),
        "status": "active",
        "version": 1,
    })
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert "style_profile_json" in data
    assert data["style_profile_json"] is not None
    parsed = json.loads(data["style_profile_json"])
    assert parsed["primary_color"] == "#6366f1"


# ---------------------------------------------------------------------------
# 4. StyleBlueprint response includes all rule fields
# ---------------------------------------------------------------------------

async def test_blueprint_includes_all_rules(client: AsyncClient):
    """StyleBlueprint response should include all rule JSON fields."""
    resp = await client.post(BLUEPRINTS_BASE, json={
        "name": "Faz12 Rules Blueprint",
        "visual_rules_json": '{"color_palette":["#111","#222"]}',
        "motion_rules_json": '{"motion_level":"medium"}',
        "layout_rules_json": '{"layout_direction":"ltr"}',
        "subtitle_rules_json": '{"font_family":"sans-serif"}',
        "thumbnail_rules_json": '{"style":"text_heavy"}',
        "status": "active",
        "version": 1,
    })
    assert resp.status_code in (200, 201)
    data = resp.json()
    for field in ["visual_rules_json", "motion_rules_json", "layout_rules_json", "subtitle_rules_json", "thumbnail_rules_json"]:
        assert field in data
        assert data[field] is not None


# ---------------------------------------------------------------------------
# 5. Template create preserves version for traceability
# ---------------------------------------------------------------------------

async def test_template_version_preserved(client: AsyncClient):
    """Template version should be preserved and returned correctly."""
    resp = await client.post(TEMPLATES_BASE, json={
        "name": "Faz12 Versioned Template",
        "template_type": "content",
        "owner_scope": "admin",
        "status": "active",
        "version": 3,
    })
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert data["version"] == 3


# ---------------------------------------------------------------------------
# 6. StyleBlueprint create preserves version for traceability
# ---------------------------------------------------------------------------

async def test_blueprint_version_preserved(client: AsyncClient):
    """StyleBlueprint version should be preserved and returned correctly."""
    resp = await client.post(BLUEPRINTS_BASE, json={
        "name": "Faz12 Versioned Blueprint",
        "status": "active",
        "version": 5,
    })
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert data["version"] == 5


# ---------------------------------------------------------------------------
# 7. Template list filters by module_scope (gallery filtering)
# ---------------------------------------------------------------------------

async def test_template_filter_by_module_scope(client: AsyncClient):
    """Template list should filter by module_scope for gallery view."""
    scope = "faz12_test_module"
    await client.post(TEMPLATES_BASE, json={
        "name": "Faz12 Scoped Template",
        "template_type": "style",
        "owner_scope": "system",
        "module_scope": scope,
        "status": "active",
        "version": 1,
    })
    await client.post(TEMPLATES_BASE, json={
        "name": "Faz12 Other Scope",
        "template_type": "style",
        "owner_scope": "system",
        "module_scope": "other_scope",
        "status": "active",
        "version": 1,
    })

    resp = await client.get(TEMPLATES_BASE, params={"module_scope": scope, "status": "active"})
    assert resp.status_code == 200
    items = resp.json()
    for item in items:
        assert item["module_scope"] == scope


# ---------------------------------------------------------------------------
# 8. StyleBlueprint list filters by module_scope (gallery filtering)
# ---------------------------------------------------------------------------

async def test_blueprint_filter_by_module_scope(client: AsyncClient):
    """StyleBlueprint list should filter by module_scope for gallery view."""
    scope = "faz12_bp_test_module"
    await client.post(BLUEPRINTS_BASE, json={
        "name": "Faz12 Scoped Blueprint",
        "module_scope": scope,
        "status": "active",
        "version": 1,
    })

    resp = await client.get(BLUEPRINTS_BASE, params={"module_scope": scope, "status": "active"})
    assert resp.status_code == 200
    items = resp.json()
    for item in items:
        assert item["module_scope"] == scope


# ---------------------------------------------------------------------------
# 9. Template style_profile_json round-trip (color/font preview data)
# ---------------------------------------------------------------------------

async def test_template_style_profile_roundtrip(client: AsyncClient):
    """style_profile_json should round-trip preserving preview data."""
    profile = {
        "primary_color": "#ef4444",
        "secondary_color": "#fbbf24",
        "font_style": "serif",
    }
    resp = await client.post(TEMPLATES_BASE, json={
        "name": "Faz12 Roundtrip Template",
        "template_type": "style",
        "owner_scope": "system",
        "style_profile_json": json.dumps(profile),
        "status": "active",
        "version": 1,
    })
    assert resp.status_code in (200, 201)
    tid = resp.json()["id"]

    resp2 = await client.get(f"{TEMPLATES_BASE}/{tid}")
    assert resp2.status_code == 200
    fetched = json.loads(resp2.json()["style_profile_json"])
    assert fetched["primary_color"] == "#ef4444"
    assert fetched["font_style"] == "serif"


# ---------------------------------------------------------------------------
# 10. StyleBlueprint rules JSON round-trip (visual preview data)
# ---------------------------------------------------------------------------

async def test_blueprint_rules_roundtrip(client: AsyncClient):
    """Blueprint rule JSON fields should round-trip for visual preview."""
    visual = {"color_palette": ["#ff0000", "#00ff00", "#0000ff"], "image_style": "cinematic"}
    motion = {"motion_level": "high", "transition_style": "slide"}

    resp = await client.post(BLUEPRINTS_BASE, json={
        "name": "Faz12 Roundtrip Blueprint",
        "visual_rules_json": json.dumps(visual),
        "motion_rules_json": json.dumps(motion),
        "status": "active",
        "version": 2,
    })
    assert resp.status_code in (200, 201)
    bid = resp.json()["id"]

    resp2 = await client.get(f"{BLUEPRINTS_BASE}/{bid}")
    assert resp2.status_code == 200
    data = resp2.json()
    fetched_visual = json.loads(data["visual_rules_json"])
    assert fetched_visual["color_palette"] == ["#ff0000", "#00ff00", "#0000ff"]
    fetched_motion = json.loads(data["motion_rules_json"])
    assert fetched_motion["motion_level"] == "high"
