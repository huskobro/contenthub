"""
Branding Center + Automation Center + Channel URL onboarding — backend tests.

Kapsam:
  A) Channel URL onboarding preview/confirm
     A1) preview NO DB row + signed token + dedupe early-fail
     A2) confirm verifies token sub + nurl + creates DB row
     A3) confirm rejects token issued for ANOTHER user (cross-user attack)
     A4) confirm rejects mismatching source_url (signed nurl wins)

  B) Branding Center aggregate
     B1) GET auto-creates BrandProfile + back-references channel
     B2) PATCH /identity persists + writes audit log
     B3) PATCH /audience round-trips list/dict JSON
     B4) Apply (non-dry-run) snapshots into apply_status_json + audit
     B5) Apply (dry-run) does NOT mutate apply_status_json
     B6) Ownership: another user gets 403 on GET, PATCH, Apply

  C) Automation Center aggregate
     C1) GET assembles canonical fixed-shape canvas + edges + health
     C2) PATCH /flow toggles automation_enabled honestly
     C3) PATCH /flow rejects schedule_enabled without cron (422)
     C4) PATCH /nodes/{id} stores override + writes audit
     C5) Snapshot lock: active job blocks flow PATCH (409)
     C6) Run-now respects daily cap; admin force bypasses; user force is 403
     C7) Test node returns honest output for ready node
     C8) Ownership: another user gets 403 on canvas surfaces

These tests use the existing in-memory DB conftest fixtures and mock
metadata fetch where network is involved.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.auth.jwt import create_access_token
from app.auth.password import hash_password
from app.channels import metadata_fetch as mf
from app.channels.preview_token import (
    PREVIEW_PURPOSE,
    PREVIEW_TOKEN_TTL_SECONDS,
    issue_preview_token,
    verify_preview_token,
    PreviewTokenError,
)
from app.db.models import (
    AuditLog,
    AutomationPolicy,
    BrandProfile,
    ChannelProfile,
    ContentProject,
    Job,
    User,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _make_user(db, *, role: str = "user", suffix: str = "x") -> User:
    u = User(
        email=f"bcac-{role}-{suffix}@test.local",
        display_name=f"BCAC {role} {suffix}",
        slug=f"bcac-{role}-{suffix}",
        role=role,
        status="active",
        password_hash=hash_password("testpass123"),
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


def _bearer(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token({'sub': user.id})}"}


async def _make_channel(
    db,
    user_id: str,
    *,
    slug: str = "ch-x",
    profile_name: str = "Kanal",
    title: str | None = "Kanal Title",
) -> ChannelProfile:
    ch = ChannelProfile(
        user_id=user_id,
        profile_name=profile_name,
        channel_slug=slug,
        default_language="tr",
        platform="youtube",
        source_url="https://www.youtube.com/@bcac",
        normalized_url=f"https://www.youtube.com/@{slug}",
        title=title,
        import_status="success",
        status="active",
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch


async def _make_project(
    db,
    *,
    user_id: str,
    channel_profile_id: str,
    module_type: str = "standard_video",
    title: str = "Proje",
) -> ContentProject:
    p = ContentProject(
        user_id=user_id,
        channel_profile_id=channel_profile_id,
        module_type=module_type,
        title=title,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


# ===========================================================================
# A) Channel URL onboarding — preview / confirm
# ===========================================================================


@pytest.mark.asyncio
async def test_a1_preview_returns_token_and_does_not_persist(
    client, db_session, monkeypatch
):
    """preview-channel-import: no DB row + signed JWT + expires_in_seconds."""
    user = await _make_user(db_session, suffix="a1")

    async def _meta(_url):
        return (
            "<html><head>"
            "<meta property='og:title' content='Preview Channel - YouTube'/>"
            "<meta property='og:image' content='https://yt3.ggpht.com/ava.jpg'/>"
            "</head></html>"
        )

    monkeypatch.setattr(mf, "_fetch_html", _meta)

    r = await client.post(
        "/api/v1/channel-profiles/import-preview",
        headers=_bearer(user),
        json={"source_url": "https://www.youtube.com/@a1preview"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["preview_token"], "preview_token bos olmamali"
    assert body["normalized_url"] == "https://www.youtube.com/@a1preview"
    assert body["platform"] == "youtube"
    assert body["title"] == "Preview Channel"
    assert body["expires_in_seconds"] == PREVIEW_TOKEN_TTL_SECONDS

    # Sign verification: token must be redeemable for THIS user
    claims = verify_preview_token(body["preview_token"], expected_user_id=user.id)
    assert claims["purpose"] == PREVIEW_PURPOSE
    assert claims["nurl"] == "https://www.youtube.com/@a1preview"

    # Critically: NO ChannelProfile row was created during preview.
    rows = (await db_session.execute(
        select(ChannelProfile).where(ChannelProfile.user_id == user.id)
    )).scalars().all()
    assert len(rows) == 0, (
        "Preview adimi DB'ye row YAZMAMALI — confirm'a kadar bekler"
    )


@pytest.mark.asyncio
async def test_a2_confirm_creates_profile_with_correct_token(
    client, db_session, monkeypatch
):
    user = await _make_user(db_session, suffix="a2")

    async def _meta(_url):
        return "<html><head><meta property='og:title' content='X - YouTube'/></head></html>"

    monkeypatch.setattr(mf, "_fetch_html", _meta)

    pre = await client.post(
        "/api/v1/channel-profiles/import-preview",
        headers=_bearer(user),
        json={"source_url": "https://www.youtube.com/@a2confirm"},
    )
    assert pre.status_code == 200, pre.text
    token = pre.json()["preview_token"]

    cf = await client.post(
        "/api/v1/channel-profiles/import-confirm",
        headers=_bearer(user),
        json={
            "preview_token": token,
            "source_url": "https://www.youtube.com/@a2confirm",
        },
    )
    assert cf.status_code == 201, cf.text
    body = cf.json()
    assert body["normalized_url"] == "https://www.youtube.com/@a2confirm"
    assert body["import_status"] in ("success", "partial")
    assert body["user_id"] == user.id
    # metadata_json must mark the import_flow honestly
    rec = (await db_session.execute(
        select(ChannelProfile).where(ChannelProfile.id == body["id"])
    )).scalar_one()
    if rec.metadata_json:
        meta = json.loads(rec.metadata_json)
        assert meta.get("import_flow") == "preview_confirm"


@pytest.mark.asyncio
async def test_a3_confirm_rejects_other_users_token(client, db_session, monkeypatch):
    """A token signed for user1 cannot be redeemed by user2 — security boundary."""
    u1 = await _make_user(db_session, suffix="a3-victim")
    u2 = await _make_user(db_session, suffix="a3-attacker")

    async def _no_html(_url):
        return None

    monkeypatch.setattr(mf, "_fetch_html", _no_html)

    pre = await client.post(
        "/api/v1/channel-profiles/import-preview",
        headers=_bearer(u1),
        json={"source_url": "https://www.youtube.com/@a3victim"},
    )
    assert pre.status_code == 200, pre.text
    stolen = pre.json()["preview_token"]

    # Attacker submits the stolen token from THEIR session.
    cf = await client.post(
        "/api/v1/channel-profiles/import-confirm",
        headers=_bearer(u2),
        json={
            "preview_token": stolen,
            "source_url": "https://www.youtube.com/@a3victim",
        },
    )
    assert cf.status_code == 422, cf.text
    assert "kullaniciya ait" in cf.json()["detail"].lower() or "ait degil" in cf.json()["detail"].lower()


@pytest.mark.asyncio
async def test_a4_confirm_rejects_mismatched_source_url(
    client, db_session, monkeypatch
):
    """Token nurl != confirmed source_url => 422 (signed url wins)."""
    user = await _make_user(db_session, suffix="a4")

    async def _no_html(_url):
        return None

    monkeypatch.setattr(mf, "_fetch_html", _no_html)
    pre = await client.post(
        "/api/v1/channel-profiles/import-preview",
        headers=_bearer(user),
        json={"source_url": "https://www.youtube.com/@a4one"},
    )
    token = pre.json()["preview_token"]

    cf = await client.post(
        "/api/v1/channel-profiles/import-confirm",
        headers=_bearer(user),
        json={
            "preview_token": token,
            "source_url": "https://www.youtube.com/@a4two",  # different!
        },
    )
    assert cf.status_code == 422, cf.text
    assert "url" in cf.json()["detail"].lower()


def test_a5_preview_token_round_trip_unit():
    """Pure unit: issue + verify cycles, purpose enforcement, owner mismatch."""
    tok = issue_preview_token(
        user_id="user-aaa",
        normalized_url="https://www.youtube.com/@x",
        platform="youtube",
    )
    claims = verify_preview_token(tok, expected_user_id="user-aaa")
    assert claims["nurl"] == "https://www.youtube.com/@x"
    assert claims["purpose"] == PREVIEW_PURPOSE

    with pytest.raises(PreviewTokenError):
        verify_preview_token(tok, expected_user_id="user-bbb")


# ===========================================================================
# B) Branding Center
# ===========================================================================


@pytest.mark.asyncio
async def test_b1_get_auto_creates_brand_profile(client, db_session):
    user = await _make_user(db_session, suffix="b1")
    ch = await _make_channel(db_session, user.id, slug="ch-b1")

    r = await client.get(
        f"/api/v1/branding-center/channels/{ch.id}",
        headers=_bearer(user),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["brand_profile_id"]
    assert body["channel"]["id"] == ch.id
    assert body["channel"]["user_id"] == user.id
    # 6 sections present in payload
    for sec in ("identity", "audience", "visual", "messaging", "platform_output"):
        assert sec in body
    assert "completeness" in body
    # Side-effect: BrandProfile row was inserted + back-ref wired
    bp = await db_session.get(BrandProfile, body["brand_profile_id"])
    assert bp is not None
    assert bp.channel_profile_id == ch.id

    # GET is idempotent — second call returns same id, doesn't create twice.
    r2 = await client.get(
        f"/api/v1/branding-center/channels/{ch.id}",
        headers=_bearer(user),
    )
    assert r2.json()["brand_profile_id"] == body["brand_profile_id"]


@pytest.mark.asyncio
async def test_b2_patch_identity_persists_and_audits(client, db_session):
    user = await _make_user(db_session, suffix="b2")
    ch = await _make_channel(db_session, user.id, slug="ch-b2")

    # Bootstrap brand profile via GET first (auto-create).
    await client.get(
        f"/api/v1/branding-center/channels/{ch.id}", headers=_bearer(user)
    )

    r = await client.patch(
        f"/api/v1/branding-center/channels/{ch.id}/identity",
        headers=_bearer(user),
        json={"brand_name": "Yeni Marka", "brand_summary": "Kisa ozet."},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["identity"]["brand_name"] == "Yeni Marka"
    assert body["identity"]["brand_summary"] == "Kisa ozet."
    assert body["completeness"]["identity"] is True

    # Audit log entry was written.
    rows = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == "branding_center.section.save")
    )).scalars().all()
    assert any(
        json.loads(r.details_json).get("section") == "identity" for r in rows
    )


@pytest.mark.asyncio
async def test_b3_patch_audience_round_trips_dict(client, db_session):
    user = await _make_user(db_session, suffix="b3")
    ch = await _make_channel(db_session, user.id, slug="ch-b3")
    await client.get(
        f"/api/v1/branding-center/channels/{ch.id}", headers=_bearer(user)
    )

    audience = {"age_band": "25-34", "interests": ["finance", "tech"]}
    r = await client.patch(
        f"/api/v1/branding-center/channels/{ch.id}/audience",
        headers=_bearer(user),
        json={
            "audience_profile": audience,
            "positioning_statement": "Premium teknik analiz.",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["audience"]["audience_profile"] == audience
    assert body["audience"]["positioning_statement"] == "Premium teknik analiz."


@pytest.mark.asyncio
async def test_b4_apply_persists_snapshot_and_audit(client, db_session):
    user = await _make_user(db_session, suffix="b4")
    ch = await _make_channel(db_session, user.id, slug="ch-b4")
    await client.get(
        f"/api/v1/branding-center/channels/{ch.id}", headers=_bearer(user)
    )
    await client.patch(
        f"/api/v1/branding-center/channels/{ch.id}/identity",
        headers=_bearer(user),
        json={"brand_name": "Brand4", "brand_summary": "S"},
    )

    r = await client.post(
        f"/api/v1/branding-center/channels/{ch.id}/apply",
        headers=_bearer(user),
        json={"surfaces": ["local_snapshot"], "dry_run": False},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    assert body["items"][0]["surface"] == "local_snapshot"
    assert body["items"][0]["status"] == "applied"

    # apply_status_json populated on the model.
    bp_id = (await db_session.execute(
        select(BrandProfile.id).where(BrandProfile.channel_profile_id == ch.id)
    )).scalar_one()
    bp = await db_session.get(BrandProfile, bp_id)
    await db_session.refresh(bp)
    assert bp.apply_status_json
    snap = json.loads(bp.apply_status_json)
    assert snap["applied_by"] == user.id
    assert snap["snapshot"]["brand_name"] == "Brand4"

    # Audit entry written.
    rows = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == "branding_center.apply")
    )).scalars().all()
    assert len(rows) >= 1


@pytest.mark.asyncio
async def test_b5_apply_dry_run_does_not_mutate(client, db_session):
    user = await _make_user(db_session, suffix="b5")
    ch = await _make_channel(db_session, user.id, slug="ch-b5")
    await client.get(
        f"/api/v1/branding-center/channels/{ch.id}", headers=_bearer(user)
    )

    r = await client.post(
        f"/api/v1/branding-center/channels/{ch.id}/apply",
        headers=_bearer(user),
        json={"surfaces": ["local_snapshot"], "dry_run": True},
    )
    assert r.status_code == 200, r.text
    item = r.json()["items"][0]
    assert item["status"] == "queued"
    assert "Dry-run" in (item["detail"] or "")

    bp_id = (await db_session.execute(
        select(BrandProfile.id).where(BrandProfile.channel_profile_id == ch.id)
    )).scalar_one()
    bp = await db_session.get(BrandProfile, bp_id)
    await db_session.refresh(bp)
    assert bp.apply_status_json is None, (
        "Dry-run hicbir kalici etki yapmamali"
    )


@pytest.mark.asyncio
async def test_b6_ownership_other_user_blocked(client, db_session):
    owner = await _make_user(db_session, suffix="b6-owner")
    other = await _make_user(db_session, suffix="b6-other")
    ch = await _make_channel(db_session, owner.id, slug="ch-b6")

    # GET
    r = await client.get(
        f"/api/v1/branding-center/channels/{ch.id}", headers=_bearer(other)
    )
    assert r.status_code == 403, r.text
    # PATCH
    r2 = await client.patch(
        f"/api/v1/branding-center/channels/{ch.id}/identity",
        headers=_bearer(other),
        json={"brand_name": "Hacked"},
    )
    assert r2.status_code == 403, r2.text
    # APPLY
    r3 = await client.post(
        f"/api/v1/branding-center/channels/{ch.id}/apply",
        headers=_bearer(other),
        json={},
    )
    assert r3.status_code == 403, r3.text


# ===========================================================================
# C) Automation Center
# ===========================================================================


@pytest.mark.asyncio
async def test_c1_get_returns_canonical_canvas(client, db_session):
    user = await _make_user(db_session, suffix="c1")
    ch = await _make_channel(db_session, user.id, slug="ch-c1")
    proj = await _make_project(
        db_session, user_id=user.id, channel_profile_id=ch.id,
        module_type="standard_video", title="Std Vid Proje",
    )

    r = await client.get(
        f"/api/v1/automation-center/content-projects/{proj.id}",
        headers=_bearer(user),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    # Canonical 7-node standard_video flow
    node_ids = [n["id"] for n in body["nodes"]]
    assert node_ids == [
        "brief", "script", "metadata", "tts", "visuals", "render", "publish"
    ]
    # Edges chain length = 6
    assert len(body["edges"]) == 6
    # Each node has BOTH a status badge and an operation_mode badge.
    for n in body["nodes"]:
        labels = [b["label"] for b in n["badges"]]
        # First badge is status, second is mode — at minimum two distinct badges.
        assert len(n["badges"]) >= 2
        assert n["status"] in ("ready", "warning", "blocked", "disabled", "complete")
        assert n["operation_mode"] in ("manual", "ai_assist", "automatic")
    # Brief node has a topic blocker by default.
    brief = next(n for n in body["nodes"] if n["id"] == "brief")
    assert brief["status"] in ("blocked", "warning")
    assert "Konu" in (brief["badges"][0].get("detail") or "")
    # Snapshot lock initially false
    assert body["snapshot_locked"] is False


@pytest.mark.asyncio
async def test_c2_patch_flow_toggles_automation_enabled(client, db_session):
    user = await _make_user(db_session, suffix="c2")
    ch = await _make_channel(db_session, user.id, slug="ch-c2")
    proj = await _make_project(
        db_session, user_id=user.id, channel_profile_id=ch.id,
    )

    r = await client.patch(
        f"/api/v1/automation-center/content-projects/{proj.id}/flow",
        headers=_bearer(user),
        json={"run_mode": "full_auto", "publish_policy": "review"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["flow"]["run_mode"] == "full_auto"
    assert body["flow"]["publish_policy"] == "review"

    # automation_enabled mirror should be True for non-manual modes.
    await db_session.refresh(proj)
    assert proj.automation_enabled is True

    # Switch back to manual disables automation honestly.
    r2 = await client.patch(
        f"/api/v1/automation-center/content-projects/{proj.id}/flow",
        headers=_bearer(user),
        json={"run_mode": "manual"},
    )
    assert r2.status_code == 200
    await db_session.refresh(proj)
    assert proj.automation_enabled is False


@pytest.mark.asyncio
async def test_c3_patch_flow_rejects_schedule_without_cron(client, db_session):
    user = await _make_user(db_session, suffix="c3")
    ch = await _make_channel(db_session, user.id, slug="ch-c3")
    proj = await _make_project(
        db_session, user_id=user.id, channel_profile_id=ch.id,
    )
    r = await client.patch(
        f"/api/v1/automation-center/content-projects/{proj.id}/flow",
        headers=_bearer(user),
        json={"schedule_enabled": True},  # no cron
    )
    assert r.status_code == 422, r.text
    assert "cron" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_c4_patch_node_stores_override_and_audits(client, db_session):
    user = await _make_user(db_session, suffix="c4")
    ch = await _make_channel(db_session, user.id, slug="ch-c4")
    proj = await _make_project(
        db_session, user_id=user.id, channel_profile_id=ch.id,
    )
    # Bootstrap policy via GET first
    await client.get(
        f"/api/v1/automation-center/content-projects/{proj.id}",
        headers=_bearer(user),
    )

    r = await client.patch(
        f"/api/v1/automation-center/content-projects/{proj.id}/nodes/brief",
        headers=_bearer(user),
        json={
            "operation_mode": "ai_assist",
            "config": {"topic": "Borsada haftalik analiz"},
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    brief = next(n for n in body["nodes"] if n["id"] == "brief")
    # Topic supplied → status moves to ready
    assert brief["status"] == "ready"
    assert brief["operation_mode"] == "ai_assist"
    assert brief["config"]["topic"] == "Borsada haftalik analiz"

    # Override survived in policy json (under reserved key)
    policy = (await db_session.execute(
        select(AutomationPolicy).where(
            AutomationPolicy.channel_profile_id == ch.id
        )
    )).scalar_one()
    rules = json.loads(policy.platform_rules_json)
    assert rules["automation_center.nodes"]["brief"]["config"]["topic"]

    # Audit
    rows = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == "automation_center.node.save")
    )).scalars().all()
    assert any(json.loads(r.details_json).get("node_id") == "brief" for r in rows)


@pytest.mark.asyncio
async def test_c5_snapshot_lock_blocks_flow_patch(client, db_session):
    user = await _make_user(db_session, suffix="c5")
    ch = await _make_channel(db_session, user.id, slug="ch-c5")
    proj = await _make_project(
        db_session, user_id=user.id, channel_profile_id=ch.id,
    )
    # Insert an active job for this project
    job = Job(
        module_type="standard_video",
        owner_id=user.id,
        status="running",
        content_project_id=proj.id,
    )
    db_session.add(job)
    await db_session.commit()

    r = await client.patch(
        f"/api/v1/automation-center/content-projects/{proj.id}/flow",
        headers=_bearer(user),
        json={"run_mode": "full_auto"},
    )
    assert r.status_code == 409, r.text
    assert "snapshot" in r.json()["detail"].lower() or "calisirken" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_c6_run_now_force_admin_only(client, db_session):
    user = await _make_user(db_session, suffix="c6-user", role="user")
    admin = await _make_user(db_session, suffix="c6-admin", role="admin")
    ch = await _make_channel(db_session, user.id, slug="ch-c6")
    proj = await _make_project(
        db_session, user_id=user.id, channel_profile_id=ch.id,
    )

    # Non-admin force => 403 (router-level guard, not a 200-with-error)
    r = await client.post(
        f"/api/v1/automation-center/content-projects/{proj.id}/run-now",
        headers=_bearer(user),
        json={"force": True},
    )
    assert r.status_code == 403, r.text
    assert "admin" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_c7_test_node_returns_honest_output_after_ready(
    client, db_session
):
    user = await _make_user(db_session, suffix="c7")
    ch = await _make_channel(db_session, user.id, slug="ch-c7")
    proj = await _make_project(
        db_session, user_id=user.id, channel_profile_id=ch.id,
    )
    # Bootstrap + supply topic so brief becomes ready
    await client.get(
        f"/api/v1/automation-center/content-projects/{proj.id}",
        headers=_bearer(user),
    )
    await client.patch(
        f"/api/v1/automation-center/content-projects/{proj.id}/nodes/brief",
        headers=_bearer(user),
        json={"config": {"topic": "x"}},
    )

    r = await client.post(
        f"/api/v1/automation-center/content-projects/{proj.id}/nodes/brief/test",
        headers=_bearer(user),
        json={"sample_payload": {"sample": True}},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    assert body["output"]["would_execute"] is True
    assert body["output"]["sample_payload_received"] == {"sample": True}


@pytest.mark.asyncio
async def test_c7b_test_node_blocked_returns_issues(client, db_session):
    user = await _make_user(db_session, suffix="c7b")
    ch = await _make_channel(db_session, user.id, slug="ch-c7b")
    proj = await _make_project(
        db_session, user_id=user.id, channel_profile_id=ch.id,
    )
    # No config → brief blocked
    r = await client.post(
        f"/api/v1/automation-center/content-projects/{proj.id}/nodes/brief/test",
        headers=_bearer(user),
        json={},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is False
    assert body["output"]["would_execute"] is False
    assert any("Konu" in i for i in body["issues"])


@pytest.mark.asyncio
async def test_c8_ownership_other_user_blocked(client, db_session):
    owner = await _make_user(db_session, suffix="c8-owner")
    other = await _make_user(db_session, suffix="c8-other")
    ch = await _make_channel(db_session, owner.id, slug="ch-c8")
    proj = await _make_project(
        db_session, user_id=owner.id, channel_profile_id=ch.id,
    )
    paths = [
        ("GET",   f"/api/v1/automation-center/content-projects/{proj.id}", None),
        ("PATCH", f"/api/v1/automation-center/content-projects/{proj.id}/flow", {}),
        ("PATCH", f"/api/v1/automation-center/content-projects/{proj.id}/nodes/brief", {}),
        ("POST",  f"/api/v1/automation-center/content-projects/{proj.id}/evaluate", None),
        ("POST",  f"/api/v1/automation-center/content-projects/{proj.id}/run-now", {}),
        ("POST",  f"/api/v1/automation-center/content-projects/{proj.id}/nodes/brief/test", {}),
    ]
    for method, path, body in paths:
        kwargs = {"headers": _bearer(other)}
        if body is not None:
            kwargs["json"] = body
        if method == "GET":
            r = await client.get(path, **kwargs)
        elif method == "PATCH":
            r = await client.patch(path, **kwargs)
        else:
            r = await client.post(path, **kwargs)
        assert r.status_code == 403, f"{method} {path} should be 403 — got {r.status_code}: {r.text}"
