"""
PHASE Z-B — Channel import hardening tests.

Kapsam:
  - url_utils.parse_channel_url: edge-case'ler (whitespace, malformed,
    non-http, tracking strip, case normalize, trailing slash, uzun URL
    schema gate).
  - metadata_fetch._fetch_html: timeout, 4xx, 5xx, consent-wall HTML,
    malformed HTML, large body truncation — hepsinde exception YOK;
    partial state dönüyor.
  - service.create_channel_profile_from_url:
      - duplicate aynı user içinde reddediliyor (açıklayıcı hata).
      - cross-user duplicate izinli (aynı URL, farklı user).
      - metadata None olsa bile partial state ile profile yaratılıyor.
      - metadata_json sadece dolu alanlar için üretiliyor, başka kullanıcı
        verisi sızdırmıyor.

Bu testler mevcut production davranışını doğrulamak için yazıldı —
ownership / auth / security zayıflatmıyor.
"""
from __future__ import annotations

import pytest
from unittest.mock import patch, AsyncMock

from app.channels.url_utils import (
    ChannelURLError,
    parse_channel_url,
    normalize_channel_url,
)
from app.channels import metadata_fetch as mf
from app.channels import service as chan_service
from app.channels.schemas import ChannelProfileCreateFromURL


# ===========================================================================
# A) url_utils edge-cases
# ===========================================================================


class TestURLParse:
    def test_none_raises(self):
        with pytest.raises(ChannelURLError):
            parse_channel_url(None)  # type: ignore[arg-type]

    def test_empty_raises(self):
        with pytest.raises(ChannelURLError):
            parse_channel_url("")

    def test_whitespace_only_raises(self):
        with pytest.raises(ChannelURLError):
            parse_channel_url("   \t\n  ")

    def test_non_http_scheme_raises(self):
        with pytest.raises(ChannelURLError):
            parse_channel_url("ftp://www.youtube.com/@test")
        with pytest.raises(ChannelURLError):
            parse_channel_url("javascript:alert(1)")

    def test_no_scheme_auto_https(self):
        info = parse_channel_url("youtube.com/@foo")
        assert info.normalized_url == "https://www.youtube.com/@foo"

    def test_mixed_case_host_normalized(self):
        info = parse_channel_url("https://WWW.YouTube.COM/@Foo")
        # host lowercased, handle case-preserved
        assert info.normalized_url == "https://www.youtube.com/@Foo"

    def test_tracking_params_stripped(self):
        # utm_source kayboluyor — normalized URL temiz
        info = parse_channel_url(
            "https://www.youtube.com/@foo?utm_source=twitter&si=xyz"
        )
        assert "utm_source" not in info.normalized_url
        assert "si=" not in info.normalized_url

    def test_trailing_slash_tolerated(self):
        a = parse_channel_url("https://www.youtube.com/@foo")
        b = parse_channel_url("https://www.youtube.com/@foo/")
        assert a.normalized_url == b.normalized_url == "https://www.youtube.com/@foo"

    def test_unsupported_platform_raises(self):
        with pytest.raises(ChannelURLError):
            parse_channel_url("https://tiktok.com/@foo")

    def test_youtube_non_channel_path_raises(self):
        # YouTube host ama kanal URL'i değil (watch vb.)
        with pytest.raises(ChannelURLError):
            parse_channel_url("https://www.youtube.com/watch?v=abc123")

    def test_channel_id_detected(self):
        info = parse_channel_url(
            "https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx"
        )
        assert info.external_channel_id == "UCxxxxxxxxxxxxxxxxxxxxxx"
        assert info.kind == "channel"

    def test_handle_detected(self):
        info = parse_channel_url("https://www.youtube.com/@alpha.beta_gamma-1")
        assert info.handle == "@alpha.beta_gamma-1"
        assert info.kind == "handle"

    def test_normalize_url_convenience(self):
        assert (
            normalize_channel_url("youtube.com/@foo")
            == "https://www.youtube.com/@foo"
        )


# ===========================================================================
# B) metadata_fetch._fetch_html — edge-cases
# ===========================================================================


class _FakeResponse:
    """httpx.Response benzeri minimal shim (stream mode)."""

    def __init__(self, status_code: int, body: bytes, encoding: str = "utf-8"):
        self.status_code = status_code
        self._body = body
        self.encoding = encoding

    async def aiter_bytes(self):
        # Chunks of 64 KB — gerçekçi
        for i in range(0, len(self._body), 64 * 1024):
            yield self._body[i : i + 64 * 1024]

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False


class _FakeClient:
    def __init__(self, resp: _FakeResponse):
        self._resp = resp

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    def stream(self, method, url):  # noqa: ARG002
        return self._resp


def _patch_httpx(monkeypatch, resp: _FakeResponse):
    """httpx.AsyncClient constructor'ını sabit yanıt veren shim ile değiştir."""

    def _factory(*a, **kw):
        return _FakeClient(resp)

    monkeypatch.setattr(mf.httpx, "AsyncClient", _factory)


@pytest.mark.asyncio
async def test_fetch_html_returns_none_on_404(monkeypatch):
    _patch_httpx(monkeypatch, _FakeResponse(404, b"<html>not found</html>"))
    out = await mf._fetch_html("https://www.youtube.com/@missing")
    assert out is None


@pytest.mark.asyncio
async def test_fetch_html_returns_none_on_500(monkeypatch):
    _patch_httpx(monkeypatch, _FakeResponse(500, b"<html>boom</html>"))
    out = await mf._fetch_html("https://www.youtube.com/@boom")
    assert out is None


@pytest.mark.asyncio
async def test_fetch_html_truncates_large_body(monkeypatch):
    # 2 MB gövde → 512 KB limit
    big = b"A" * (2 * 1024 * 1024)
    _patch_httpx(monkeypatch, _FakeResponse(200, big))
    out = await mf._fetch_html("https://www.youtube.com/@huge")
    assert out is not None
    assert len(out) == mf._HTML_CHUNK_LIMIT


@pytest.mark.asyncio
async def test_fetch_html_handles_exception_gracefully(monkeypatch):
    class _ErrClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        def stream(self, *a, **kw):
            raise RuntimeError("boom")

    monkeypatch.setattr(mf.httpx, "AsyncClient", lambda *a, **kw: _ErrClient())
    out = await mf._fetch_html("https://www.youtube.com/@err")
    assert out is None  # exception swallowed, partial state downstream


# ===========================================================================
# C) metadata_fetch.fetch_channel_metadata — partial state
# ===========================================================================


@pytest.mark.asyncio
async def test_fetch_channel_metadata_all_sources_fail(monkeypatch):
    """Tum HTML fetch basarisiz → partial=True + fetch_error."""

    async def _no_html(_url):
        return None

    monkeypatch.setattr(mf, "_fetch_html", _no_html)
    info = parse_channel_url("https://www.youtube.com/@nobody")
    meta = await mf.fetch_channel_metadata(info)
    assert meta.is_partial is True
    assert meta.fetch_error is not None
    assert meta.title is None


@pytest.mark.asyncio
async def test_fetch_channel_metadata_consent_wall(monkeypatch):
    """Consent wall HTML (og: yok, title 'YouTube') → partial=True."""

    consent_html = (
        "<html><head><title>YouTube</title>"
        "<meta name='robots' content='noindex'/></head>"
        "<body>Before you continue to YouTube…</body></html>"
    )

    async def _html(_url):
        return consent_html

    monkeypatch.setattr(mf, "_fetch_html", _html)
    info = parse_channel_url("https://www.youtube.com/@wall")
    meta = await mf.fetch_channel_metadata(info)
    # Title 'YouTube' — strip suffix sonrasi bos. Avatar/external_id de yok.
    # Yani tum alanlar bos → is_partial True.
    assert meta.is_partial is True


@pytest.mark.asyncio
async def test_fetch_channel_metadata_malformed_html(monkeypatch):
    """Broken HTML → parse error yok, bulamadigini soyler."""

    async def _html(_url):
        return "<<<<not even html>>>>"

    monkeypatch.setattr(mf, "_fetch_html", _html)
    info = parse_channel_url("https://www.youtube.com/@bad")
    meta = await mf.fetch_channel_metadata(info)
    assert meta.is_partial is True


@pytest.mark.asyncio
async def test_fetch_channel_metadata_success_parses_og_tags(monkeypatch):
    html = (
        "<html><head>"
        "<meta property='og:title' content='Test Channel - YouTube'/>"
        "<meta property='og:image' content='https://yt3.ggpht.com/avatar.jpg'/>"
        "<meta property='og:description' content='A test channel'/>"
        "<script>var x = \"channelId\" : \"UCaaaaaaaaaaaaaaaaaaaaaa\";</script>"
        "</head></html>"
    )

    async def _html(_url):
        return html

    monkeypatch.setattr(mf, "_fetch_html", _html)
    info = parse_channel_url("https://www.youtube.com/@testchannel")
    meta = await mf.fetch_channel_metadata(info)
    assert meta.is_partial is False
    # Suffix stripped
    assert meta.title == "Test Channel"
    assert meta.avatar_url == "https://yt3.ggpht.com/avatar.jpg"
    assert meta.description == "A test channel"
    assert meta.external_channel_id == "UCaaaaaaaaaaaaaaaaaaaaaa"


# ===========================================================================
# D) service.create_channel_profile_from_url — duplicate + isolation
# ===========================================================================


@pytest.mark.asyncio
async def test_create_from_url_partial_when_fetch_fails(
    db_session, monkeypatch
):
    """HTTP fetch basarisiz → import_status='partial' profile kaydedilir."""
    # Bir kullanici olustur
    from app.db.models import User
    u = User(
        email="ch-hardening-1@test.local",
        display_name="Ch User",
        slug="ch-hard-1",
        role="user",
        status="active",
    )
    db_session.add(u)
    await db_session.commit()
    await db_session.refresh(u)

    async def _no_html(_url):
        return None

    monkeypatch.setattr(mf, "_fetch_html", _no_html)

    payload = ChannelProfileCreateFromURL(source_url="https://www.youtube.com/@zpartial")
    profile = await chan_service.create_channel_profile_from_url(
        db_session, user_id=u.id, payload=payload
    )
    assert profile.import_status == "partial"
    assert profile.import_error is not None
    assert profile.platform == "youtube"
    assert profile.normalized_url == "https://www.youtube.com/@zpartial"
    # Partial olsa bile title'i uydurmadik
    assert profile.title is None


@pytest.mark.asyncio
async def test_create_from_url_rejects_duplicate_same_user(
    db_session, monkeypatch
):
    from app.db.models import User
    u = User(
        email="ch-hardening-2@test.local",
        display_name="Ch User 2",
        slug="ch-hard-2",
        role="user",
        status="active",
    )
    db_session.add(u)
    await db_session.commit()
    await db_session.refresh(u)

    async def _no_html(_url):
        return None

    monkeypatch.setattr(mf, "_fetch_html", _no_html)
    payload = ChannelProfileCreateFromURL(source_url="https://www.youtube.com/@zdup")
    # Ilk ekleme basarili
    await chan_service.create_channel_profile_from_url(
        db_session, user_id=u.id, payload=payload
    )
    # Ikinci ayni URL aciklayici ValueError ile reddedilmeli
    with pytest.raises(ValueError) as exc_info:
        await chan_service.create_channel_profile_from_url(
            db_session, user_id=u.id, payload=payload
        )
    assert "zaten eklenmis" in str(exc_info.value)


@pytest.mark.asyncio
async def test_create_from_url_cross_user_duplicate_allowed(
    db_session, monkeypatch
):
    """Iki farkli user ayni URL'i ekleyebilmeli — ownership izolasyonu."""
    from app.db.models import User
    u1 = User(email="ch-hardening-3a@test.local", display_name="A",
              slug="ch-hard-3a", role="user", status="active")
    u2 = User(email="ch-hardening-3b@test.local", display_name="B",
              slug="ch-hard-3b", role="user", status="active")
    db_session.add_all([u1, u2])
    await db_session.commit()
    await db_session.refresh(u1)
    await db_session.refresh(u2)

    async def _no_html(_url):
        return None

    monkeypatch.setattr(mf, "_fetch_html", _no_html)
    payload = ChannelProfileCreateFromURL(source_url="https://www.youtube.com/@zcross")
    p1 = await chan_service.create_channel_profile_from_url(
        db_session, user_id=u1.id, payload=payload
    )
    p2 = await chan_service.create_channel_profile_from_url(
        db_session, user_id=u2.id, payload=payload
    )
    assert p1.id != p2.id
    assert p1.user_id == u1.id
    assert p2.user_id == u2.id
    assert p1.normalized_url == p2.normalized_url


@pytest.mark.asyncio
async def test_create_from_url_metadata_json_no_foreign_data(
    db_session, monkeypatch
):
    """metadata_json sadece bu import'un alanlarini tutmali — leak yok."""
    from app.db.models import User
    u = User(email="ch-hardening-4@test.local", display_name="Ch4",
             slug="ch-hard-4", role="user", status="active")
    db_session.add(u)
    await db_session.commit()
    await db_session.refresh(u)

    async def _html(_url):
        return (
            "<html><head>"
            "<meta property='og:description' content='desc-z'/>"
            "</head></html>"
        )

    monkeypatch.setattr(mf, "_fetch_html", _html)
    payload = ChannelProfileCreateFromURL(source_url="https://www.youtube.com/@zmeta")
    profile = await chan_service.create_channel_profile_from_url(
        db_session, user_id=u.id, payload=payload
    )

    import json as _json
    data = _json.loads(profile.metadata_json) if profile.metadata_json else {}
    # Sadece bilinen / onaylanmis alanlar
    assert set(data.keys()) <= {"description", "fetch_error", "url_kind"}
    assert data.get("description") == "desc-z"
