"""
URL normalization + canonical url computation (Faz B).

Sorumluluklar:
  - normalize_url(url): beyaz bosluklari kirp, https:// olmayanlari reddet.
  - canonicalize_url(url): affiliate + tracking parametrelerini temizle,
    scheme + host + path + filtrelenmis query'yi doner. Ayni urunun
    iki farkli affiliate link'inden UNIQUE canonical_url uretir.
  - is_http_url(url): true ise http/https scheme'i var.

Temizlenen parametreler:
  - utm_*, gclid, fbclid, mc_cid, mc_eid, msclkid, yclid
  - ref, ref_, tag, ascsubtag, linkCode, linkId (Amazon)
  - trackingId, spm (Trendyol/Hepsiburada)
  - share (sosyal paylasim)
Korunan parametreler:
  - id, sku, pid, productId, urun (site-specific urun id'leri)
  - variant (urun varyanti)
  - size, color, renk, beden (urun ozellikleri)
"""

from __future__ import annotations

from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


# Affiliate + tracking parametreleri — canonical_url icinden atilir.
# Lowercase saklariz; canonicalize_url karsilastirmada key_lower kullanir.
_STRIP_QUERY_KEYS = frozenset(
    {
        # utm
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "utm_id", "utm_name", "utm_reader", "utm_viz_id", "utm_pubreferrer",
        "utm_swu", "utm_social", "utm_social-type",
        # paid click
        "gclid", "fbclid", "msclkid", "yclid", "mc_cid", "mc_eid",
        "_ga", "mkt_tok", "dclid", "twclid",
        # amazon + affiliate
        "tag", "ref", "ref_", "linkcode", "linkid", "ascsubtag",
        "creative", "creativeasin", "camp", "keywords",
        "th", "psc",
        # trendyol / hepsiburada / n11 / generic
        "trackingid", "spm", "sellerid", "boutiqueid",
        "wi", "wm", "merchantid",
        # social share
        "share", "shared", "fb_action_ids", "fb_source", "action_object_map",
        "action_type_map", "source", "src",
    }
)


# Korunmasi gereken urun kimlik parametreleri — asla strip edilmez.
# Lowercase saklariz.
_KEEP_QUERY_KEYS = frozenset(
    {
        "id", "sku", "pid", "productid", "urun", "itemid", "asin",
        "variant", "size", "color", "renk", "beden",
    }
)


def is_http_url(url: str) -> bool:
    """http / https scheme kontrolu (case-insensitive)."""
    if not url:
        return False
    s = url.strip().lower()
    return s.startswith("http://") or s.startswith("https://")


def normalize_url(url: str) -> str:
    """
    Beyaz bosluklari kirpar; scheme yoksa veya http(s) degilse ValueError.
    Scheme'yi lowercase yapar, host'u lowercase yapar.
    Fragment (#...) kaldirilir — canonical baglamda urun icin anlamsiz.
    """
    if not url or not url.strip():
        raise ValueError("url bos olamaz")
    s = url.strip()
    parsed = urlparse(s)
    if parsed.scheme.lower() not in ("http", "https"):
        raise ValueError(f"sadece http/https destekleniyor (gelen: {parsed.scheme!r})")
    if not parsed.netloc:
        raise ValueError("url host icermiyor")
    return urlunparse(
        (
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path or "/",
            parsed.params,
            parsed.query,
            "",  # fragment atilir
        )
    )


def canonicalize_url(url: str) -> str:
    """
    Affiliate + tracking parametrelerini temizleyerek canonical URL uretir.

    Strateji:
      1. normalize_url ile scheme/host lowercase, fragment kaldirildi.
      2. Query parse edilir; _STRIP_QUERY_KEYS icindekiler atilir.
         _KEEP_QUERY_KEYS icindekiler her zaman korunur.
      3. Kalan parametreler alfabetik siralanir — deterministic.

    Ornek:
      https://www.amazon.com.tr/dp/B08XL2KZ?tag=aff-123&ref=srXYZ&th=1
        → https://www.amazon.com.tr/dp/B08XL2KZ
      https://www.trendyol.com/apple/iphone-15-p-123?boutiqueId=59&merchantId=9
        → https://www.trendyol.com/apple/iphone-15-p-123

    Raises:
      ValueError: url gecersiz (http(s) disi, bos, host yok).
    """
    normalized = normalize_url(url)
    parsed = urlparse(normalized)
    kept_pairs = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=False):
        key_lower = key.lower()
        # Oncelik: _KEEP_QUERY_KEYS (strip kurallarina ragmen korunur)
        if key_lower in _KEEP_QUERY_KEYS:
            kept_pairs.append((key, value))
            continue
        # Ardindan tracking/affiliate elemesi
        if key_lower in _STRIP_QUERY_KEYS:
            continue
        # Varsayilan: tut (site-specific unknown parametreler)
        kept_pairs.append((key, value))
    # Deterministic sira icin sort
    kept_pairs.sort()
    new_query = urlencode(kept_pairs, doseq=False)
    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            new_query,
            "",
        )
    )


def extract_host(url: str) -> Optional[str]:
    """URL'den host cikarir (lowercase). Port cikarilir."""
    if not url:
        return None
    try:
        parsed = urlparse(url.strip())
    except Exception:
        return None
    host = (parsed.hostname or "").lower()
    return host or None
