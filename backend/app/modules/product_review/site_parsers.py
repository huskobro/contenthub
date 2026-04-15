"""
Site-specific parsers (Faz G).

Per-host parser'lar — JSON-LD ve OpenGraph mevcut degilse ya da eksikse
devreye giren, host'a ozel DOM pattern'larina gore veri cikaran katman.

Her parser asagidaki imzayi tasir:

    parse(html: str, url: str) -> Optional[ParsedProduct]

Return:
  - ParsedProduct (confidence 0.7)  — parser eslesme buldu.
  - None                             — parser bu host'a uymuyor veya veri cikmadi.

Desteklenen siteler (Tier-1):
  - amazon  (amazon.com, amazon.com.tr, amazon.de, ...)
  - trendyol (trendyol.com)
  - hepsiburada (hepsiburada.com)
  - n11 (n11.com)
  - shopify (my-shop.myshopify.com, vb.)
  - woocommerce (wp-icinde WooCommerce ile calisan generic magaza — sinyal:
    body class'inda "woocommerce" VEYA generator meta'sinda "woocommerce")

Bu parser'lar kasten minimal tutuldu:
  - BeautifulSoup ya da lxml kullanmaz — stdlib `html.parser.HTMLParser`.
  - Site SPA haline gelirse parser None doner; JSON-LD/OG kurulu kalir.
  - CSS selector zinciri yoktur; tag/attr matching ile calisir.

Priority chain (`parse_product_html_v2`):

  1. JSON-LD                   (confidence 0.9)
  2. Site-specific per-host    (confidence 0.7)
  3. OpenGraph                 (confidence 0.45–0.6)
  4. Twitter Card              (confidence 0.4)
  5. Generic fallback          (confidence 0.3)

Ilk `is_usable()` donen sonuc kullanilir. Hicbiri usable degilse en yuksek
confidence'li "name'i olan" sonuc doner (kismi veriyle downstream gate
yazar).
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Callable, Iterable, Optional
from urllib.parse import urlparse

from app.modules.product_review.parser_chain import (
    ParsedProduct,
    parse_generic,
    parse_jsonld,
    parse_opengraph,
    _as_float,
    _as_int,
    _normalize_availability,
    _MetaCollector,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Per-host matcher
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class HostMatch:
    """URL host'unu aday parser'a esle."""

    parser_name: str
    suffix_patterns: tuple[str, ...]

    def matches(self, host: str) -> bool:
        h = (host or "").lower()
        return any(h.endswith(sfx) for sfx in self.suffix_patterns)


# Host -> parser dispatch tablosu.
# Sira onemli degil; parse_site_specific hepsini tarar.
HOST_MATCHERS: tuple[HostMatch, ...] = (
    HostMatch("amazon", (
        "amazon.com", "amazon.com.tr", "amazon.co.uk", "amazon.de",
        "amazon.fr", "amazon.it", "amazon.es", "amazon.ca", "amazon.co.jp",
        "amazon.in", "amazon.com.mx", "amazon.com.br",
    )),
    HostMatch("trendyol", ("trendyol.com", "ty.gl",)),
    HostMatch("hepsiburada", ("hepsiburada.com", "hb.com.tr",)),
    HostMatch("n11", ("n11.com",)),
    HostMatch("shopify", ("myshopify.com",)),
)


def _host_of(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# Site parser helpers
# ---------------------------------------------------------------------------


class _TagTextCollector(HTMLParser):
    """
    Belirli (tag, attr={key:value}) kombinasyonunun TEXT icerigini toplar.

    - name='#text_by_id': id match
    - name='#text_by_class': class (token) match
    - name='attr': attr value'yu kaydet (innerText degil)

    ContentHub'ta stdlib HTMLParser yetiyor; BeautifulSoup eklemiyoruz.
    """

    def __init__(
        self,
        *,
        target_tag: str,
        match_attr: str,
        match_value: str,
        match_mode: str = "contains",  # "contains" | "exact" | "token"
        capture: str = "text",  # "text" | "attr:<name>"
        limit: Optional[int] = None,
    ) -> None:
        super().__init__()
        self._target_tag = target_tag.lower()
        self._match_attr = match_attr.lower()
        self._match_value = match_value.lower()
        self._match_mode = match_mode
        self._capture = capture
        self._limit = limit
        self._in_tag = 0  # nested depth
        self._buf: list[str] = []
        self.results: list[str] = []

    def _attr_matches(self, attrs: dict[str, str]) -> Optional[str]:
        raw = attrs.get(self._match_attr, "") or ""
        low = raw.lower()
        ok = False
        if self._match_mode == "exact":
            ok = low == self._match_value
        elif self._match_mode == "token":
            ok = self._match_value in low.split()
        else:
            ok = self._match_value in low
        if not ok:
            return None
        if self._capture.startswith("attr:"):
            return attrs.get(self._capture.split(":", 1)[1].lower(), "") or ""
        return None  # text mode — caller acar

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag.lower() != self._target_tag:
            if self._in_tag > 0:
                # Nested tag — sayilmaz, text toplamaya devam
                pass
            return
        d = {k.lower(): (v or "") for k, v in attrs}
        matched = self._attr_matches(d)
        if matched is not None:
            self.results.append(matched)
            return
        # text capture — sadece attr eslesirse tag'i ac
        raw = d.get(self._match_attr, "").lower()
        ok = False
        if self._match_mode == "exact":
            ok = raw == self._match_value
        elif self._match_mode == "token":
            ok = self._match_value in raw.split()
        else:
            ok = self._match_value in raw
        if ok and self._capture == "text":
            self._in_tag += 1
            self._buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == self._target_tag and self._in_tag > 0:
            self._in_tag -= 1
            if self._in_tag == 0:
                text = "".join(self._buf).strip()
                if text:
                    self.results.append(text)
                self._buf = []
                if self._limit is not None and len(self.results) >= self._limit:
                    # Simgesel — gelecekte stop_parsing()
                    pass

    def handle_data(self, data: str) -> None:
        if self._in_tag > 0:
            self._buf.append(data)


def _collect(
    html: str,
    *,
    tag: str,
    attr: str,
    value: str,
    mode: str = "contains",
    capture: str = "text",
    limit: Optional[int] = None,
) -> list[str]:
    c = _TagTextCollector(
        target_tag=tag,
        match_attr=attr,
        match_value=value,
        match_mode=mode,
        capture=capture,
        limit=limit,
    )
    try:
        c.feed(html)
    except Exception:
        return []
    return c.results


# Basit price regex (_PRICE_REGEX generic'te zaten tanimli; site parser'lari
# da ayni mantiga basvurur ama kendi context'inde).
_SITE_PRICE = re.compile(
    r"([0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)\s*"
    r"(?:TL|TRY|USD|EUR|GBP|\$|£|€|₺)",
    re.IGNORECASE,
)

_SITE_PRICE_LEADING = re.compile(
    r"(?:TL|TRY|USD|EUR|GBP|\$|£|€|₺)\s*"
    r"([0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)",
    re.IGNORECASE,
)


def _first_price(text: str, *, default_currency: Optional[str] = None) -> tuple[Optional[float], Optional[str]]:
    """Text'ten ilk fiyati + currency sinyalini cikar."""
    if not text:
        return None, None
    m = _SITE_PRICE.search(text) or _SITE_PRICE_LEADING.search(text)
    if not m:
        return None, default_currency
    amt = _as_float(m.group(1))
    currency = default_currency
    up = m.group(0).upper()
    for key, val in (
        ("TL", "TRY"), ("TRY", "TRY"), ("₺", "TRY"),
        ("USD", "USD"), ("$", "USD"),
        ("EUR", "EUR"), ("€", "EUR"),
        ("GBP", "GBP"), ("£", "GBP"),
    ):
        if key in up:
            currency = val
            break
    return amt, currency


# ---------------------------------------------------------------------------
# Site parsers
# ---------------------------------------------------------------------------


def parse_amazon(html: str, url: str) -> Optional[ParsedProduct]:
    """
    Amazon: productTitle (span id="productTitle"), a-price, landingImage,
    acrPopover (rating), byline (brand).
    """
    if not html:
        return None
    name = _collect(html, tag="span", attr="id", value="productTitle", mode="exact")
    title = (name[0].strip() if name else "") or ""
    if not title:
        # Alternatif: id=title
        alt = _collect(html, tag="h1", attr="id", value="title", mode="exact")
        if alt:
            title = alt[0].strip()
    if not title:
        return None

    p = ParsedProduct(parser_source="amazon", confidence=0.7)
    p.name = title[:500]

    # Price: <span class="a-offscreen">$29.99</span> ilk eslesme.
    prices = _collect(html, tag="span", attr="class", value="a-offscreen", mode="token")
    if prices:
        for pt in prices:
            amt, cur = _first_price(pt)
            if amt is not None:
                p.price = amt
                if cur:
                    p.currency = cur
                break

    # Image: <img id="landingImage" src="...">
    imgs = _collect(
        html,
        tag="img",
        attr="id",
        value="landingImage",
        mode="exact",
        capture="attr:src",
    )
    if imgs and imgs[0].startswith(("http://", "https://")):
        p.image_url = imgs[0]
        p.image_urls = [imgs[0]]

    # Brand: <a id="bylineInfo">Brand</a>
    brand = _collect(html, tag="a", attr="id", value="bylineInfo", mode="exact")
    if brand:
        txt = brand[0].strip()
        # Genelde "Visit the Sony Store" gibi — ilk kelimeyi al
        if txt:
            p.brand = txt.split(" Store")[0].replace("Visit the ", "").strip()[:200]

    # Rating: <span class="a-icon-alt">4.5 out of 5 stars</span>
    ratings = _collect(html, tag="span", attr="class", value="a-icon-alt", mode="token")
    for r in ratings:
        m = re.search(r"([0-9]+[.,][0-9]+)", r)
        if m:
            p.rating_value = _as_float(m.group(1))
            break

    # Rating count: id="acrCustomerReviewText"
    rc = _collect(html, tag="span", attr="id", value="acrCustomerReviewText", mode="exact")
    if rc:
        m = re.search(r"([0-9][0-9,\.]*)", rc[0])
        if m:
            p.rating_count = _as_int(m.group(1).replace(",", "").replace(".", ""))

    # ASIN — URL path'ten (/dp/BXXXXXXXXX)
    m = re.search(r"/dp/([A-Z0-9]{10})", url)
    if m:
        p.sku = m.group(1)

    return p


def parse_trendyol(html: str, url: str) -> Optional[ParsedProduct]:
    """
    Trendyol: <h1 class="pr-new-br"> (brand+name), <span class="prc-dsc"> (price),
    <img class="detail-section-img"> (image).

    Trendyol SPA oldugu icin JSON-LD genelde calisir; fallback burada.
    """
    if not html:
        return None

    # Brand+name: <h1 class="pr-new-br">
    titles = _collect(html, tag="h1", attr="class", value="pr-new-br", mode="token")
    title = titles[0].strip() if titles else ""
    if not title:
        # Alternatif: pr-nm
        alts = _collect(html, tag="h1", attr="class", value="pr-nm", mode="token")
        title = alts[0].strip() if alts else ""
    if not title:
        return None

    p = ParsedProduct(parser_source="trendyol", confidence=0.7)
    # Trendyol h1 formati: "MARKA PRODUCT ADI" — ilk kelime brand adayi
    parts = title.split(None, 1)
    if len(parts) == 2 and parts[0].isupper():
        p.brand = parts[0][:200]
        p.name = parts[1][:500]
    else:
        p.name = title[:500]

    # Price: class="prc-dsc" VEYA class="prc-slg"
    for cls in ("prc-dsc", "prc-slg", "product-price"):
        prices = _collect(html, tag="span", attr="class", value=cls, mode="token")
        if prices:
            amt, cur = _first_price(prices[0], default_currency="TRY")
            if amt is not None:
                p.price = amt
                p.currency = cur or "TRY"
                break

    # Image: detail gallery first img
    imgs = _collect(
        html,
        tag="img",
        attr="class",
        value="detail-section-img",
        mode="token",
        capture="attr:src",
    )
    if not imgs:
        imgs = _collect(
            html,
            tag="img",
            attr="class",
            value="product-img",
            mode="token",
            capture="attr:src",
        )
    if imgs:
        for src in imgs:
            if src and src.startswith(("http://", "https://")):
                p.image_url = src
                p.image_urls = [src]
                break

    # Product id: URL'den "-p-{digits}"
    m = re.search(r"-p-(\d+)", url)
    if m:
        p.sku = m.group(1)

    return p


def parse_hepsiburada(html: str, url: str) -> Optional[ParsedProduct]:
    """
    Hepsiburada: <h1 id="product-name"> (name),
    <span class="product-price"> (price),
    <img class="product-image"> (image).
    """
    if not html:
        return None
    titles = _collect(html, tag="h1", attr="id", value="product-name", mode="exact")
    if not titles:
        titles = _collect(html, tag="h1", attr="class", value="product-name", mode="token")
    title = titles[0].strip() if titles else ""
    if not title:
        return None

    p = ParsedProduct(parser_source="hepsiburada", confidence=0.7)
    p.name = title[:500]

    # Price
    for cls in ("product-price", "price-value", "notranslate"):
        prices = _collect(html, tag="span", attr="class", value=cls, mode="token")
        if prices:
            amt, cur = _first_price(prices[0], default_currency="TRY")
            if amt is not None:
                p.price = amt
                p.currency = cur or "TRY"
                break

    # Image: id="productImage" VEYA class="product-image"
    imgs = _collect(
        html,
        tag="img",
        attr="id",
        value="productImage",
        mode="exact",
        capture="attr:src",
    )
    if not imgs:
        imgs = _collect(
            html,
            tag="img",
            attr="class",
            value="product-image",
            mode="token",
            capture="attr:src",
        )
    if imgs:
        for src in imgs:
            if src and src.startswith(("http://", "https://")):
                p.image_url = src
                p.image_urls = [src]
                break

    # Brand: <a data-test-id="brand-link">
    brands = _collect(
        html,
        tag="a",
        attr="data-test-id",
        value="brand-link",
        mode="exact",
    )
    if brands:
        p.brand = brands[0].strip()[:200]

    # Product code: URL'den "p-{alphanumerics}"
    m = re.search(r"p-([A-Z0-9]{8,})", url)
    if m:
        p.sku = m.group(1)

    return p


def parse_n11(html: str, url: str) -> Optional[ParsedProduct]:
    """
    N11: <h1 class="proName"> (name), <ins class="newPrice"> (price),
    <img class="lazy"> (image).
    """
    if not html:
        return None
    titles = _collect(html, tag="h1", attr="class", value="proName", mode="token")
    title = titles[0].strip() if titles else ""
    if not title:
        return None

    p = ParsedProduct(parser_source="n11", confidence=0.7)
    p.name = title[:500]

    # Price: <ins class="newPrice">
    for tag in ("ins", "span"):
        for cls in ("newPrice", "price", "priceContainer"):
            prices = _collect(html, tag=tag, attr="class", value=cls, mode="token")
            if prices:
                amt, cur = _first_price(prices[0], default_currency="TRY")
                if amt is not None:
                    p.price = amt
                    p.currency = cur or "TRY"
                    break
        if p.price is not None:
            break

    # Image: id="mainImage" VEYA class="imgObj"
    imgs = _collect(
        html,
        tag="img",
        attr="id",
        value="mainImage",
        mode="exact",
        capture="attr:src",
    )
    if not imgs:
        imgs = _collect(
            html,
            tag="img",
            attr="class",
            value="imgObj",
            mode="token",
            capture="attr:src",
        )
    if imgs:
        for src in imgs:
            if src and src.startswith(("http://", "https://")):
                p.image_url = src
                p.image_urls = [src]
                break

    # Brand: URL'den "/X-Marka/" formatina gore cikmak zor; skip — JSON-LD hedefi.

    return p


def parse_shopify(html: str, url: str) -> Optional[ParsedProduct]:
    """
    Shopify (myshopify.com / theme generic):
      - og:type=product genelde var → OG yakalar.
      - Ek: <script id="ProductJson-...">JSON</script> (Shopify theme dunit).
    """
    if not html:
        return None

    # Shopify "ProductJson" blob: <script id="ProductJson-product-handle" type="application/json">
    # HTMLParser ile cek: id'si ProductJson ile baslayan, type=application/json
    scripts = _ProductJsonCollector()
    try:
        scripts.feed(html)
    except Exception:
        pass

    data = None
    for blob in scripts.blocks:
        try:
            obj = json.loads(blob)
            if isinstance(obj, dict) and obj.get("title"):
                data = obj
                break
        except Exception:
            continue

    if data is None:
        # Shopify sinyali yoksa None — caller OG'e duser.
        return None

    p = ParsedProduct(parser_source="shopify", confidence=0.7)
    p.name = str(data.get("title") or "").strip()[:500] or None
    if not p.name:
        return None
    desc = data.get("description")
    if isinstance(desc, str):
        # Description icinde HTML olabilir — kirp.
        desc_clean = re.sub(r"<[^>]+>", " ", desc).strip()
        p.description = desc_clean[:2000] or None

    imgs = data.get("images") or []
    if isinstance(imgs, list):
        imgs_ok = [u for u in imgs if isinstance(u, str) and u.startswith(("http", "//"))]
        # Protocol-relative → https: ekle
        imgs_ok = [("https:" + u if u.startswith("//") else u) for u in imgs_ok][:10]
        if imgs_ok:
            p.image_url = imgs_ok[0]
            p.image_urls = imgs_ok

    # Shopify fiyati genelde cents olarak veriyor (variants[0].price = "1999" = 19.99)
    variants = data.get("variants") or []
    if isinstance(variants, list) and variants:
        v0 = variants[0]
        if isinstance(v0, dict):
            raw = v0.get("price")
            # Theme 2.0 decimal ondaliklu; Theme 1.x cents
            amt = _as_float(raw)
            if amt is not None:
                # Heuristic: >= 1000 ve ondalik yoksa cents kabul et
                if isinstance(raw, (int,)) or (isinstance(raw, str) and raw.isdigit()):
                    amt = amt / 100.0
                p.price = amt

    vendor = data.get("vendor")
    if isinstance(vendor, str) and vendor.strip():
        p.brand = vendor.strip()[:200]

    handle = data.get("handle") or data.get("id")
    if handle:
        p.sku = str(handle)[:100]

    return p


class _ProductJsonCollector(HTMLParser):
    """Shopify: <script id="ProductJson-..." type="application/json">...</script>"""

    def __init__(self) -> None:
        super().__init__()
        self._in = False
        self._buf: list[str] = []
        self.blocks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag.lower() != "script":
            return
        d = {k.lower(): (v or "") for k, v in attrs}
        sid = d.get("id", "").lower()
        stype = d.get("type", "").lower()
        if (
            sid.startswith("productjson")
            and stype in ("application/json", "application/ld+json", "")
        ):
            self._in = True
            self._buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self._in:
            self.blocks.append("".join(self._buf).strip())
            self._in = False
            self._buf = []

    def handle_data(self, data: str) -> None:
        if self._in:
            self._buf.append(data)


def parse_woocommerce(html: str, url: str) -> Optional[ParsedProduct]:
    """
    WooCommerce generic: body class="woocommerce" VEYA meta generator=WordPress/WooCommerce.
      - <h1 class="product_title entry-title"> (name)
      - <p class="price"><span class="woocommerce-Price-amount"> (price)
      - <div class="woocommerce-product-gallery__image"><img> (image)
    """
    if not html:
        return None

    # Sinyal kontrolu — meta generator VEYA body class
    meta = _MetaCollector()
    try:
        meta.feed(html)
    except Exception:
        return None
    generator = (meta.meta.get("generator") or "").lower()
    is_woo = (
        "woocommerce" in generator
        or re.search(r'<body[^>]*class="[^"]*woocommerce', html, re.IGNORECASE)
    )
    if not is_woo:
        return None

    titles = _collect(html, tag="h1", attr="class", value="product_title", mode="token")
    title = titles[0].strip() if titles else ""
    if not title:
        return None

    p = ParsedProduct(parser_source="woocommerce", confidence=0.7)
    p.name = title[:500]

    # Price: <span class="woocommerce-Price-amount"> ilk gelen
    prices = _collect(
        html, tag="span", attr="class", value="woocommerce-Price-amount", mode="token",
    )
    if prices:
        amt, cur = _first_price(prices[0])
        if amt is not None:
            p.price = amt
            if cur:
                p.currency = cur

    # Image: og:image fallback VEYA gallery
    if meta.meta.get("og:image", "").startswith(("http://", "https://")):
        p.image_url = meta.meta["og:image"].strip()
        p.image_urls = [p.image_url]

    # Brand: taxonomy <a rel="tag"> veya skip.

    return p


# ---------------------------------------------------------------------------
# Twitter Card parser (OG'den sonra fallback)
# ---------------------------------------------------------------------------


def parse_twittercard(html: str, url: str) -> Optional[ParsedProduct]:
    """
    Twitter Card (twitter:*) — OpenGraph'in minik kardesi. Amazon/E-commerce
    sayfalar OG product metalarini koymassa Twitter Card yine urun sinyali
    verebilir.
    """
    if not html:
        return None
    c = _MetaCollector()
    try:
        c.feed(html)
    except Exception:
        return None

    tw_title = c.meta.get("twitter:title") or c.meta.get("twitter:text:title")
    tw_image = c.meta.get("twitter:image") or c.meta.get("twitter:image:src")
    tw_desc = c.meta.get("twitter:description")
    # twitter:label1/data1 gibi urun sinyali (Amazon kullanir)
    tw_label1 = (c.meta.get("twitter:label1") or "").lower()
    tw_data1 = c.meta.get("twitter:data1")
    tw_label2 = (c.meta.get("twitter:label2") or "").lower()
    tw_data2 = c.meta.get("twitter:data2")

    if not tw_title:
        return None

    p = ParsedProduct(parser_source="twittercard", confidence=0.4)
    p.name = tw_title.strip()[:500]
    if tw_desc:
        p.description = tw_desc.strip()[:2000]
    if tw_image and tw_image.startswith(("http://", "https://")):
        p.image_url = tw_image.strip()
        p.image_urls = [p.image_url]

    # Amazon "Price" etiketi
    for lab, dat in ((tw_label1, tw_data1), (tw_label2, tw_data2)):
        if "price" in lab and dat:
            amt, cur = _first_price(str(dat))
            if amt is not None:
                p.price = amt
                if cur:
                    p.currency = cur
                break

    return p


# ---------------------------------------------------------------------------
# Priority chain v2 (Faz G)
# ---------------------------------------------------------------------------


SITE_PARSERS: dict[str, Callable[[str, str], Optional[ParsedProduct]]] = {
    "amazon": parse_amazon,
    "trendyol": parse_trendyol,
    "hepsiburada": parse_hepsiburada,
    "n11": parse_n11,
    "shopify": parse_shopify,
    "woocommerce": parse_woocommerce,  # generator'a bakar, host matcher'a degil
}


def _site_parser_for(host: str) -> tuple[str, Callable] | None:
    for m in HOST_MATCHERS:
        if m.matches(host):
            fn = SITE_PARSERS.get(m.parser_name)
            if fn:
                return m.parser_name, fn
    return None


def parse_site_specific(html: str, url: str) -> Optional[ParsedProduct]:
    """
    Host matcher + woocommerce fallback.

    - Host matcher bir parser isaret ediyorsa oncelikle onu dene.
    - Ek olarak woocommerce (generator-tabanli) her zaman denenir — farkli
      host'lar altindaki Woo magazalari da kapsanir.
    """
    host = _host_of(url)
    tried: list[str] = []

    host_match = _site_parser_for(host)
    if host_match is not None:
        name, fn = host_match
        try:
            result = fn(html, url)
            tried.append(name)
            if result and result.name:
                return result
        except Exception as exc:
            logger.debug("site_parser[%s] hata: %s", name, type(exc).__name__)

    # Woocommerce host'a bagli degil — her zaman dene (generator sinyali).
    if "woocommerce" not in tried:
        try:
            result = parse_woocommerce(html, url)
            if result and result.name:
                return result
        except Exception as exc:
            logger.debug("site_parser[woocommerce] hata: %s", type(exc).__name__)

    return None


# Oncelik zinciri v2 — Faz G:
#   jsonld > site_specific > og > twittercard > generic
PARSER_PRIORITY: tuple[
    tuple[str, Callable[[str, str], Optional[ParsedProduct]]], ...
] = (
    ("jsonld", parse_jsonld),
    ("site_specific", parse_site_specific),
    ("opengraph", parse_opengraph),
    ("twittercard", parse_twittercard),
    ("generic", parse_generic),
)


def parse_product_html_v2(html: str, url: str) -> Optional[ParsedProduct]:
    """
    Faz G priority chain.

    - Bir parser exception firlatirsa atlanir (debug log'lar kalir).
    - Ilk is_usable() sonuc dondurulur.
    - Hicbiri usable degilse en yuksek confidence'li "name'i olan" sonuc
      dondurulur — downstream Faz E gate_decision devreye girer.
    """
    if not html or not url:
        return None

    usable: Optional[ParsedProduct] = None
    best_partial: Optional[ParsedProduct] = None

    for name, parser in PARSER_PRIORITY:
        try:
            result = parser(html, url)
        except Exception as exc:
            logger.debug(
                "parse_product_html_v2: %s hata — %s",
                name,
                type(exc).__name__,
            )
            continue
        if result is None:
            continue
        if result.is_usable():
            usable = result
            break
        if result.name:
            # Partial — daha iyi bir partial bulunursa tercih et
            if best_partial is None or result.confidence > best_partial.confidence:
                best_partial = result

    return usable or best_partial
