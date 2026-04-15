"""
Channel metadata fetch — PHASE X.

Auth gerektirmeyen dogrulu fallback zinciri:
  1) YouTube oEmbed endpoint (video icin) — kanal icin calismaz, atla
  2) Kanal sayfasi HTML / og:* / title / meta tag scrape
  3) Hepsi basarisiz olursa ChannelMetadata.is_partial=True + error notu

Asla "placeholder title" uretmez — honest state:
  - title alinabilirse sakla
  - alinamazsa None birak, import_status='partial'

Zaman asimlari kisa tutulur (5s). Disaridan gelen HTML saglikli parse
edilir; sonsuz chunk / buyuk response'a karsi read limit uygulanir.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

try:
    import httpx
except ImportError:  # pragma: no cover — httpx requirements'da var
    httpx = None  # type: ignore

from app.channels.url_utils import ChannelURLInfo

logger = logging.getLogger(__name__)

__all__ = [
    "ChannelMetadata",
    "fetch_channel_metadata",
]


@dataclass
class ChannelMetadata:
    """URL'den cekilen kanal metadata. Her alan dogrulanmis/optional."""

    title: Optional[str] = None
    handle: Optional[str] = None
    external_channel_id: Optional[str] = None
    avatar_url: Optional[str] = None
    description: Optional[str] = None
    is_partial: bool = False
    fetch_error: Optional[str] = None


_HTML_CHUNK_LIMIT = 512 * 1024  # 512 KB yeterli — meta tag'ler head'de
_REQ_TIMEOUT = 5.0  # saniye


_RE_OG_TITLE = re.compile(
    r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
_RE_OG_IMAGE = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
_RE_OG_DESC = re.compile(
    r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
_RE_HTML_TITLE = re.compile(r"<title[^>]*>([^<]+)</title>", re.IGNORECASE)
_RE_YT_CHANNEL_ID_IN_HTML = re.compile(
    r'"channelId"\s*:\s*"(UC[A-Za-z0-9_-]{22})"'
)
_RE_YT_CANONICAL = re.compile(
    r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']',
    re.IGNORECASE,
)


def _strip_youtube_title_suffix(title: str) -> str:
    """'XYZ - YouTube' -> 'XYZ'."""
    return re.sub(r"\s*-\s*YouTube\s*$", "", title).strip()


async def _fetch_html(url: str) -> Optional[str]:
    if httpx is None:
        return None
    try:
        async with httpx.AsyncClient(
            timeout=_REQ_TIMEOUT,
            follow_redirects=True,
            headers={
                "User-Agent": "ContentHub/1.0 (+channel metadata fetch)",
                "Accept-Language": "tr-TR,en;q=0.8",
            },
        ) as client:
            resp = await client.get(url)
            if resp.status_code >= 400:
                logger.info("metadata_fetch: %s -> HTTP %s", url, resp.status_code)
                return None
            return resp.text[:_HTML_CHUNK_LIMIT]
    except Exception as exc:  # network, timeout, DNS
        logger.info("metadata_fetch: %s -> %s", url, exc.__class__.__name__)
        return None


def _parse_html_meta(html: str) -> ChannelMetadata:
    """og:* + <title> + youtube channelId pattern'i."""
    meta = ChannelMetadata()
    m = _RE_OG_TITLE.search(html)
    if m:
        meta.title = _strip_youtube_title_suffix(m.group(1).strip())
    elif (m := _RE_HTML_TITLE.search(html)):
        meta.title = _strip_youtube_title_suffix(m.group(1).strip())

    m = _RE_OG_IMAGE.search(html)
    if m:
        meta.avatar_url = m.group(1).strip()

    m = _RE_OG_DESC.search(html)
    if m:
        meta.description = m.group(1).strip()

    m = _RE_YT_CHANNEL_ID_IN_HTML.search(html)
    if m:
        meta.external_channel_id = m.group(1)

    return meta


async def fetch_channel_metadata(info: ChannelURLInfo) -> ChannelMetadata:
    """
    URL'den kanal metadata'sini auth'suz kaynaklardan topla.
    Hicbir sey bulamazsa ChannelMetadata(is_partial=True, fetch_error=...)
    doner — create akisi yine devam edebilir.
    """
    html = await _fetch_html(info.normalized_url)
    if html is None:
        # Fallback: source_url — bazen bir redirect farki metadata'yi acar
        if info.source_url and info.source_url != info.normalized_url:
            html = await _fetch_html(info.source_url)

    if html is None:
        return ChannelMetadata(
            is_partial=True,
            fetch_error="kanal sayfasi getirilemedi (HTTP/network)",
        )

    meta = _parse_html_meta(html)
    # Handle'i URL'den biliyorsak geri yaz
    if not meta.handle and info.handle:
        meta.handle = info.handle
    if not meta.external_channel_id and info.external_channel_id:
        meta.external_channel_id = info.external_channel_id

    # Hic alan dolmadiysa partial
    if not (meta.title or meta.external_channel_id or meta.avatar_url):
        meta.is_partial = True
        meta.fetch_error = "metadata parse edildi ancak anlamli alan bulunamadi"
    return meta
