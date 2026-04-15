"""
Parser chain — HTML'den urun bilgilerini cikarir (Faz B).

Strateji (sirasiyla — ilk basarili donus kullanilir):

  1. JSON-LD Product schema  — en yuksek confidence (0.9+)
     https://schema.org/Product  — name, image, offers.price, offers.priceCurrency,
     offers.availability, aggregateRating.ratingValue / ratingCount, brand, sku.

  2. OpenGraph product.*      — orta confidence (0.6)
     og:title, og:image, og:description, product:price:amount,
     product:price:currency, product:availability.

  3. Generic fallback         — dusuk confidence (0.3)
     <title>, <meta description>, <h1>, ilk <img>, <meta price>.

Her parser:
  - parse(html: str, url: str) -> Optional[ParsedProduct]
  - Hata firlat MAZ; veri yetersizse None doner.
  - Confidence degeri ile birlikte kaynak etiketi (parser_source) doner.

Site-specific parserlar (Faz G) bu chain'in BASINA eklenecek — arayuz ayni
kalacagi icin uretim sirasi degisiklige dayaniklidir.

NOT: HTML parsing stdlib `html.parser` ile yapilir. BeautifulSoup, lxml, vs.
ek bagimlilik eklemez — parser chain localhost-first kuralina uyar.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class ParsedProduct:
    """Parser chain ciktisi — normalize edilmis urun verisi."""

    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: list[str] = field(default_factory=list)

    # Fiyat
    price: Optional[float] = None
    currency: Optional[str] = None
    availability: Optional[str] = None  # "in_stock" | "out_of_stock" | "preorder" | None

    # Rating
    rating_value: Optional[float] = None
    rating_count: Optional[int] = None

    # Kimlik
    brand: Optional[str] = None
    sku: Optional[str] = None

    # Meta
    parser_source: str = "unknown"  # "jsonld" | "opengraph" | "generic"
    confidence: float = 0.0

    def is_usable(self, min_fields: int = 2) -> bool:
        """En az N alan dolu mu? Kritik: name + (price VEYA image)."""
        if not self.name:
            return False
        filled = sum(
            1
            for v in (self.price, self.image_url, self.description, self.brand)
            if v is not None and v != ""
        )
        return filled >= min_fields


# ---------------------------------------------------------------------------
# JSON-LD parser (en yuksek oncelik)
# ---------------------------------------------------------------------------


class _JsonLdCollector(HTMLParser):
    """<script type="application/ld+json"> bloklarini toplar."""

    def __init__(self) -> None:
        super().__init__()
        self._in_ld = False
        self._buf: list[str] = []
        self.blocks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag.lower() != "script":
            return
        d = {k.lower(): (v or "").lower() for k, v in attrs}
        if d.get("type") == "application/ld+json":
            self._in_ld = True
            self._buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self._in_ld:
            self.blocks.append("".join(self._buf).strip())
            self._in_ld = False
            self._buf = []

    def handle_data(self, data: str) -> None:
        if self._in_ld:
            self._buf.append(data)


def _walk_json(obj: object):
    """Iteratif: dict + list icindeki tum dict node'lari yield eder."""
    stack: list[object] = [obj]
    while stack:
        cur = stack.pop()
        if isinstance(cur, dict):
            yield cur
            stack.extend(cur.values())
        elif isinstance(cur, list):
            stack.extend(cur)


def _as_float(x: object) -> Optional[float]:
    if x is None:
        return None
    try:
        if isinstance(x, bool):
            return None
        if isinstance(x, (int, float)):
            return float(x)
        s = str(x).strip().replace(",", ".")
        # "1.299,90" gibi tr format — "1.299.90" olur; son . decimal say
        if s.count(".") > 1:
            parts = s.split(".")
            s = "".join(parts[:-1]) + "." + parts[-1]
        return float(s)
    except (TypeError, ValueError):
        return None


def _as_int(x: object) -> Optional[int]:
    f = _as_float(x)
    if f is None:
        return None
    return int(f)


def _normalize_availability(raw: object) -> Optional[str]:
    if raw is None:
        return None
    s = str(raw).lower()
    if "instock" in s or "in_stock" in s or "available" in s:
        return "in_stock"
    if "outofstock" in s or "out_of_stock" in s or "soldout" in s or "sold_out" in s:
        return "out_of_stock"
    if "preorder" in s or "pre_order" in s:
        return "preorder"
    if "discontinued" in s:
        return "discontinued"
    return None


def _extract_offer(node: dict) -> tuple[Optional[float], Optional[str], Optional[str]]:
    """Offer node'undan (price, currency, availability) cikartir."""
    price = _as_float(node.get("price") or node.get("lowPrice") or node.get("highPrice"))
    currency = node.get("priceCurrency") or node.get("currency")
    if currency:
        currency = str(currency).strip().upper()[:8]
    avail = _normalize_availability(node.get("availability"))
    return price, currency, avail


def parse_jsonld(html: str, _url: str) -> Optional[ParsedProduct]:
    """<script type='application/ld+json'> bloklarinda Product schema ara."""
    if not html or "ld+json" not in html:
        return None

    collector = _JsonLdCollector()
    try:
        collector.feed(html)
    except Exception as exc:
        logger.debug("parse_jsonld: HTML feed hatasi — %s", type(exc).__name__)
        return None

    for raw in collector.blocks:
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except Exception:
            # Bazi siteler birden fazla JSON'i '\n\n' ile yazar — son care
            try:
                data = json.loads(raw.replace("\n", " "))
            except Exception:
                continue

        for node in _walk_json(data):
            t = node.get("@type")
            # @type "Product" veya ["Product", "Offer"] olabilir
            types = t if isinstance(t, list) else [t]
            if not any(isinstance(x, str) and x.lower() == "product" for x in types):
                continue

            p = ParsedProduct(parser_source="jsonld", confidence=0.9)
            name = node.get("name")
            if isinstance(name, str):
                p.name = name.strip()[:500] or None
            desc = node.get("description")
            if isinstance(desc, str):
                p.description = desc.strip()[:2000] or None

            # Image: str | list | dict (ImageObject.url)
            img = node.get("image")
            images: list[str] = []
            if isinstance(img, str):
                images = [img]
            elif isinstance(img, list):
                for it in img:
                    if isinstance(it, str):
                        images.append(it)
                    elif isinstance(it, dict) and isinstance(it.get("url"), str):
                        images.append(it["url"])
            elif isinstance(img, dict) and isinstance(img.get("url"), str):
                images = [img["url"]]
            images = [i.strip() for i in images if i and i.strip().startswith(("http://", "https://"))][:10]
            if images:
                p.image_url = images[0]
                p.image_urls = images

            # Brand: str | dict (.name)
            brand = node.get("brand")
            if isinstance(brand, str):
                p.brand = brand.strip()[:200] or None
            elif isinstance(brand, dict) and isinstance(brand.get("name"), str):
                p.brand = brand["name"].strip()[:200] or None

            # SKU
            sku = node.get("sku") or node.get("mpn") or node.get("gtin")
            if sku is not None:
                p.sku = str(sku).strip()[:100] or None

            # Offers
            offers = node.get("offers")
            if isinstance(offers, dict):
                price, currency, avail = _extract_offer(offers)
                p.price, p.currency, p.availability = price, currency, avail
            elif isinstance(offers, list) and offers:
                # Ilk valid offer'i al
                for off in offers:
                    if isinstance(off, dict):
                        price, currency, avail = _extract_offer(off)
                        if price is not None:
                            p.price, p.currency, p.availability = price, currency, avail
                            break

            # aggregateRating
            rating = node.get("aggregateRating")
            if isinstance(rating, dict):
                p.rating_value = _as_float(rating.get("ratingValue"))
                p.rating_count = _as_int(
                    rating.get("ratingCount") or rating.get("reviewCount")
                )

            if p.name:
                return p

    return None


# ---------------------------------------------------------------------------
# OpenGraph parser (orta oncelik)
# ---------------------------------------------------------------------------


class _MetaCollector(HTMLParser):
    """<meta> tag'lerini topla + <title>, <h1>, ilk <img> yakala."""

    def __init__(self) -> None:
        super().__init__()
        self.meta: dict[str, str] = {}
        self.title: Optional[str] = None
        self.h1: Optional[str] = None
        self.first_img: Optional[str] = None
        self._in_title = False
        self._title_buf: list[str] = []
        self._in_h1 = False
        self._h1_buf: list[str] = []

    def handle_starttag(self, tag: str, attrs: list) -> None:
        t = tag.lower()
        d = {k.lower(): (v or "") for k, v in attrs}
        if t == "meta":
            key = d.get("property") or d.get("name")
            content = d.get("content")
            if key and content and key.lower() not in self.meta:
                self.meta[key.lower()] = content.strip()
        elif t == "title":
            self._in_title = True
            self._title_buf = []
        elif t == "h1" and self.h1 is None:
            self._in_h1 = True
            self._h1_buf = []
        elif t == "img" and self.first_img is None:
            src = d.get("src") or d.get("data-src")
            if src and src.startswith(("http://", "https://")):
                self.first_img = src.strip()

    def handle_endtag(self, tag: str) -> None:
        t = tag.lower()
        if t == "title" and self._in_title:
            self.title = "".join(self._title_buf).strip() or None
            self._in_title = False
        elif t == "h1" and self._in_h1:
            self.h1 = "".join(self._h1_buf).strip() or None
            self._in_h1 = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_buf.append(data)
        elif self._in_h1:
            self._h1_buf.append(data)


def parse_opengraph(html: str, _url: str) -> Optional[ParsedProduct]:
    """og:* + product:* meta'lardan urun verisi cikar."""
    if not html:
        return None
    c = _MetaCollector()
    try:
        c.feed(html)
    except Exception:
        return None

    og_type = (c.meta.get("og:type") or "").lower()
    og_title = c.meta.get("og:title")
    og_image = c.meta.get("og:image") or c.meta.get("twitter:image")
    og_desc = c.meta.get("og:description") or c.meta.get("description")

    # OG product sinyali: og:type=product VEYA product:price:amount var.
    is_product = og_type in ("product", "product.item", "og:product") or any(
        k in c.meta for k in ("product:price:amount", "product:price", "og:price:amount")
    )

    if not is_product and not og_title:
        return None

    p = ParsedProduct(parser_source="opengraph", confidence=0.6 if is_product else 0.45)

    if og_title:
        p.name = og_title.strip()[:500]
    if og_desc:
        p.description = og_desc.strip()[:2000]
    if og_image and og_image.startswith(("http://", "https://")):
        p.image_url = og_image.strip()
        p.image_urls = [p.image_url]

    # Fiyat
    price_raw = (
        c.meta.get("product:price:amount")
        or c.meta.get("og:price:amount")
        or c.meta.get("product:price")
    )
    currency_raw = (
        c.meta.get("product:price:currency")
        or c.meta.get("og:price:currency")
    )
    if price_raw:
        p.price = _as_float(price_raw)
    if currency_raw:
        p.currency = str(currency_raw).strip().upper()[:8]

    avail_raw = c.meta.get("product:availability") or c.meta.get("og:availability")
    p.availability = _normalize_availability(avail_raw)

    brand = c.meta.get("product:brand") or c.meta.get("og:brand")
    if brand:
        p.brand = brand.strip()[:200]

    if p.name:
        return p
    return None


# ---------------------------------------------------------------------------
# Generic fallback parser (dusuk oncelik)
# ---------------------------------------------------------------------------


# Basit fiyat regex — TR ve EN formatlarini yakalar. Final sayimlamaz, sinyaldir.
_PRICE_REGEX = re.compile(
    r"""
    (?:TL|TRY|USD|EUR|GBP|\$|£|€|₺)\s*
    (\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)
    |
    (\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*
    (?:TL|TRY|USD|EUR|GBP|\$|£|€|₺)
    """,
    re.VERBOSE | re.IGNORECASE,
)

_CURRENCY_MAP = {
    "TL": "TRY", "TRY": "TRY", "₺": "TRY",
    "USD": "USD", "$": "USD",
    "EUR": "EUR", "€": "EUR",
    "GBP": "GBP", "£": "GBP",
}


def parse_generic(html: str, _url: str) -> Optional[ParsedProduct]:
    """Son care parser — title + h1 + ilk img + regex ile fiyat tahmini."""
    if not html:
        return None
    c = _MetaCollector()
    try:
        c.feed(html)
    except Exception:
        return None

    name = c.h1 or c.title
    if not name:
        return None

    p = ParsedProduct(parser_source="generic", confidence=0.3)
    p.name = name.strip()[:500]
    desc = c.meta.get("description")
    if desc:
        p.description = desc.strip()[:2000]
    if c.first_img:
        p.image_url = c.first_img
        p.image_urls = [c.first_img]

    # Regex ile fiyat ara — ilk eslesme
    match = _PRICE_REGEX.search(html)
    if match:
        raw_amount = match.group(1) or match.group(2)
        p.price = _as_float(raw_amount)
        # Currency eslesmesi — match metninde hangi sembol varsa
        text = match.group(0).upper()
        for key, val in _CURRENCY_MAP.items():
            if key.upper() in text:
                p.currency = val
                break

    return p


# ---------------------------------------------------------------------------
# Parser chain — ana giris noktasi
# ---------------------------------------------------------------------------


def parse_product_html(html: str, url: str) -> Optional[ParsedProduct]:
    """
    Parser chain'i sirasiyla calistir — ilk "usable" sonuc dondur.

    Sira:
      1. JSON-LD (confidence 0.9)
      2. OpenGraph (confidence 0.45–0.6)
      3. Generic fallback (confidence 0.3)

    Sonuc is_usable() degilse bir sonraki parser'a gecer. Hepsi bos donerse
    None. Caller `scrape_confidence_min` esiginin altindaysa job'u hata ile
    bitirmelidir (deterministic gate).
    """
    if not html or not url:
        return None

    for parser in (parse_jsonld, parse_opengraph, parse_generic):
        try:
            result = parser(html, url)
        except Exception as exc:
            logger.debug(
                "parse_product_html: %s basarisiz — %s",
                parser.__name__,
                type(exc).__name__,
            )
            continue
        if result is not None and result.is_usable():
            return result
        # Usable degil ama name varsa yine de adayi tut — sonraki parser
        # daha iyi bulamazsa bu donusur.

    # Son care: usable olmayan jsonld varsa onu yine kullan (name+confidence)
    for parser in (parse_jsonld, parse_opengraph, parse_generic):
        try:
            result = parser(html, url)
        except Exception:
            continue
        if result is not None and result.name:
            return result

    return None
