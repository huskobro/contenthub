"""
M9-B YouTube OAuth Surface tests.

Covers:
  A) GET /publish/youtube/status — token status check
  B) GET /publish/youtube/channel-info — channel info (disconnected state)
  C) DELETE /publish/youtube/revoke — idempotent revoke
  D) GET /publish/youtube/auth-url — requires client_id
"""

import pytest
from httpx import AsyncClient

YT_BASE = "/api/v1/publish/youtube"


# ---------------------------------------------------------------------------
# A) Token status — no tokens in test env
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_youtube_status_no_credentials(client: AsyncClient):
    resp = await client.get(f"{YT_BASE}/status")
    assert resp.status_code == 200
    body = resp.json()
    assert "has_credentials" in body
    assert isinstance(body["has_credentials"], bool)
    assert "message" in body


# ---------------------------------------------------------------------------
# B) Channel info — disconnected state
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_youtube_channel_info_disconnected(client: AsyncClient):
    # Bu test token dosyası olmadığında connected=False bekler.
    # Geliştirme ortamında data/youtube_tokens.json varsa token store
    # has_credentials()=True döner ve test atlanır.
    import os
    from pathlib import Path
    token_path = Path(__file__).parent.parent / "data" / "youtube_tokens.json"
    if token_path.exists():
        pytest.skip("Token dosyası mevcut — disconnected testi geçerli değil")

    resp = await client.get(f"{YT_BASE}/channel-info")
    assert resp.status_code == 200
    body = resp.json()
    assert body["connected"] is False
    assert "message" in body
    assert body["channel_id"] is None
    assert body["channel_title"] is None


# ---------------------------------------------------------------------------
# C) Revoke — idempotent (no token file in test env)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_youtube_revoke_idempotent(client: AsyncClient):
    """
    PHASE X sonrası revoke en az bir identifier (connection_id veya
    channel_profile_id) gerektirir. Hiçbiri verilmezse 400 döner — bu
    kontrat hidden-bypass önlemek için zorunludur.
    """
    resp = await client.delete(f"{YT_BASE}/revoke")
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# D) Auth URL — requires channel_profile_id (PHASE X)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_youtube_auth_url_with_explicit_client_id(client: AsyncClient):
    """
    PHASE X sonrası auth-url her zaman channel_profile_id'ye scope edilir.
    channel_profile_id eksikse pydantic validation -> 422.
    """
    resp = await client.get(
        f"{YT_BASE}/auth-url",
        params={
            "redirect_uri": "http://localhost:5173/callback",
            "client_id": "explicit-test-id.apps.googleusercontent.com",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_youtube_auth_url_with_saved_client_id(client: AsyncClient):
    """
    Global client_id kaydedilse bile auth-url hala channel_profile_id ister
    (kanal bazlı bağlantı zorunluluğu, PHASE X).
    """
    creds_base = "/api/v1/settings/credentials"
    await client.put(
        f"{creds_base}/credential.youtube_client_id",
        json={"value": "saved-client-id.apps.googleusercontent.com"},
    )
    resp = await client.get(
        f"{YT_BASE}/auth-url",
        params={"redirect_uri": "http://localhost:5173/callback"},
    )
    assert resp.status_code == 422
