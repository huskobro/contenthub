"""
Faz G hardening testleri — shortlink expansion + robots.txt respect +
SSRF/throttle/timeout + duplicate canonical_url.

Bu testler `urllib` ve `socket` seviyesinde `monkeypatch` ile gercek HTTP
cagrisi yapmadan davranisi dogrular.
"""

from __future__ import annotations

import io
import socket
import uuid
from email.message import Message
from unittest.mock import patch

import pytest
import urllib.error

from app.modules.product_review import robots_guard, shortlink, http_fetch
from app.modules.product_review.shortlink import (
    ShortlinkError,
    ShortlinkResult,
    ShortlinkSSRFBlocked,
    ShortlinkTooManyHops,
    expand_shortlink,
    is_shortlink,
)


# ---------------------------------------------------------------------------
# is_shortlink
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "url,expected",
    [
        ("https://a.co/xyz", True),
        ("https://www.a.co/xyz", True),
        ("https://amzn.to/foo", True),
        ("https://ty.gl/abc", True),
        ("https://www.amazon.com/dp/B00", False),
        ("https://www.trendyol.com/apple/iphone-p-1", False),
        ("", False),
        ("not-a-url", False),
    ],
)
def test_is_shortlink(url, expected):
    assert is_shortlink(url) is expected


# ---------------------------------------------------------------------------
# expand_shortlink: no-op when not a shortlink
# ---------------------------------------------------------------------------


def test_expand_shortlink_non_shortlink_returns_input():
    res = expand_shortlink("https://www.amazon.com/dp/B12345")
    assert res.shortlink_detected is False
    assert res.final_url == "https://www.amazon.com/dp/B12345"
    assert res.hops == ["https://www.amazon.com/dp/B12345"]


# ---------------------------------------------------------------------------
# expand_shortlink: 302 chain followed
# ---------------------------------------------------------------------------


class _FakeHTTPResponse:
    """urlopen() no-redirect fake — 200 response."""

    def __init__(self, status=200):
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def getcode(self):
        return self.status


def _fake_http_error(code: int, location: str):
    """_NoRedirect kanadinda 30x'i HTTPError olarak gelir."""
    msg = Message()
    if location:
        msg["Location"] = location
    return urllib.error.HTTPError(
        "http://fake/", code, f"Redirect {code}", msg, io.BytesIO(b""),
    )


def test_expand_shortlink_follows_single_hop(monkeypatch):
    shortlink._CACHE = {} if hasattr(shortlink, "_CACHE") else shortlink.__dict__.get("_CACHE", {})

    calls = []

    def fake_head(url, *, timeout_s):
        calls.append(("HEAD", url))
        if url == "https://a.co/xyz":
            return 301, "https://www.amazon.com/dp/B00ABCDE"
        return 200, None

    monkeypatch.setattr(shortlink, "_head_one", fake_head)
    # GET fallback cagirilmamali
    monkeypatch.setattr(shortlink, "_get_one_for_redirect", lambda url, **kw: (200, None))
    # SSRF guard bypass
    monkeypatch.setattr(shortlink, "_is_private_host", lambda h: False)

    res = expand_shortlink("https://a.co/xyz")
    assert res.shortlink_detected is True
    assert res.final_url == "https://www.amazon.com/dp/B00ABCDE"
    assert res.hops[0] == "https://a.co/xyz"
    assert res.hops[-1] == "https://www.amazon.com/dp/B00ABCDE"


def test_expand_shortlink_rejects_private_host(monkeypatch):
    def fake_head(url, *, timeout_s):
        # Hop -> localhost — SSRF bloke olmali
        return 301, "http://127.0.0.1/internal"
    monkeypatch.setattr(shortlink, "_head_one", fake_head)
    monkeypatch.setattr(shortlink, "_get_one_for_redirect", lambda url, **kw: (200, None))

    # Ilk hop (a.co) public, ikinci hop (127.0.0.1) private.
    call = {"n": 0}

    def fake_private(host):
        call["n"] += 1
        if host == "127.0.0.1":
            return True
        return False

    monkeypatch.setattr(shortlink, "_is_private_host", fake_private)

    with pytest.raises(ShortlinkSSRFBlocked):
        expand_shortlink("https://a.co/xyz", max_hops=3)


def test_expand_shortlink_respects_max_hops(monkeypatch):
    def loop_head(url, *, timeout_s):
        # Her seferinde bir sonraki farkli URL'e git
        import hashlib
        h = hashlib.md5(url.encode()).hexdigest()[:8]
        return 302, f"https://a.co/next-{h}"
    monkeypatch.setattr(shortlink, "_head_one", loop_head)
    monkeypatch.setattr(shortlink, "_get_one_for_redirect", lambda url, **kw: (200, None))
    monkeypatch.setattr(shortlink, "_is_private_host", lambda h: False)

    with pytest.raises(ShortlinkTooManyHops):
        expand_shortlink("https://a.co/xyz", max_hops=2)


def test_expand_shortlink_head_405_falls_back_to_get(monkeypatch):
    """Amazon gibi HEAD'i reddeden siteler — GET fallback devreye girmeli."""
    def head(url, *, timeout_s):
        return 405, None  # 405 + location yok => GET fallback
    def get(url, *, timeout_s):
        return 301, "https://www.amazon.com/dp/B12"
    monkeypatch.setattr(shortlink, "_head_one", head)
    monkeypatch.setattr(shortlink, "_get_one_for_redirect", get)
    monkeypatch.setattr(shortlink, "_is_private_host", lambda h: False)

    res = expand_shortlink("https://a.co/abc")
    assert res.final_url == "https://www.amazon.com/dp/B12"
    assert res.shortlink_detected is True


# ---------------------------------------------------------------------------
# robots_guard
# ---------------------------------------------------------------------------


def test_robots_is_allowed_short_circuit_when_respect_false():
    robots_guard.reset()
    # respect_robots_txt=False → her zaman True (http istegi yapilmaz)
    result = robots_guard.is_allowed(
        "https://example.com/xyz",
        respect_robots_txt=False,
    )
    assert result is True


def test_robots_is_allowed_allows_when_no_disallow(monkeypatch):
    robots_guard.reset()

    def fake_fetch(host, *, scheme, timeout_s):
        rules = robots_guard._RobotsRules()
        rules.fetched = True
        rules.ua_rules = {"*": [("allow", "/")]}
        return rules

    monkeypatch.setattr(robots_guard, "_fetch_robots", fake_fetch)
    assert robots_guard.is_allowed(
        "https://example.com/product",
        respect_robots_txt=True,
    ) is True


def test_robots_is_allowed_blocks_when_disallow_matches(monkeypatch):
    robots_guard.reset()

    def fake_fetch(host, *, scheme, timeout_s):
        rules = robots_guard._RobotsRules()
        rules.fetched = True
        rules.ua_rules = {"*": [("disallow", "/product/")]}
        return rules

    monkeypatch.setattr(robots_guard, "_fetch_robots", fake_fetch)
    blocked = robots_guard.is_allowed(
        "https://example.com/product/123",
        respect_robots_txt=True,
    )
    assert blocked is False


def test_robots_allow_overrides_disallow_when_more_specific(monkeypatch):
    robots_guard.reset()

    def fake_fetch(host, *, scheme, timeout_s):
        rules = robots_guard._RobotsRules()
        rules.fetched = True
        rules.ua_rules = {"*": [
            ("disallow", "/product/"),
            ("allow", "/product/allowed/"),
        ]}
        return rules

    monkeypatch.setattr(robots_guard, "_fetch_robots", fake_fetch)
    # /product/allowed/ -> daha uzun (daha spesifik) allow kazanir
    assert robots_guard.is_allowed(
        "https://example.com/product/allowed/abc",
        respect_robots_txt=True,
    ) is True
    # /product/other -> allow match yok, disallow matches
    assert robots_guard.is_allowed(
        "https://example.com/product/other/xyz",
        respect_robots_txt=True,
    ) is False


def test_robots_permissive_on_fetch_error(monkeypatch):
    robots_guard.reset()

    def boom(host, *, scheme, timeout_s):
        rules = robots_guard._RobotsRules()
        rules.fetched = False
        rules.error = "simulated network error"
        return rules

    monkeypatch.setattr(robots_guard, "_fetch_robots", boom)
    # permissive_on_error=True (default)
    assert robots_guard.is_allowed(
        "https://example.com/x",
        respect_robots_txt=True,
        permissive_on_error=True,
    ) is True
    # permissive_on_error=False
    assert robots_guard.is_allowed(
        "https://example.com/x",
        respect_robots_txt=True,
        permissive_on_error=False,
    ) is False


def test_robots_specific_ua_overrides_star(monkeypatch):
    robots_guard.reset()

    def fake_fetch(host, *, scheme, timeout_s):
        rules = robots_guard._RobotsRules()
        rules.fetched = True
        rules.ua_rules = {
            "*": [("disallow", "/")],
            "contenthub": [("allow", "/")],
        }
        return rules

    monkeypatch.setattr(robots_guard, "_fetch_robots", fake_fetch)
    # "ContentHub/1.0" UA -> "contenthub" key ile eslesir → allow kazanir
    assert robots_guard.is_allowed(
        "https://example.com/p/1",
        user_agent="ContentHub/1.0 scraper",
        respect_robots_txt=True,
    ) is True


# ---------------------------------------------------------------------------
# http_fetch SSRF + throttle (zaten Faz B'de var — ek dogrulama)
# ---------------------------------------------------------------------------


def test_http_fetch_ssrf_blocks_loopback():
    http_fetch.reset_throttle_cache()
    with pytest.raises(http_fetch.SSRFBlocked):
        http_fetch.fetch_html("http://127.0.0.1/xyz", min_interval_s=0)


def test_http_fetch_rejects_non_http_scheme():
    with pytest.raises(http_fetch.FetchError):
        http_fetch.fetch_html("file:///etc/passwd", min_interval_s=0)


def test_http_fetch_throttle_blocks_repeat(monkeypatch):
    http_fetch.reset_throttle_cache()
    import time

    base = [100.0]

    def fake_monotonic():
        return base[0]

    monkeypatch.setattr(http_fetch.time, "monotonic", fake_monotonic)
    monkeypatch.setattr(http_fetch, "_is_private_host", lambda h: False)

    # Ilk cagri — kayit edilecek, fetch denenmeli. urlopen'i bloklayalim
    # ki "ilk cagri" SSRF/HTTP seviyesinde patlamasin.
    def fake_urlopen(req, timeout=None):
        raise urllib.error.URLError("simulated")

    monkeypatch.setattr(http_fetch.urllib.request, "urlopen", fake_urlopen)

    with pytest.raises(http_fetch.FetchError):
        http_fetch.fetch_html("https://example.com/x", min_interval_s=3.0)

    # Ikinci cagri (ayni host) — 1s sonra throttle tarafindan bloklanir
    base[0] = 101.0
    with pytest.raises(http_fetch.ThrottleBlocked):
        http_fetch.fetch_html("https://example.com/y", min_interval_s=3.0)


def test_http_fetch_timeout_wrapped(monkeypatch):
    http_fetch.reset_throttle_cache()
    monkeypatch.setattr(http_fetch, "_is_private_host", lambda h: False)

    def fake_urlopen(req, timeout=None):
        raise socket.timeout("simulated timeout")

    monkeypatch.setattr(http_fetch.urllib.request, "urlopen", fake_urlopen)
    with pytest.raises(http_fetch.FetchTimeoutError):
        http_fetch.fetch_html("https://example.com/p/1", min_interval_s=0)


# ---------------------------------------------------------------------------
# Duplicate canonical_url — Faz G executor hardening
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_duplicate_canonical_url_executor_detects_conflict(monkeypatch, tmp_path):
    """
    Executor, AYNI canonical_url'a sahip ikinci urunu tespit edince yeni urune
    canonical atamaz + sonuc dict'inde canonical_conflict=True doner. Primary
    urunun canonical'i zaten atanmis kalir.
    """
    from sqlalchemy import select
    import json
    import uuid as uuidmod
    from app.db.models import Product
    from app.db.session import AsyncSessionLocal
    from app.modules.product_review import shortlink as _shortlink
    from app.modules.product_review import robots_guard as _robots
    from app.modules.product_review.executors import product_scrape as ps
    from app.modules.product_review.http_fetch import FetchResult
    from app.modules.product_review.parser_chain import ParsedProduct

    # 1) Iki product: p1 canonical atanmis, p2 bos.
    canonical = f"https://example.com/p/{uuidmod.uuid4().hex[:8]}"
    pid1 = uuidmod.uuid4().hex
    pid2 = uuidmod.uuid4().hex

    async with AsyncSessionLocal() as db:
        p1 = Product(
            id=pid1, name="P1",
            source_url=f"https://example.com/a?tag=aff&p_id={pid1[:8]}",
            canonical_url=canonical,
            is_test_data=True,
        )
        p2 = Product(
            id=pid2, name="P2",
            source_url=f"https://example.com/b?utm_src=fb&p_id={pid1[:8]}",
            canonical_url=None,
            is_test_data=True,
        )
        db.add(p1)
        db.add(p2)
        await db.commit()

    try:
        # 2) fetch_html, parse_product_html_v2, canonicalize_url patch'leri.
        fake_html = "<html><body>stub</body></html>"

        async def fake_fetch_async(url, *, min_interval_s, max_bytes, timeout_s):
            return FetchResult(
                status=200, url=url, final_url=url, html=fake_html,
                bytes_read=len(fake_html), truncated=False, elapsed_ms=5,
            )
        monkeypatch.setattr(ps, "_fetch_async", fake_fetch_async)
        monkeypatch.setattr(
            ps, "parse_product_html_v2",
            lambda h, u: ParsedProduct(
                name="P2 scraped",
                parser_source="jsonld",
                confidence=0.9,
                image_url="https://i/x.jpg",
            ),
        )
        monkeypatch.setattr(ps, "canonicalize_url", lambda u: canonical)
        monkeypatch.setattr(_shortlink, "is_shortlink", lambda u: False)

        # 3) _scrape_single_product p2 icin çağır: canonical p1'de var.
        executor = ps.ProductScrapeStepExecutor()
        async with AsyncSessionLocal() as db:
            result = await executor._scrape_single_product(
                db,
                product_id=pid2,
                min_interval_s=0.0,
                max_bytes=100000,
                timeout_s=10,
                respect_robots=False,
            )

        assert result["canonical_conflict"] is True
        # p2'nin canonical'i None kalmali (cakistigi icin atanmaz).
        async with AsyncSessionLocal() as db:
            refreshed = (
                await db.execute(select(Product).where(Product.id == pid2))
            ).scalar_one()
            assert refreshed.canonical_url is None
    finally:
        async with AsyncSessionLocal() as db:
            from sqlalchemy import delete
            await db.execute(delete(Product).where(Product.id.in_([pid1, pid2])))
            await db.commit()


# ---------------------------------------------------------------------------
# Priority chain sabit sirasi + executor wiring
# ---------------------------------------------------------------------------


def test_executor_imports_v2_chain():
    from app.modules.product_review.executors import product_scrape as ps
    assert ps.parse_product_html_v2 is not None
    assert ps.expand_shortlink is not None
    assert ps.is_shortlink is not None
    assert ps.robots_guard is not None
