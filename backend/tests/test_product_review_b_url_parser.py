"""
Faz B unit testleri — URL utilities + parser_chain + http_fetch guards.

Network'e cikmayan testler. fetch_html sadece SSRF + scheme + throttle
tarafinda dogrulanir (gercek fetch gerektirmez).
"""

from __future__ import annotations

import pytest

from app.modules.product_review.url_utils import (
    canonicalize_url,
    extract_host,
    is_http_url,
    normalize_url,
)
from app.modules.product_review.parser_chain import (
    ParsedProduct,
    parse_generic,
    parse_jsonld,
    parse_opengraph,
    parse_product_html,
)
from app.modules.product_review import http_fetch


# ---------------------------------------------------------------------------
# URL utilities
# ---------------------------------------------------------------------------


def test_is_http_url_variants():
    assert is_http_url("http://x.com")
    assert is_http_url("HTTPS://x.com")
    assert not is_http_url("ftp://x.com")
    assert not is_http_url("")
    assert not is_http_url(None)  # type: ignore[arg-type]


def test_normalize_url_lowercases_scheme_host_and_strips_fragment():
    r = normalize_url("HTTPS://WWW.Amazon.COM/dp/X1#reviews")
    assert r == "https://www.amazon.com/dp/X1"


def test_normalize_url_rejects_non_http():
    with pytest.raises(ValueError):
        normalize_url("ftp://x.com/a")
    with pytest.raises(ValueError):
        normalize_url("")
    with pytest.raises(ValueError):
        normalize_url("https:///noHost")


def test_canonicalize_strips_amazon_affiliate_and_keeps_path():
    r = canonicalize_url("https://www.amazon.com.tr/dp/B08XL2KZ?tag=aff-123&ref=srXYZ&th=1")
    assert r == "https://www.amazon.com.tr/dp/B08XL2KZ"


def test_canonicalize_strips_trendyol_boutique_and_merchant():
    r = canonicalize_url(
        "https://www.trendyol.com/apple/iphone-15-p-123?boutiqueId=59&merchantId=9"
    )
    assert r == "https://www.trendyol.com/apple/iphone-15-p-123"


def test_canonicalize_preserves_product_id_params():
    r = canonicalize_url("https://shop.com/p?utm_source=fb&id=42&sku=SX1")
    # id + sku preserved; utm_source stripped
    assert "id=42" in r
    assert "sku=SX1" in r
    assert "utm_source" not in r


def test_canonicalize_sorts_params_deterministically():
    r1 = canonicalize_url("https://shop.com/p?sku=A&id=2")
    r2 = canonicalize_url("https://shop.com/p?id=2&sku=A")
    assert r1 == r2


def test_extract_host_lowercases_and_handles_missing():
    assert extract_host("HTTPS://Example.COM/x") == "example.com"
    assert extract_host("") is None
    assert extract_host("not-a-url") is None or extract_host("not-a-url") == ""


# ---------------------------------------------------------------------------
# parser_chain
# ---------------------------------------------------------------------------


_HTML_JSONLD_FULL = """
<html><head>
<script type="application/ld+json">
{
 "@context":"https://schema.org",
 "@type":"Product",
 "name":"Apple iPhone 15 Pro",
 "image":["https://cdn.example.com/iphone15.jpg"],
 "description":"Titanium frame.",
 "brand":{"@type":"Brand","name":"Apple"},
 "sku":"IP15P-256",
 "offers":{"@type":"Offer","price":"54999.00","priceCurrency":"TRY",
   "availability":"https://schema.org/InStock"},
 "aggregateRating":{"@type":"AggregateRating","ratingValue":"4.7","ratingCount":1234}
}
</script></head></html>
"""


def test_parse_jsonld_full_fields():
    p = parse_jsonld(_HTML_JSONLD_FULL, "https://x.com")
    assert p is not None
    assert p.parser_source == "jsonld"
    assert p.confidence >= 0.85
    assert p.name == "Apple iPhone 15 Pro"
    assert p.brand == "Apple"
    assert p.price == 54999.00
    assert p.currency == "TRY"
    assert p.availability == "in_stock"
    assert p.rating_value == 4.7
    assert p.rating_count == 1234
    assert p.sku == "IP15P-256"
    assert p.image_url.startswith("https://")


def test_parse_opengraph_product():
    html = """
    <html><head>
    <meta property="og:type" content="product">
    <meta property="og:title" content="Sony WH-1000XM5">
    <meta property="og:image" content="https://cdn.example.com/xm5.jpg">
    <meta property="product:price:amount" content="8999.90">
    <meta property="product:price:currency" content="TRY">
    <meta property="product:availability" content="instock">
    </head></html>
    """
    p = parse_opengraph(html, "https://x.com")
    assert p is not None
    assert p.parser_source == "opengraph"
    assert p.name == "Sony WH-1000XM5"
    assert p.price == 8999.9
    assert p.currency == "TRY"
    assert p.availability == "in_stock"


def test_parse_generic_fallback_extracts_title_and_price():
    html = """
    <html><head><title>Obscure Shop — Widget X</title>
    <meta name="description" content="A widget.">
    </head><body>
    <h1>Widget X</h1>
    <img src="https://cdn.example.com/wx.jpg">
    <p>Only 299,90 TL today!</p>
    </body></html>
    """
    p = parse_generic(html, "https://x.com")
    assert p is not None
    assert p.parser_source == "generic"
    assert p.name == "Widget X"
    assert p.image_url == "https://cdn.example.com/wx.jpg"
    assert p.price == 299.90
    assert p.currency == "TRY"


def test_parse_product_html_prefers_jsonld_over_og():
    # JSON-LD + OG birlikte — JSON-LD secilmeli (daha yuksek confidence).
    html = _HTML_JSONLD_FULL + """
    <meta property="og:title" content="OG Fallback Title">
    <meta property="og:image" content="https://cdn.example.com/og.jpg">
    """
    p = parse_product_html(html, "https://x.com")
    assert p is not None
    assert p.parser_source == "jsonld"
    assert p.name == "Apple iPhone 15 Pro"


def test_parse_product_html_returns_none_for_empty():
    assert parse_product_html("", "https://x.com") is None
    assert parse_product_html("<html></html>", "https://x.com") is None


# ---------------------------------------------------------------------------
# http_fetch — SSRF + throttle + scheme
# ---------------------------------------------------------------------------


def test_fetch_html_rejects_localhost():
    with pytest.raises(http_fetch.SSRFBlocked):
        http_fetch.fetch_html("http://localhost/x", min_interval_s=0)


def test_fetch_html_rejects_loopback_ip():
    with pytest.raises(http_fetch.SSRFBlocked):
        http_fetch.fetch_html("http://127.0.0.1/x", min_interval_s=0)


def test_fetch_html_rejects_private_ip():
    with pytest.raises(http_fetch.SSRFBlocked):
        http_fetch.fetch_html("http://10.0.0.1/x", min_interval_s=0)


def test_fetch_html_rejects_non_http_scheme():
    with pytest.raises(http_fetch.FetchError):
        http_fetch.fetch_html("ftp://example.com/x")


def test_fetch_html_rejects_empty():
    with pytest.raises(http_fetch.FetchError):
        http_fetch.fetch_html("")


def test_fetch_html_throttles_same_host():
    http_fetch.reset_throttle_cache()
    import time as _t

    # simulate a recent fetch to host
    http_fetch._PER_HOST_LAST_FETCH["example.com"] = _t.monotonic()
    with pytest.raises(http_fetch.ThrottleBlocked):
        http_fetch._check_throttle("example.com", 5.0)

    # zero/negative interval → always allowed
    http_fetch.reset_throttle_cache()
    http_fetch._check_throttle("example.com", 0.0)

    # reset + first call → allowed
    http_fetch.reset_throttle_cache()
    http_fetch._check_throttle("example.com", 5.0)
