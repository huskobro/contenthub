"""
Channel URL utilities — PHASE X.

URL-only kanal create akisi icin:
  - URL normalizasyonu (tracking param temizligi, lowercase host)
  - Platform detect (YouTube first)
  - Kanal kimligi cikarimi (handle / channel_id / legacy user)

Yalnizca standart kutuphaneyle calisir — network yok; network IO
`metadata_fetch.py` icindedir.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

__all__ = [
    "ChannelURLInfo",
    "ChannelURLError",
    "parse_channel_url",
    "normalize_channel_url",
]


class ChannelURLError(ValueError):
    """URL parse / validate hatasi."""


@dataclass(frozen=True)
class ChannelURLInfo:
    """URL'den cikarilan kanal metadata kavramlari."""

    platform: str
    source_url: str
    normalized_url: str
    handle: Optional[str] = None
    external_channel_id: Optional[str] = None
    # orijinal URL'de var olan kanal kimlik formu:
    #   "handle"    -> @someone
    #   "channel"   -> UCxxxxxxxxxxxxxxxxxxxxxx (YouTube channel ID)
    #   "user"      -> /user/xxxx (legacy)
    #   "custom"    -> /c/xxxx (legacy)
    kind: str = "unknown"


# ---------------------------------------------------------------------------
# Tracking parametreleri — normalize sirasinda silinir
# ---------------------------------------------------------------------------

_TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gclid", "fbclid", "mc_cid", "mc_eid", "ref", "ref_src", "ref_url",
    "si", "feature", "pp",  # YouTube'da gorulen iz parametreleri
}


def _strip_tracking(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.query:
        return url
    kept = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=False)
            if k.lower() not in _TRACKING_PARAMS]
    new_query = urlencode(kept)
    return urlunparse(parsed._replace(query=new_query))


def _require_http(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ChannelURLError(f"Gecersiz URL scheme: {parsed.scheme or '(yok)'}")
    if not parsed.netloc:
        raise ChannelURLError("URL host bolumu yok")
    return url


# ---------------------------------------------------------------------------
# YouTube pattern'leri
# ---------------------------------------------------------------------------

_YT_HOSTS = {
    "www.youtube.com", "youtube.com", "m.youtube.com",
    "music.youtube.com", "youtu.be",
}

_RE_YT_HANDLE = re.compile(r"^/@([A-Za-z0-9._-]{3,64})/?$")
_RE_YT_CHANNEL_ID = re.compile(r"^/channel/(UC[A-Za-z0-9_-]{22})/?")
_RE_YT_USER = re.compile(r"^/user/([A-Za-z0-9._-]+)/?")
_RE_YT_CUSTOM = re.compile(r"^/c/([A-Za-z0-9._-]+)/?")


def _detect_youtube(parsed) -> Optional[ChannelURLInfo]:
    host = parsed.netloc.lower()
    if host not in _YT_HOSTS:
        return None
    path = parsed.path or "/"

    m = _RE_YT_HANDLE.match(path)
    if m:
        handle = "@" + m.group(1)
        normalized = f"https://www.youtube.com/{handle}"
        return ChannelURLInfo(
            platform="youtube",
            source_url=urlunparse(parsed),
            normalized_url=normalized,
            handle=handle,
            external_channel_id=None,
            kind="handle",
        )

    m = _RE_YT_CHANNEL_ID.match(path)
    if m:
        channel_id = m.group(1)
        normalized = f"https://www.youtube.com/channel/{channel_id}"
        return ChannelURLInfo(
            platform="youtube",
            source_url=urlunparse(parsed),
            normalized_url=normalized,
            handle=None,
            external_channel_id=channel_id,
            kind="channel",
        )

    m = _RE_YT_USER.match(path)
    if m:
        user = m.group(1)
        normalized = f"https://www.youtube.com/user/{user}"
        return ChannelURLInfo(
            platform="youtube",
            source_url=urlunparse(parsed),
            normalized_url=normalized,
            handle=None,
            external_channel_id=None,
            kind="user",
        )

    m = _RE_YT_CUSTOM.match(path)
    if m:
        custom = m.group(1)
        normalized = f"https://www.youtube.com/c/{custom}"
        return ChannelURLInfo(
            platform="youtube",
            source_url=urlunparse(parsed),
            normalized_url=normalized,
            handle=None,
            external_channel_id=None,
            kind="custom",
        )

    # YouTube hosta isaret ediyor ama kanal URL'i degil
    raise ChannelURLError(
        "YouTube URL'i tespit edildi ancak kanal linki gibi gozukmuyor "
        "(handle / channel / user / c pattern'lerinden biri bekleniyordu)."
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def parse_channel_url(raw: str) -> ChannelURLInfo:
    """URL'yi validate + normalize et ve platform detect uygula.

    Fail-fast:
      - Bos / whitespace -> ChannelURLError
      - http/https olmayan scheme -> ChannelURLError
      - Platform detect edilemezse -> ChannelURLError
    """
    if raw is None:
        raise ChannelURLError("URL None")
    url = raw.strip()
    if not url:
        raise ChannelURLError("URL bos")
    # scheme yoksa https ekle (kullanici 'youtube.com/@x' yapistirirsa)
    if "://" not in url:
        url = "https://" + url.lstrip("/")
    _require_http(url)
    url = _strip_tracking(url)

    parsed = urlparse(url)
    # host lowercase'a normalize (path ayni kalir — YouTube handle case-sensitive)
    parsed = parsed._replace(netloc=parsed.netloc.lower())

    # YouTube
    yt = _detect_youtube(parsed)
    if yt is not None:
        return yt

    # Future: tiktok / instagram / x / linkedin, vb. burada eklenir
    raise ChannelURLError(
        f"Platform tespit edilemedi: {parsed.netloc} "
        "(su an yalnizca YouTube destekleniyor)"
    )


def normalize_channel_url(raw: str) -> str:
    """Sadece normalized URL doner — pratik convenience."""
    return parse_channel_url(raw).normalized_url
