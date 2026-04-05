"""
M7-C2 Test Paketi: YouTube Adapter, TokenStore, Registry, OAuth Router.

Kapsam:
  A  — PublishAdapterRegistry: register / get / list / is_registered
  B  — PublishAdapterRegistry: kayıtsız platform → PublishAdapterNotRegisteredError
  C  — PublishAdapterRegistry: aynı platforma çift kayıt → ValueError
  D  — PublishAdapterRegistry: unregister sonrası platform kayıtsız
  E  — YouTubeAdapter: platform_name == "youtube"
  F  — YouTubeTokenStore: token yokken get_access_token() → YouTubeAuthError
  G  — YouTubeTokenStore: geçerli (süresi geçmemiş) token → doğrudan döner
  H  — YouTubeTokenStore: süresi dolmuş token → refresh çağrısı yapılır
  I  — YouTubeTokenStore: refresh başarısız → YouTubeAuthError
  J  — YouTubeTokenStore: get_auth_url URL formatı
  K  — YouTubeTokenStore: exchange_code_for_tokens başarılı
  L  — YouTubeTokenStore: exchange_code_for_tokens başarısız → YouTubeAuthError
  M  — YouTubeTokenStore: save_from_auth_response token dosyasına yazar
  N  — YouTubeTokenStore: has_credentials refresh_token + client_id kontrolü
  O  — YouTubeAdapter.upload: başarılı upload → platform_video_id döner
  P  — YouTubeAdapter.upload: dosya yoksa YouTubeUploadError (retryable=False)
  Q  — YouTubeAdapter.upload: 401 yanıtı → YouTubeAuthError
  R  — YouTubeAdapter.upload: 429 quotaExceeded → YouTubeQuotaExceededError
  S  — YouTubeAdapter.upload: 429 rate limit → YouTubeRateLimitError
  T  — YouTubeAdapter.upload: 500 upload init hatası → YouTubeUploadError
  U  — YouTubeAdapter.upload: Location header yoksa YouTubeUploadError
  V  — YouTubeAdapter.upload: binary upload 500 → YouTubeUploadError
  W  — YouTubeAdapter.activate: başarılı activate public → platform_url döner
  X  — YouTubeAdapter.activate: scheduled_at ile publishAt ayarlanır
  Y  — YouTubeAdapter.activate: 404 → YouTubeVideoNotFoundError
  Z  — YouTubeAdapter.activate: 500 → YouTubeActivateError
  AA — YouTubeAdapter.activate: 401 → YouTubeAuthError
  AB — YouTube error sınıfları: retryable bayrakları doğru
  AC — OAuth router: GET /publish/youtube/auth-url 200 döner
  AD — OAuth router: POST /publish/youtube/auth-callback başarılı
  AE — OAuth router: GET /publish/youtube/status has_credentials False
  AF — OAuth router: DELETE /publish/youtube/revoke 204 döner

Test izolasyonu:
  - Gerçek HTTP çağrısı yok: httpx.AsyncClient mock ile inject edilir
  - Token dosyası: tmp_path ile izole edilir (CONTENTHUB_DATA_DIR override)
  - YouTubeAdapter testi için minimal video dosyası tmp_path'te oluşturulur
"""
from __future__ import annotations

import json
import os
import pytest
import pytest_asyncio
import httpx
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import Response

# ---------------------------------------------------------------------------
# Yardımcılar: mock httpx yanıtı
# ---------------------------------------------------------------------------

def _make_response(status_code: int, body: dict | None = None, headers: dict | None = None) -> Response:
    """httpx.Response mock oluşturucu."""
    content = json.dumps(body or {}).encode()
    return Response(
        status_code=status_code,
        content=content,
        headers=headers or {},
    )


class MockAsyncClient:
    """httpx.AsyncClient mock — post/put metotları programlanabilir."""

    def __init__(self):
        self._responses: list[Response] = []
        self._call_count = 0
        self.closed = False

    def queue_response(self, response: Response) -> None:
        self._responses.append(response)

    async def post(self, *args, **kwargs) -> Response:
        return self._next()

    async def put(self, *args, **kwargs) -> Response:
        return self._next()

    async def aclose(self) -> None:
        self.closed = True

    def _next(self) -> Response:
        if not self._responses:
            raise RuntimeError("MockAsyncClient: yanıt kuyruğu boş")
        resp = self._responses[self._call_count % len(self._responses)]
        self._call_count += 1
        return resp

    # Context manager desteği (kullanılmasa da sağlamak iyi pratik)
    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.aclose()


# ---------------------------------------------------------------------------
# Fixture: izole veri dizini
# ---------------------------------------------------------------------------

@pytest.fixture()
def data_dir(tmp_path: Path, monkeypatch):
    """settings.data_dir'i tmp_path'e yönlendirir (pydantic Settings singleton patch)."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    return tmp_path


@pytest.fixture()
def token_store(data_dir: Path):
    """İzole data_dir kullanan YouTubeTokenStore."""
    from app.publish.youtube.token_store import YouTubeTokenStore
    return YouTubeTokenStore()


@pytest.fixture()
def valid_tokens(data_dir: Path) -> dict:
    """Süresi geçmemiş token dosyası yazar ve dict döner."""
    tokens = {
        "access_token": "ya29.valid_access",
        "refresh_token": "1//valid_refresh",
        "client_id": "test_client_id.apps.googleusercontent.com",
        "client_secret": "test_secret",
        "token_expiry": datetime.now(timezone.utc).timestamp() + 3600,
        "scope": "https://www.googleapis.com/auth/youtube.upload",
    }
    token_file = data_dir / "youtube_tokens.json"
    token_file.write_text(json.dumps(tokens), encoding="utf-8")
    return tokens


@pytest.fixture()
def expired_tokens(data_dir: Path) -> dict:
    """Süresi dolmuş token dosyası yazar ve dict döner."""
    tokens = {
        "access_token": "ya29.expired_access",
        "refresh_token": "1//valid_refresh",
        "client_id": "test_client_id.apps.googleusercontent.com",
        "client_secret": "test_secret",
        "token_expiry": datetime.now(timezone.utc).timestamp() - 100,  # geçmiş
        "scope": "https://www.googleapis.com/auth/youtube.upload",
    }
    token_file = data_dir / "youtube_tokens.json"
    token_file.write_text(json.dumps(tokens), encoding="utf-8")
    return tokens


@pytest.fixture()
def video_file(tmp_path: Path) -> str:
    """Minimal sahte video dosyası."""
    path = tmp_path / "test_video.mp4"
    path.write_bytes(b"fake_video_bytes_for_testing")
    return str(path)


@pytest.fixture()
def youtube_adapter(valid_tokens, data_dir):
    """Geçerli token ile YouTubeAdapter (http_client inject edilmemiş; testlerde override edilir)."""
    from app.publish.youtube.adapter import YouTubeAdapter
    return YouTubeAdapter()


# ===========================================================================
# A — Registry: register / get / list / is_registered
# ===========================================================================

def test_a_registry_register_and_get():
    from app.publish.registry import PublishAdapterRegistry
    from app.publish.youtube.adapter import YouTubeAdapter

    registry = PublishAdapterRegistry()
    adapter = MagicMock()
    adapter.platform_name = "youtube"

    registry.register(adapter)
    assert registry.get("youtube") is adapter
    assert registry.is_registered("youtube") is True
    assert "youtube" in registry.list_registered()


# ===========================================================================
# B — Registry: kayıtsız platform → PublishAdapterNotRegisteredError
# ===========================================================================

def test_b_registry_not_registered():
    from app.publish.registry import PublishAdapterRegistry, PublishAdapterNotRegisteredError

    registry = PublishAdapterRegistry()
    with pytest.raises(PublishAdapterNotRegisteredError):
        registry.get("tiktok")


# ===========================================================================
# C — Registry: çift kayıt → ValueError
# ===========================================================================

def test_c_registry_double_register():
    from app.publish.registry import PublishAdapterRegistry

    registry = PublishAdapterRegistry()
    adapter = MagicMock()
    adapter.platform_name = "youtube"
    registry.register(adapter)

    with pytest.raises(ValueError, match="zaten kayıtlı"):
        registry.register(adapter)


# ===========================================================================
# D — Registry: unregister sonrası platform kayıtsız
# ===========================================================================

def test_d_registry_unregister():
    from app.publish.registry import PublishAdapterRegistry, PublishAdapterNotRegisteredError

    registry = PublishAdapterRegistry()
    adapter = MagicMock()
    adapter.platform_name = "youtube"
    registry.register(adapter)
    registry.unregister("youtube")

    assert registry.is_registered("youtube") is False
    with pytest.raises(PublishAdapterNotRegisteredError):
        registry.get("youtube")


# ===========================================================================
# E — YouTubeAdapter: platform_name == "youtube"
# ===========================================================================

def test_e_adapter_platform_name(youtube_adapter):
    assert youtube_adapter.platform_name == "youtube"


# ===========================================================================
# F — TokenStore: token yokken get_access_token() → YouTubeAuthError
# ===========================================================================

@pytest.mark.asyncio
async def test_f_token_store_no_token(token_store):
    from app.publish.youtube.errors import YouTubeAuthError
    with pytest.raises(YouTubeAuthError, match="credential bulunamadı"):
        await token_store.get_access_token()


# ===========================================================================
# G — TokenStore: geçerli (süresi geçmemiş) token → doğrudan döner
# ===========================================================================

@pytest.mark.asyncio
async def test_g_token_store_valid_token(token_store, valid_tokens):
    access_token = await token_store.get_access_token()
    assert access_token == "ya29.valid_access"


# ===========================================================================
# H — TokenStore: süresi dolmuş token → refresh çağrısı yapılır
# ===========================================================================

@pytest.mark.asyncio
async def test_h_token_store_expired_refresh(token_store, expired_tokens):
    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(200, {
        "access_token": "ya29.refreshed",
        "expires_in": 3600,
    }))
    token_store._http_client = mock_client

    access_token = await token_store.get_access_token()
    assert access_token == "ya29.refreshed"


# ===========================================================================
# I — TokenStore: refresh başarısız → YouTubeAuthError
# ===========================================================================

@pytest.mark.asyncio
async def test_i_token_store_refresh_failed(token_store, expired_tokens):
    from app.publish.youtube.errors import YouTubeAuthError

    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(401, {"error": "invalid_grant"}))
    token_store._http_client = mock_client

    with pytest.raises(YouTubeAuthError, match="Token yenileme başarısız"):
        await token_store.get_access_token()


# ===========================================================================
# J — TokenStore: get_auth_url URL formatı
# ===========================================================================

def test_j_token_store_auth_url(token_store):
    url = token_store.get_auth_url(
        client_id="my_client_id",
        redirect_uri="http://localhost:8000/callback",
    )
    assert "accounts.google.com/o/oauth2/v2/auth" in url
    assert "client_id=my_client_id" in url
    assert "response_type=code" in url
    assert "access_type=offline" in url
    assert "youtube.upload" in url


# ===========================================================================
# K — TokenStore: exchange_code_for_tokens başarılı
# ===========================================================================

@pytest.mark.asyncio
async def test_k_token_store_exchange_success(token_store):
    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(200, {
        "access_token": "ya29.new_access",
        "refresh_token": "1//new_refresh",
        "expires_in": 3600,
        "scope": "https://www.googleapis.com/auth/youtube.upload",
    }))
    token_store._http_client = mock_client

    data = await token_store.exchange_code_for_tokens(
        client_id="cid",
        client_secret="csecret",
        code="auth_code_123",
        redirect_uri="http://localhost:8000/callback",
    )
    assert data["access_token"] == "ya29.new_access"
    assert data["refresh_token"] == "1//new_refresh"


# ===========================================================================
# L — TokenStore: exchange_code_for_tokens başarısız → YouTubeAuthError
# ===========================================================================

@pytest.mark.asyncio
async def test_l_token_store_exchange_failed(token_store):
    from app.publish.youtube.errors import YouTubeAuthError

    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(400, {"error": "invalid_grant"}))
    token_store._http_client = mock_client

    with pytest.raises(YouTubeAuthError, match="Code exchange başarısız"):
        await token_store.exchange_code_for_tokens(
            client_id="cid",
            client_secret="csecret",
            code="bad_code",
            redirect_uri="http://localhost:8000/callback",
        )


# ===========================================================================
# M — TokenStore: save_from_auth_response token dosyasına yazar
# ===========================================================================

def test_m_token_store_save(token_store, data_dir):
    token_store.save_from_auth_response(
        client_id="cid",
        client_secret="csecret",
        auth_response={
            "access_token": "ya29.saved",
            "refresh_token": "1//saved_refresh",
            "expires_in": 3600,
        },
    )
    token_file = data_dir / "youtube_tokens.json"
    assert token_file.exists()
    saved = json.loads(token_file.read_text())
    assert saved["access_token"] == "ya29.saved"
    assert saved["refresh_token"] == "1//saved_refresh"
    assert saved["client_id"] == "cid"
    assert saved["client_secret"] == "csecret"
    assert "token_expiry" in saved


# ===========================================================================
# N — TokenStore: has_credentials refresh_token + client_id kontrolü
# ===========================================================================

def test_n_token_store_has_credentials(token_store, data_dir):
    assert token_store.has_credentials() is False

    # Sadece access_token yazılsın (refresh yoksa False dönmeli)
    (data_dir / "youtube_tokens.json").write_text(
        json.dumps({"access_token": "ya29.x"}), encoding="utf-8"
    )
    assert token_store.has_credentials() is False

    # refresh_token + client_id eklendi
    (data_dir / "youtube_tokens.json").write_text(
        json.dumps({"access_token": "ya29.x", "refresh_token": "1//r", "client_id": "cid"}),
        encoding="utf-8",
    )
    assert token_store.has_credentials() is True


# ===========================================================================
# O — YouTubeAdapter.upload: başarılı upload → platform_video_id döner
# ===========================================================================

@pytest.mark.asyncio
async def test_o_adapter_upload_success(youtube_adapter, video_file):
    mock_client = MockAsyncClient()

    # Adım 1: init POST → 200 + Location header
    init_resp = Response(
        status_code=200,
        content=b"{}",
        headers={"Location": "https://upload.youtube.com/upload_session_123"},
    )
    # Adım 2: binary PUT → 200 + video ID
    upload_resp = _make_response(200, {"id": "video_abc123", "kind": "youtube#video"})

    mock_client._responses = [init_resp, upload_resp]
    youtube_adapter._http_client = mock_client

    result = await youtube_adapter.upload(
        publish_record_id="pr-001",
        video_path=video_file,
        payload={"title": "Test Video", "description": "Test", "tags": ["test"]},
    )

    assert result.success is True
    assert result.platform_video_id == "video_abc123"
    assert "video_abc123" in result.platform_url


# ===========================================================================
# P — YouTubeAdapter.upload: dosya yoksa YouTubeUploadError (retryable=False)
# ===========================================================================

@pytest.mark.asyncio
async def test_p_adapter_upload_file_not_found(youtube_adapter):
    from app.publish.youtube.errors import YouTubeUploadError

    with pytest.raises(YouTubeUploadError) as exc_info:
        await youtube_adapter.upload(
            publish_record_id="pr-002",
            video_path="/nonexistent/video.mp4",
            payload={},
        )
    assert exc_info.value.retryable is False


# ===========================================================================
# Q — YouTubeAdapter.upload: 401 yanıtı → YouTubeAuthError
# ===========================================================================

@pytest.mark.asyncio
async def test_q_adapter_upload_401(youtube_adapter, video_file):
    from app.publish.youtube.errors import YouTubeAuthError

    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(401, {
        "error": {"message": "Invalid Credentials", "errors": [{"reason": "authError"}]}
    }))
    youtube_adapter._http_client = mock_client

    with pytest.raises(YouTubeAuthError):
        await youtube_adapter.upload(
            publish_record_id="pr-003",
            video_path=video_file,
            payload={},
        )


# ===========================================================================
# R — YouTubeAdapter.upload: 429 quotaExceeded → YouTubeQuotaExceededError
# ===========================================================================

@pytest.mark.asyncio
async def test_r_adapter_upload_quota_exceeded(youtube_adapter, video_file):
    from app.publish.youtube.errors import YouTubeQuotaExceededError

    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(429, {
        "error": {
            "message": "Quota exceeded",
            "errors": [{"reason": "quotaExceeded"}]
        }
    }))
    youtube_adapter._http_client = mock_client

    with pytest.raises(YouTubeQuotaExceededError):
        await youtube_adapter.upload(
            publish_record_id="pr-004",
            video_path=video_file,
            payload={},
        )


# ===========================================================================
# S — YouTubeAdapter.upload: 429 rate limit → YouTubeRateLimitError
# ===========================================================================

@pytest.mark.asyncio
async def test_s_adapter_upload_rate_limit(youtube_adapter, video_file):
    from app.publish.youtube.errors import YouTubeRateLimitError

    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(429, {
        "error": {
            "message": "Rate limit exceeded",
            "errors": [{"reason": "rateLimitExceeded"}]
        }
    }))
    youtube_adapter._http_client = mock_client

    with pytest.raises(YouTubeRateLimitError):
        await youtube_adapter.upload(
            publish_record_id="pr-005",
            video_path=video_file,
            payload={},
        )


# ===========================================================================
# T — YouTubeAdapter.upload: 500 upload init hatası → YouTubeUploadError
# ===========================================================================

@pytest.mark.asyncio
async def test_t_adapter_upload_init_500(youtube_adapter, video_file):
    from app.publish.youtube.errors import YouTubeUploadError

    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(500, {
        "error": {"message": "Internal Server Error", "errors": [{"reason": "backendError"}]}
    }))
    youtube_adapter._http_client = mock_client

    with pytest.raises(YouTubeUploadError):
        await youtube_adapter.upload(
            publish_record_id="pr-006",
            video_path=video_file,
            payload={},
        )


# ===========================================================================
# U — YouTubeAdapter.upload: Location header yoksa YouTubeUploadError
# ===========================================================================

@pytest.mark.asyncio
async def test_u_adapter_upload_missing_location(youtube_adapter, video_file):
    from app.publish.youtube.errors import YouTubeUploadError

    mock_client = MockAsyncClient()
    # 200 ama Location header yok
    mock_client.queue_response(Response(
        status_code=200,
        content=b"{}",
        headers={},  # Location yok
    ))
    youtube_adapter._http_client = mock_client

    with pytest.raises(YouTubeUploadError) as exc_info:
        await youtube_adapter.upload(
            publish_record_id="pr-007",
            video_path=video_file,
            payload={},
        )
    assert exc_info.value.retryable is False


# ===========================================================================
# V — YouTubeAdapter.upload: binary upload 500 → YouTubeUploadError
# ===========================================================================

@pytest.mark.asyncio
async def test_v_adapter_upload_binary_500(youtube_adapter, video_file):
    from app.publish.youtube.errors import YouTubeUploadError

    mock_client = MockAsyncClient()
    # Init başarılı
    init_resp = Response(
        status_code=200,
        content=b"{}",
        headers={"Location": "https://upload.youtube.com/upload_session_abc"},
    )
    # Binary upload başarısız
    upload_fail = _make_response(503, {
        "error": {"message": "Service Unavailable", "errors": [{"reason": "backendError"}]}
    })
    mock_client._responses = [init_resp, upload_fail]
    youtube_adapter._http_client = mock_client

    with pytest.raises(YouTubeUploadError):
        await youtube_adapter.upload(
            publish_record_id="pr-008",
            video_path=video_file,
            payload={},
        )


# ===========================================================================
# W — YouTubeAdapter.activate: başarılı activate public → platform_url döner
# ===========================================================================

@pytest.mark.asyncio
async def test_w_adapter_activate_success_public(youtube_adapter):
    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(200, {
        "id": "video_abc123",
        "status": {"privacyStatus": "public"},
    }))
    youtube_adapter._http_client = mock_client

    result = await youtube_adapter.activate(
        publish_record_id="pr-010",
        platform_video_id="video_abc123",
        scheduled_at=None,
    )

    assert result.success is True
    assert result.platform_video_id == "video_abc123"
    assert "video_abc123" in result.platform_url
    assert "youtube.com/watch" in result.platform_url


# ===========================================================================
# X — YouTubeAdapter.activate: scheduled_at ile publishAt ayarlanır
# ===========================================================================

@pytest.mark.asyncio
async def test_x_adapter_activate_scheduled(youtube_adapter):
    received_body = {}

    class CapturingMockClient(MockAsyncClient):
        async def put(self, url, **kwargs):
            content = kwargs.get("content", b"{}")
            received_body.update(json.loads(content))
            return _make_response(200, {
                "id": "video_sched",
                "status": {"privacyStatus": "private", "publishAt": "2030-06-01T10:00:00.000Z"},
            })

    youtube_adapter._http_client = CapturingMockClient()

    scheduled = datetime(2030, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
    result = await youtube_adapter.activate(
        publish_record_id="pr-011",
        platform_video_id="video_sched",
        scheduled_at=scheduled,
    )

    assert result.success is True
    assert "publishAt" in received_body.get("status", {})
    assert "2030-06-01" in received_body["status"]["publishAt"]


# ===========================================================================
# Y — YouTubeAdapter.activate: 404 → YouTubeVideoNotFoundError
# ===========================================================================

@pytest.mark.asyncio
async def test_y_adapter_activate_not_found(youtube_adapter):
    from app.publish.youtube.errors import YouTubeVideoNotFoundError

    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(404, {}))
    youtube_adapter._http_client = mock_client

    with pytest.raises(YouTubeVideoNotFoundError):
        await youtube_adapter.activate(
            publish_record_id="pr-012",
            platform_video_id="missing_video_id",
        )


# ===========================================================================
# Z — YouTubeAdapter.activate: 500 → YouTubeActivateError
# ===========================================================================

@pytest.mark.asyncio
async def test_z_adapter_activate_500(youtube_adapter):
    from app.publish.youtube.errors import YouTubeActivateError

    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(500, {
        "error": {"message": "Backend Error", "errors": [{"reason": "backendError"}]}
    }))
    youtube_adapter._http_client = mock_client

    with pytest.raises(YouTubeActivateError):
        await youtube_adapter.activate(
            publish_record_id="pr-013",
            platform_video_id="video_id",
        )


# ===========================================================================
# AA — YouTubeAdapter.activate: 401 → YouTubeAuthError
# ===========================================================================

@pytest.mark.asyncio
async def test_aa_adapter_activate_401(youtube_adapter):
    from app.publish.youtube.errors import YouTubeAuthError

    mock_client = MockAsyncClient()
    mock_client.queue_response(_make_response(401, {
        "error": {"message": "Invalid Credentials", "errors": [{"reason": "authError"}]}
    }))
    youtube_adapter._http_client = mock_client

    with pytest.raises(YouTubeAuthError):
        await youtube_adapter.activate(
            publish_record_id="pr-014",
            platform_video_id="video_id",
        )


# ===========================================================================
# AB — YouTube error sınıfları: retryable bayrakları doğru
# ===========================================================================

def test_ab_error_retryable_flags():
    from app.publish.youtube.errors import (
        YouTubeAuthError,
        YouTubeQuotaExceededError,
        YouTubeRateLimitError,
        YouTubeUploadError,
        YouTubeActivateError,
        YouTubeVideoNotFoundError,
    )

    assert YouTubeAuthError("test").retryable is False
    assert YouTubeQuotaExceededError().retryable is False
    assert YouTubeRateLimitError().retryable is True
    assert YouTubeUploadError("test").retryable is True  # default
    assert YouTubeUploadError("test", retryable=False).retryable is False
    assert YouTubeActivateError("test").retryable is True  # default
    assert YouTubeVideoNotFoundError("vid_123").retryable is False


# ===========================================================================
# AC — OAuth router: GET /publish/youtube/auth-url 200 döner
# ===========================================================================

def test_ac_oauth_router_auth_url():
    from fastapi.testclient import TestClient
    from fastapi import FastAPI
    from app.publish.youtube.router import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    resp = client.get(
        "/publish/youtube/auth-url",
        params={"client_id": "test_cid", "redirect_uri": "http://localhost/cb"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "auth_url" in data
    assert "accounts.google.com" in data["auth_url"]
    assert "test_cid" in data["auth_url"]


# ===========================================================================
# AD — OAuth router: POST /publish/youtube/auth-callback başarılı
# ===========================================================================

@pytest.mark.asyncio
async def test_ad_oauth_router_auth_callback(data_dir):
    from fastapi.testclient import TestClient
    from fastapi import FastAPI
    from app.publish.youtube import router as yt_router_module

    # Router modülündeki _token_store'u mock ile değiştir
    mock_store = MagicMock()
    mock_store.exchange_code_for_tokens = AsyncMock(return_value={
        "access_token": "ya29.new",
        "refresh_token": "1//new_refresh",
        "expires_in": 3600,
    })
    mock_store.save_from_auth_response = MagicMock()

    import app.publish.youtube.router as yt_router_mod
    original = yt_router_mod._token_store
    yt_router_mod._token_store = mock_store

    try:
        app = FastAPI()
        app.include_router(yt_router_mod.router)
        client = TestClient(app)

        resp = client.post("/publish/youtube/auth-callback", json={
            "client_id": "cid",
            "client_secret": "csecret",
            "code": "auth_code_xyz",
            "redirect_uri": "http://localhost/cb",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
    finally:
        yt_router_mod._token_store = original


# ===========================================================================
# AE — OAuth router: GET /publish/youtube/status has_credentials False
# ===========================================================================

def test_ae_oauth_router_status_no_credentials(data_dir):
    from fastapi.testclient import TestClient
    from fastapi import FastAPI
    import app.publish.youtube.router as yt_router_mod

    # Token dosyası yok (data_dir boş)
    original = yt_router_mod._token_store
    yt_router_mod._token_store = MagicMock()
    yt_router_mod._token_store.has_credentials = MagicMock(return_value=False)

    try:
        app = FastAPI()
        app.include_router(yt_router_mod.router)
        client = TestClient(app)

        resp = client.get("/publish/youtube/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["has_credentials"] is False
    finally:
        yt_router_mod._token_store = original


# ===========================================================================
# AF — OAuth router: DELETE /publish/youtube/revoke 204 döner
# ===========================================================================

def test_af_oauth_router_revoke(data_dir):
    from fastapi.testclient import TestClient
    from fastapi import FastAPI
    import app.publish.youtube.router as yt_router_mod

    app = FastAPI()
    app.include_router(yt_router_mod.router)
    client = TestClient(app)

    # Token dosyası yokken çağır (idempotent — 204 dönmeli)
    resp = client.delete("/publish/youtube/revoke")
    assert resp.status_code == 204

    # Token dosyası varken çağır
    token_file = data_dir / "youtube_tokens.json"
    token_file.write_text('{"access_token": "x"}', encoding="utf-8")

    # settings.data_dir'in tmp_path'i göstermesi gerekiyor
    # router'daki revoke endpoint'i settings.data_dir kullandığı için
    # data_dir fixture'ın CONTENTHUB_DATA_DIR set etmesi gerekiyor
    # Bu fixture zaten monkeypatch ile ayarlıyor — dosya silinmeli

    resp2 = client.delete("/publish/youtube/revoke")
    assert resp2.status_code == 204
