"""
Regression guard for YouTube OAuth account-selector behavior.

History:
  The "force Google account chooser every time" behavior has regressed more
  than once — a quiet edit removed `prompt=select_account`, and nothing
  caught it. These assertions are a tripwire: any future change that
  weakens the chooser guarantee fails this test.

Three layers must all be present:
  1. prompt=select_account consent   → explicit chooser + consent
  2. max_age=0                        → "session must be fresh" (OIDC)
  3. include_granted_scopes=false     → do not inherit prior grants

Additionally, the router must attach a fresh nonce to `state` on every
call so Google cannot cache a consent decision keyed on the prior state.
"""

from __future__ import annotations

from urllib.parse import parse_qs, urlparse

import pytest

from app.publish.youtube.token_store import (
    DBYouTubeTokenStore,
    LegacyFileTokenStore,
    GOOGLE_AUTH_URL,
    YOUTUBE_SCOPE,
    YOUTUBE_ANALYTICS_SCOPE,
)


def _parse(url: str) -> dict:
    parsed = urlparse(url)
    assert f"{parsed.scheme}://{parsed.netloc}{parsed.path}" == GOOGLE_AUTH_URL, (
        f"auth_url must point to Google's oauth2 endpoint, got {url}"
    )
    # parse_qs returns lists; flatten single values for readability.
    return {k: v[0] if len(v) == 1 else v for k, v in parse_qs(parsed.query).items()}


def _assert_selector_hardening(params: dict) -> None:
    assert params.get("prompt") == "select_account consent", (
        f"prompt must force account chooser — got {params.get('prompt')!r}"
    )
    assert params.get("max_age") == "0", (
        "max_age=0 is required so Google will not silently re-use a fresh "
        "browser session. Missing max_age re-introduces the known regression."
    )
    assert params.get("include_granted_scopes") == "false", (
        "include_granted_scopes must be false so prior grants are not "
        "inherited — otherwise the chooser is skipped."
    )
    # Core OAuth parameters we also require.
    assert params.get("response_type") == "code"
    assert params.get("access_type") == "offline"
    assert YOUTUBE_SCOPE in params.get("scope", "")
    assert YOUTUBE_ANALYTICS_SCOPE in params.get("scope", "")


def test_db_store_auth_url_forces_account_chooser():
    store = DBYouTubeTokenStore()
    url = store.get_auth_url(
        client_id="test-client.apps.googleusercontent.com",
        redirect_uri="http://localhost:5173/cb",
        state="profile-abc:nonce123",
    )
    _assert_selector_hardening(_parse(url))


def test_legacy_store_auth_url_also_forces_account_chooser():
    """Legacy store is kept for reference; any code still reaching it must
    still enforce the chooser."""
    store = LegacyFileTokenStore()
    url = store.get_auth_url(
        client_id="test-client.apps.googleusercontent.com",
        redirect_uri="http://localhost:5173/cb",
    )
    _assert_selector_hardening(_parse(url))


def test_state_is_round_tripped_when_provided():
    store = DBYouTubeTokenStore()
    url = store.get_auth_url(
        client_id="cid", redirect_uri="http://r", state="profile-xyz:abc",
    )
    params = _parse(url)
    assert params.get("state") == "profile-xyz:abc"


def test_state_absent_when_not_provided():
    store = DBYouTubeTokenStore()
    url = store.get_auth_url(
        client_id="cid", redirect_uri="http://r",
    )
    params = _parse(url)
    assert "state" not in params


@pytest.mark.asyncio
async def test_router_attaches_fresh_nonce_each_call(monkeypatch):
    """Router contract: every /auth-url response carries a DIFFERENT state
    value even for the same channel_profile_id, so Google cannot cache a
    consent decision keyed by state."""
    from app.publish.youtube import router as yt_router

    captured_states: list[str] = []

    def _fake_get_auth_url(client_id: str, redirect_uri: str, state: str = "") -> str:
        captured_states.append(state)
        return "https://accounts.google.com/o/oauth2/v2/auth?state=" + state

    monkeypatch.setattr(
        yt_router._token_store, "get_auth_url", _fake_get_auth_url,
    )

    # Stub profile lookup + client_id resolution — avoids a live DB.
    class _FakeProfile:
        id = "profile-abc"

    async def _fake_db_get(model, pid):
        return _FakeProfile()

    class _FakeDB:
        async def get(self, model, pid):
            return _FakeProfile()

    async def _fake_resolve_connection(db, *, channel_profile_id):
        return None  # force credential resolver path

    async def _fake_resolve_credential(key, db):
        return "cid.apps.googleusercontent.com"

    monkeypatch.setattr(yt_router, "_resolve_connection", _fake_resolve_connection)
    monkeypatch.setattr(yt_router, "resolve_credential", _fake_resolve_credential)
    monkeypatch.setattr(
        yt_router, "expand_youtube_client_id", lambda v: v, raising=False,
    )

    # Call the endpoint twice for the same channel_profile_id.
    for _ in range(2):
        await yt_router.get_auth_url(
            redirect_uri="http://localhost/cb",
            channel_profile_id="profile-abc",
            client_id=None,
            db=_FakeDB(),
        )

    assert len(captured_states) == 2
    # Same channel, DIFFERENT states (nonce must differ).
    assert captured_states[0] != captured_states[1], (
        "Two auth-url calls for the same profile produced identical state — "
        "nonce is not fresh, Google can cache consent. Regression."
    )
    # And both must prefix with the profile id for callback recovery.
    for s in captured_states:
        assert s.startswith("profile-abc:"), (
            f"state must start with '{{profile_id}}:' for callback parsing; got {s!r}"
        )
