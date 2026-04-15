"""
Faz G testleri — site-specific parsers + priority chain v2 + twitter card +
generic fallbacks.

Test kapsami:
  - JSON-LD (zaten Faz B'de tested) + v2 chain'de ilk sirada mi?
  - Site-specific: Amazon, Trendyol, Hepsiburada, N11, Shopify, WooCommerce
  - Twitter Card fallback
  - Generic fallback
  - Priority: jsonld > site_specific > og > twittercard > generic
  - Her parser None donuyorsa zincirin devami bozulmadan calismali.

HTML fixture'lari inline string olarak tanimlanir — testler disk dosyasina
baglanmaz (pytest tmp_path gerekmez).
"""

from __future__ import annotations

import pytest

from app.modules.product_review.parser_chain import ParsedProduct
from app.modules.product_review.site_parsers import (
    HOST_MATCHERS,
    PARSER_PRIORITY,
    parse_amazon,
    parse_hepsiburada,
    parse_n11,
    parse_product_html_v2,
    parse_shopify,
    parse_site_specific,
    parse_trendyol,
    parse_twittercard,
    parse_woocommerce,
)


# ---------------------------------------------------------------------------
# Amazon
# ---------------------------------------------------------------------------


AMAZON_HTML = """\
<html><head>
<meta property="og:type" content="product">
</head><body>
<span id="productTitle">Sony WH-1000XM5 Wireless Headphones</span>
<a id="bylineInfo">Visit the Sony Store</a>
<span class="a-icon-alt">4.5 out of 5 stars</span>
<span id="acrCustomerReviewText">12,345 ratings</span>
<span class="a-price"><span class="a-offscreen">$399.99</span></span>
<img id="landingImage" src="https://m.media-amazon.com/images/I/xxx.jpg">
</body></html>
"""


def test_amazon_parser_extracts_core_fields():
    p = parse_amazon(AMAZON_HTML, "https://www.amazon.com/dp/B09XS7JWHH")
    assert p is not None
    assert p.parser_source == "amazon"
    assert p.confidence == 0.7
    assert "Sony" in (p.name or "")
    assert p.price == 399.99
    assert p.currency == "USD"
    assert p.image_url and p.image_url.startswith("https://m.media-amazon.com/")
    assert p.brand == "Sony"
    assert p.rating_value == 4.5
    assert p.rating_count == 12345
    assert p.sku == "B09XS7JWHH"


def test_amazon_parser_none_when_no_title():
    assert parse_amazon("<html><body>nothing here</body></html>", "https://x/") is None


# ---------------------------------------------------------------------------
# Trendyol
# ---------------------------------------------------------------------------


TRENDYOL_HTML = """\
<html><head></head><body>
<div class="product-container">
  <h1 class="pr-new-br">APPLE iPhone 15 Pro 256GB</h1>
  <span class="prc-dsc">64.999,00 TL</span>
  <img class="detail-section-img" src="https://cdn.dsmcdn.com/i1.jpg">
</div>
</body></html>
"""


def test_trendyol_parser_extracts_brand_name_price():
    p = parse_trendyol(
        TRENDYOL_HTML,
        "https://www.trendyol.com/apple/iphone-15-pro-p-123456",
    )
    assert p is not None
    assert p.parser_source == "trendyol"
    assert p.brand == "APPLE"
    assert "iPhone 15 Pro" in (p.name or "")
    assert p.price == 64999.0
    assert p.currency == "TRY"
    assert p.image_url == "https://cdn.dsmcdn.com/i1.jpg"
    assert p.sku == "123456"


def test_trendyol_parser_none_when_no_title():
    assert parse_trendyol("<html></html>", "https://trendyol.com/x") is None


# ---------------------------------------------------------------------------
# Hepsiburada
# ---------------------------------------------------------------------------


HEPSIBURADA_HTML = """\
<html><head></head><body>
<h1 id="product-name">Samsung Galaxy S24 Ultra 512GB</h1>
<a data-test-id="brand-link">Samsung</a>
<span class="product-price">84999,00 TL</span>
<img id="productImage" src="https://productimages.hepsiburada.net/s1.jpg">
</body></html>
"""


def test_hepsiburada_parser_extracts_fields():
    p = parse_hepsiburada(
        HEPSIBURADA_HTML,
        "https://www.hepsiburada.com/samsung-galaxy-p-HBCV00001ABC123",
    )
    assert p is not None
    assert p.parser_source == "hepsiburada"
    assert "Galaxy S24" in (p.name or "")
    assert p.price == 84999.0
    assert p.currency == "TRY"
    assert p.brand == "Samsung"
    assert p.image_url.startswith("https://productimages.hepsiburada.net/")
    assert p.sku == "HBCV00001ABC123"


# ---------------------------------------------------------------------------
# N11
# ---------------------------------------------------------------------------


N11_HTML = """\
<html><body>
<h1 class="proName">Xiaomi Redmi Note 13 Pro 256GB</h1>
<ins class="newPrice">9.999,90 TL</ins>
<img class="imgObj" src="https://n11scdn.akamaized.net/a1/img.jpg">
</body></html>
"""


def test_n11_parser_extracts_fields():
    p = parse_n11(N11_HTML, "https://www.n11.com/urun/xiaomi-redmi-note-13")
    assert p is not None
    assert p.parser_source == "n11"
    assert "Xiaomi" in (p.name or "")
    assert p.price == 9999.90
    assert p.currency == "TRY"
    assert p.image_url.startswith("https://n11scdn.akamaized.net/")


# ---------------------------------------------------------------------------
# Shopify
# ---------------------------------------------------------------------------


SHOPIFY_HTML = """\
<html><body>
<script type="application/json" id="ProductJson-product-handle">
{"title":"Allbirds Tree Runners","vendor":"Allbirds","handle":"tree-runners",
 "description":"<p>Ultra comfy wool runners</p>",
 "images":["//cdn.shopify.com/s/img1.jpg","https://cdn.shopify.com/s/img2.jpg"],
 "variants":[{"price":"115.00"}]}
</script>
</body></html>
"""


def test_shopify_parser_extracts_from_product_json():
    p = parse_shopify(SHOPIFY_HTML, "https://mystore.myshopify.com/products/tree-runners")
    assert p is not None
    assert p.parser_source == "shopify"
    assert p.name == "Allbirds Tree Runners"
    assert p.brand == "Allbirds"
    assert p.price == 115.0
    assert p.image_url == "https://cdn.shopify.com/s/img1.jpg"
    assert len(p.image_urls) == 2
    assert p.sku == "tree-runners"


def test_shopify_parser_cents_fallback():
    """Integer fiyat = cents — ondalik yoksa /100."""
    html = """\
<html><body>
<script type="application/json" id="ProductJson-x">
{"title":"T","variants":[{"price":"1999"}]}
</script></body></html>
"""
    p = parse_shopify(html, "https://x.myshopify.com/")
    assert p is not None
    assert p.price == 19.99  # cents -> decimal


def test_shopify_parser_none_when_no_product_json():
    assert parse_shopify("<html></html>", "https://x.myshopify.com/") is None


# ---------------------------------------------------------------------------
# WooCommerce
# ---------------------------------------------------------------------------


WOOCOMMERCE_HTML = """\
<html><head><meta name="generator" content="WooCommerce 8.1.2">
<meta property="og:image" content="https://shop.example.com/wp/img.jpg"></head>
<body class="woocommerce page">
<h1 class="product_title entry-title">Organic Coffee Beans 1kg</h1>
<p class="price"><span class="woocommerce-Price-amount">29.99 EUR</span></p>
</body></html>
"""


def test_woocommerce_parser_extracts_fields():
    p = parse_woocommerce(WOOCOMMERCE_HTML, "https://shop.example.com/product/coffee")
    assert p is not None
    assert p.parser_source == "woocommerce"
    assert "Coffee" in (p.name or "")
    assert p.price == 29.99
    assert p.currency == "EUR"
    assert p.image_url == "https://shop.example.com/wp/img.jpg"


def test_woocommerce_parser_none_when_not_woo_site():
    assert parse_woocommerce("<html><body>regular</body></html>", "https://x/") is None


# ---------------------------------------------------------------------------
# Twitter Card
# ---------------------------------------------------------------------------


TWITTER_HTML = """\
<html><head>
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Nike Air Max 90">
<meta name="twitter:description" content="Iconic sneaker">
<meta name="twitter:image" content="https://static.nike.com/a/img.jpg">
<meta name="twitter:label1" content="Price">
<meta name="twitter:data1" content="$120.00">
</head><body></body></html>
"""


def test_twitter_card_parser_extracts_fields():
    p = parse_twittercard(TWITTER_HTML, "https://www.nike.com/t/air-max-90")
    assert p is not None
    assert p.parser_source == "twittercard"
    assert p.confidence == 0.4
    assert p.name == "Nike Air Max 90"
    assert "Iconic" in (p.description or "")
    assert p.image_url.startswith("https://static.nike.com/")
    assert p.price == 120.0
    assert p.currency == "USD"


def test_twitter_card_parser_none_when_no_title():
    assert parse_twittercard("<html></html>", "https://x/") is None


# ---------------------------------------------------------------------------
# Host dispatcher
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "host,expected_parser",
    [
        ("www.amazon.com", "amazon"),
        ("amazon.com.tr", "amazon"),
        ("www.trendyol.com", "trendyol"),
        ("ty.gl", "trendyol"),
        ("www.hepsiburada.com", "hepsiburada"),
        ("www.n11.com", "n11"),
        ("shop.myshopify.com", "shopify"),
        ("unknown-site.com", None),
    ],
)
def test_host_matcher_dispatch(host, expected_parser):
    match = None
    for m in HOST_MATCHERS:
        if m.matches(host):
            match = m.parser_name
            break
    assert match == expected_parser


def test_parse_site_specific_falls_back_to_woocommerce_when_host_unknown():
    # amazon host match yok ama body class=woocommerce var
    p = parse_site_specific(WOOCOMMERCE_HTML, "https://random-shop.com/product/coffee")
    assert p is not None
    assert p.parser_source == "woocommerce"


# ---------------------------------------------------------------------------
# Priority chain v2
# ---------------------------------------------------------------------------


JSONLD_HTML = """\
<html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product",
 "name":"JsonLd Product","image":"https://i/jl.jpg",
 "offers":{"@type":"Offer","price":"99.00","priceCurrency":"USD","availability":"InStock"}}
</script></head>
<body>
<h1 id="productTitle">Amazon Product Name</h1>
</body></html>
"""


def test_priority_v2_jsonld_wins_over_site_specific():
    p = parse_product_html_v2(
        JSONLD_HTML, "https://www.amazon.com/dp/B1234567890",
    )
    assert p is not None
    assert p.parser_source == "jsonld"
    assert p.name == "JsonLd Product"
    assert p.price == 99.0


def test_priority_v2_site_specific_wins_when_no_jsonld():
    # JSON-LD olmadan: Amazon parser devreye girer.
    p = parse_product_html_v2(
        AMAZON_HTML, "https://www.amazon.com/dp/B09XS7JWHH",
    )
    assert p is not None
    assert p.parser_source == "amazon"


def test_priority_v2_og_wins_when_no_jsonld_no_site_match():
    og_only_html = """\
<html><head>
<meta property="og:type" content="product">
<meta property="og:title" content="OG Product">
<meta property="og:image" content="https://i/og.jpg">
<meta property="product:price:amount" content="49.50">
<meta property="product:price:currency" content="EUR">
</head><body></body></html>
"""
    p = parse_product_html_v2(og_only_html, "https://unknown-site.com/p/1")
    assert p is not None
    assert p.parser_source == "opengraph"
    assert p.name == "OG Product"
    assert p.price == 49.5


def test_priority_v2_twitter_card_fallback_when_no_og():
    p = parse_product_html_v2(TWITTER_HTML, "https://unknown-site.com/t/air")
    assert p is not None
    # Twitter card confidence 0.4 ama is_usable degilse partial kullanilir.
    # Name + price + image var — is_usable ok.
    assert p.parser_source == "twittercard"


def test_priority_v2_generic_final_fallback():
    generic_html = """\
<html><head><title>Generic Page Title</title></head>
<body><h1>Generic Product Heading</h1><img src="https://i/x.jpg"></body></html>
"""
    p = parse_product_html_v2(generic_html, "https://unknown-site.com/x")
    assert p is not None
    assert p.parser_source == "generic"
    assert p.name == "Generic Product Heading"


def test_priority_v2_returns_best_partial_when_none_usable():
    # JSON-LD name var ama image/price yok — is_usable degil.
    partial_jsonld = """\
<html><head>
<script type="application/ld+json">
{"@context":"schema.org","@type":"Product","name":"Only Name"}
</script></head><body></body></html>
"""
    p = parse_product_html_v2(partial_jsonld, "https://unknown-site.com/p/1")
    assert p is not None
    # is_usable degil ama best_partial: name var -> dondurulur.
    assert p.name == "Only Name"


def test_priority_chain_order_constant():
    """Priority zincirinin sirasi sabit — jsonld > site > og > twitter > generic."""
    names = [n for n, _ in PARSER_PRIORITY]
    assert names == ["jsonld", "site_specific", "opengraph", "twittercard", "generic"]


def test_priority_v2_exception_in_parser_does_not_break_chain(monkeypatch):
    """Bir parser exception firlatirsa sonraki devam etsin."""
    from app.modules.product_review import site_parsers

    def boom(html, url):
        raise RuntimeError("simulated parser crash")

    # jsonld'i patch et → generic'e dusmeli.
    monkeypatch.setattr(site_parsers, "PARSER_PRIORITY", (
        ("jsonld", boom),
        ("site_specific", site_parsers.parse_site_specific),
        ("opengraph", site_parsers.parse_opengraph),
        ("twittercard", site_parsers.parse_twittercard),
        ("generic", site_parsers.PARSER_PRIORITY[-1][1]),  # parse_generic
    ))
    generic_html = """\
<html><head><title>Fallback</title></head>
<body><h1>Heading</h1></body></html>
"""
    p = site_parsers.parse_product_html_v2(generic_html, "https://x/y")
    assert p is not None
    assert p.parser_source == "generic"
