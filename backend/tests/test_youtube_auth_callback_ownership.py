"""
Stabilize-v1 — YouTube /auth-callback ownership regression.

History / risk model:
  auth_callback previously accepted any authenticated user and a
  channel_profile_id from the body or from the OAuth ``state`` param. A
  non-admin caller could therefore POST /publish/youtube/auth-callback with
  another user's channel_profile_id, complete the Google code-for-token
  exchange, and *bind the resulting OAuth tokens to the victim's
  PlatformConnection* — full account hijack.

Guarantee under test:
  - non-admin posting another user's channel_profile_id in body  → 403
  - non-admin posting another user's channel_profile_id via state → 403
  - admin may still proceed past the ownership gate (token exchange path
    can then fail for any reason, but MUST NOT fail with 403).

These tests ONLY assert the ownership gate. The token exchange itself is
mocked so we never hit Google, and we do not assert on its response — we
strictly check that non-admin cross-user requests are rejected *before*
reaching the exchange, and that admin requests are allowed past the gate.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

import app.publish.youtube.router as yt_router_mod
from app.db.models import ChannelProfile


async def _mk_channel(db_session: AsyncSession, owner_id: str, *, slug: str) -> ChannelProfile:
    cp = ChannelProfile(
        user_id=owner_id,
        profile_name=f"YT-Cb {slug}",
        channel_slug=slug,
    )
    db_session.add(cp)
    await db_session.commit()
    await db_session.refresh(cp)
    return cp


@pytest.fixture
def _mock_token_store(monkeypatch):
    """Replace token_store with a harmless mock so we never call Google."""
    mock_store = MagicMock()
    mock_store.exchange_code_for_tokens = AsyncMock(return_value={
        "access_token": "ya29.new",
        "refresh_token": "1//new_refresh",
        "expires_in": 3600,
        "scope": "",  # forces non-sufficient scope path but still 200 OK for admin
    })
    mock_store.save_from_auth_response = AsyncMock(return_value=None)
    mock_store.load_credential = AsyncMock(return_value=None)
    original = yt_router_mod._token_store
    yt_router_mod._token_store = mock_store
    try:
        yield mock_store
    finally:
        yt_router_mod._token_store = original


@pytest.mark.asyncio
async def test_auth_callback_non_admin_cross_user_body_denied(
    raw_client: AsyncClient,
    db_session: AsyncSession,
    admin_user,
    user_headers: dict[str, str],
    _mock_token_store,
) -> None:
    """
    Non-admin POST /auth-callback with another user's channel_profile_id in
    the body → 403 ownership denial, BEFORE token exchange.
    """
    foreign_channel = await _mk_channel(db_session, admin_user.id, slug="ycb-foreign-body")

    r = await raw_client.post(
        "/api/v1/publish/youtube/auth-callback",
        headers=user_headers,
        json={
            "channel_profile_id": foreign_channel.id,
            "code": "dummy-auth-code",
            "redirect_uri": "http://localhost/cb",
            "client_id": "cid",
            "client_secret": "csecret",
        },
    )
    assert r.status_code == 403, (
        f"non-admin must not bind OAuth tokens to another user's channel — "
        f"expected 403, got {r.status_code}: {r.text}"
    )
    _mock_token_store.exchange_code_for_tokens.assert_not_called()


@pytest.mark.asyncio
async def test_auth_callback_non_admin_cross_user_state_denied(
    raw_client: AsyncClient,
    db_session: AsyncSession,
    admin_user,
    user_headers: dict[str, str],
    _mock_token_store,
) -> None:
    """
    Non-admin POST /auth-callback with another user's channel_profile_id in
    the OAuth ``state`` query param → 403. This path mirrors what Google
    returns after the redirect, and must be just as guarded as the body
    path; state was the easier-to-miss vector.
    """
    foreign_channel = await _mk_channel(db_session, admin_user.id, slug="ycb-foreign-state")

    r = await raw_client.post(
        f"/api/v1/publish/youtube/auth-callback?state={foreign_channel.id}:nonce123",
        headers=user_headers,
        json={
            # No channel_profile_id in body — forces state parsing.
            "code": "dummy-auth-code",
            "redirect_uri": "http://localhost/cb",
        },
    )
    assert r.status_code == 403, (
        f"state-param path must be ownership-guarded — expected 403, got "
        f"{r.status_code}: {r.text}"
    )
    _mock_token_store.exchange_code_for_tokens.assert_not_called()


@pytest.mark.asyncio
async def test_auth_callback_admin_passes_ownership_gate(
    raw_client: AsyncClient,
    db_session: AsyncSession,
    regular_user,
    admin_headers: dict[str, str],
    _mock_token_store,
) -> None:
    """
    Admin POST /auth-callback against another user's channel MUST pass the
    ownership gate (admin-bypass). We assert the request does NOT 403. It
    may still 4xx/5xx later on credential resolution with our skeleton
    mock, but the specific failure mode we care about here — ownership
    rejection — must not fire for admin.
    """
    foreign_channel = await _mk_channel(db_session, regular_user.id, slug="ycb-admin-pass")

    r = await raw_client.post(
        "/api/v1/publish/youtube/auth-callback",
        headers=admin_headers,
        json={
            "channel_profile_id": foreign_channel.id,
            "code": "dummy-auth-code",
            "redirect_uri": "http://localhost/cb",
            "client_id": "cid",
            "client_secret": "csecret",
        },
    )
    assert r.status_code != 403, (
        f"admin must bypass ownership — got 403: {r.text}"
    )
