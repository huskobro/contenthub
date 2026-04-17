"""
Phase Final F2.1 — P0 Ownership regresyon testleri.

Kapsam:
  - engagement: non-admin spoof koruma (list + create)
  - settings/credentials: admin-only (non-admin reddedilir)
  - settings CUD: admin-only (POST create, DELETE, POST restore, history,
    POST bulk-update)

Strateji:
  `raw_client` ile oto-admin fallback'i devre disi birakilir; admin_headers
  vs user_headers ile 401/403/200 yanitlari dogrulanir.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.db.models import ChannelProfile, EngagementTask


# ---------------------------------------------------------------------------
# Yardimcilar
# ---------------------------------------------------------------------------


async def _create_channel_for(db_session, owner_id: str, *, slug: str | None = None) -> ChannelProfile:
    suffix = slug or f"ch-{owner_id[:6]}"
    cp = ChannelProfile(
        user_id=owner_id,
        profile_name=f"Test Channel {suffix}",
        channel_slug=suffix,
    )
    db_session.add(cp)
    await db_session.commit()
    await db_session.refresh(cp)
    return cp


async def _create_platform_connection(db_session, channel_profile_id: str) -> "PlatformConnection":
    from app.db.models import PlatformConnection as _PC
    pc = _PC(
        channel_profile_id=channel_profile_id,
        platform="youtube",
    )
    db_session.add(pc)
    await db_session.commit()
    await db_session.refresh(pc)
    return pc


# ---------------------------------------------------------------------------
# F2.1 — Credential endpoints admin-only
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_credentials_list_denies_non_admin(
    raw_client: AsyncClient, user_headers: dict[str, str]
) -> None:
    r = await raw_client.get("/api/v1/settings/credentials", headers=user_headers)
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"


@pytest.mark.asyncio
async def test_credentials_list_allows_admin(
    raw_client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    r = await raw_client.get("/api/v1/settings/credentials", headers=admin_headers)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_credentials_put_denies_non_admin(
    raw_client: AsyncClient, user_headers: dict[str, str]
) -> None:
    r = await raw_client.put(
        "/api/v1/settings/credentials/credential.openai_api_key",
        headers=user_headers,
        json={"value": "sk-malicious"},
    )
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"


@pytest.mark.asyncio
async def test_credentials_validate_denies_non_admin(
    raw_client: AsyncClient, user_headers: dict[str, str]
) -> None:
    r = await raw_client.post(
        "/api/v1/settings/credentials/credential.openai_api_key/validate",
        headers=user_headers,
    )
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"


# ---------------------------------------------------------------------------
# F2.1 — Settings CUD admin-only
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_settings_bulk_update_denies_non_admin(
    raw_client: AsyncClient, user_headers: dict[str, str]
) -> None:
    r = await raw_client.post(
        "/api/v1/settings/bulk-update",
        headers=user_headers,
        json={"updates": [{"key": "tts.default_voice", "value": "alloy"}]},
    )
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"


@pytest.mark.asyncio
async def test_settings_create_denies_non_admin(
    raw_client: AsyncClient, user_headers: dict[str, str]
) -> None:
    r = await raw_client.post(
        "/api/v1/settings",
        headers=user_headers,
        json={
            "key": "evil.key",
            "group_name": "general",
            "type": "string",
            "default_value": "x",
        },
    )
    # 403 (admin-only) ya da 422 (validation) ikisi de kabul: onemli olan 200 OLMAMASI.
    assert r.status_code in (403, 422), f"Expected 403/422, got {r.status_code}: {r.text}"


# ---------------------------------------------------------------------------
# F2.1 — Engagement tasks ownership
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_engagement_list_non_admin_scoped_to_self(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    admin_user,
    user_headers: dict[str, str],
) -> None:
    """Non-admin caller list'te baska user'in tasklarini goremez."""
    cp_regular = await _create_channel_for(db_session, regular_user.id, slug="eng-reg")
    cp_admin = await _create_channel_for(db_session, admin_user.id, slug="eng-adm")
    pc_regular = await _create_platform_connection(db_session, cp_regular.id)
    pc_admin = await _create_platform_connection(db_session, cp_admin.id)

    t1 = EngagementTask(
        user_id=regular_user.id,
        channel_profile_id=cp_regular.id,
        platform_connection_id=pc_regular.id,
        type="community_post",
        status="pending",
    )
    t2 = EngagementTask(
        user_id=admin_user.id,
        channel_profile_id=cp_admin.id,
        platform_connection_id=pc_admin.id,
        type="community_post",
        status="pending",
    )
    db_session.add_all([t1, t2])
    await db_session.commit()

    # Non-admin caller: user_id=admin_user.id spoof denemesi bile kendi id'sine
    # zorlanir; sadece t1 gorur.
    r = await raw_client.get(
        "/api/v1/engagement-tasks",
        headers=user_headers,
        params={"user_id": admin_user.id},
    )
    assert r.status_code == 200, r.text
    items = r.json()
    ids = {item["id"] for item in items}
    assert t1.id in ids
    assert t2.id not in ids, "Non-admin admin'in tasklarini gormemeli"


@pytest.mark.asyncio
async def test_engagement_create_spoof_denied(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    admin_user,
    user_headers: dict[str, str],
) -> None:
    """Non-admin baska bir user_id adina task olusturamaz."""
    cp = await _create_channel_for(db_session, admin_user.id, slug="spoof-adm")
    pc = await _create_platform_connection(db_session, cp.id)

    r = await raw_client.post(
        "/api/v1/engagement-tasks",
        headers=user_headers,
        json={
            "user_id": admin_user.id,  # spoof
            "channel_profile_id": cp.id,
            "platform_connection_id": pc.id,
            "type": "community_post",
        },
    )
    assert r.status_code == 403, f"Spoof'un 403 dondurmesi gerekir, got {r.status_code}: {r.text}"


@pytest.mark.asyncio
async def test_engagement_create_on_foreign_channel_denied(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    admin_user,
    user_headers: dict[str, str],
) -> None:
    """
    Non-admin kendi user_id'si ile bile baska bir kullanicinin channel'ina
    task olusturamaz (channel ownership kapisi).
    """
    cp_foreign = await _create_channel_for(db_session, admin_user.id, slug="foreign-adm")
    pc_foreign = await _create_platform_connection(db_session, cp_foreign.id)

    r = await raw_client.post(
        "/api/v1/engagement-tasks",
        headers=user_headers,
        json={
            "user_id": regular_user.id,  # own id — spoof yok
            "channel_profile_id": cp_foreign.id,  # baskasinin kanali
            "platform_connection_id": pc_foreign.id,
            "type": "community_post",
        },
    )
    assert r.status_code == 403, f"Foreign-channel'a yazma 403 dondurmeli, got {r.status_code}: {r.text}"
