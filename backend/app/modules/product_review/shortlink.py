"""
Shortlink expansion (Faz G).

Amazon (`a.co/...`, `amzn.to/...`), Trendyol (`ty.gl/...`), ve generic
HTTP 30x redirect zincirlerini cozer. Canonical URL uretmeden once
affiliate/tracking katmanini soyarken dogru final URL'yi elde etmeye
yarar.

Rules:
  - HEAD istegi + max 5 hop takip.
  - SSRF guard: her hop oncesi host private/loopback degilse izin.
  - Timeout: 6s (product_scrape toplami < 10s kalsin).
  - Per-host throttle: 1s (yalnizca shortlink cozumu icin — ayri counter
    yok, http_fetch modulu kullanilir).
  - Donus: (final_url, hops) — expand etmeye gerek yoksa input'un kendisi.
  - Hata durumunda caller'a exception bubble olur (StepExecutionError
    retryable=True olarak sarilabilir).

IMPORTANT: fetch_html sync oldugundan `asyncio.to_thread` ile cagirilmalidir.
"""

from __future__ import annotations

import ipaddress
import logging
import socket
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)


# Amazon shortlink hosts (a.co affiliate shortner, amzn.to legacy)
AMAZON_SHORT_HOSTS = {
    "a.co", "www.a.co",
    "amzn.to", "amzn.asia", "amzn.eu", "amzn.com",
}

# Trendyol shortlink
TRENDYOL_SHORT_HOSTS = {"ty.gl", "www.ty.gl"}

# Hepsiburada + N11 shortlink (nadir ama destekliyelim)
OTHER_SHORT_HOSTS = {"hb.com.tr", "www.hb.com.tr"}

SHORT_HOSTS = AMAZON_SHORT_HOSTS | TRENDYOL_SHORT_HOSTS | OTHER_SHORT_HOSTS


_DEFAULT_MAX_HOPS = 5
_DEFAULT_TIMEOUT_S = 6

_USER_AGENT = "Mozilla/5.0 (compatible; ContentHub/1.0 product_review)"


class ShortlinkError(Exception):
    """Shortlink cozumunde hata."""


class ShortlinkSSRFBlocked(ShortlinkError):
    """Hop'lardan biri SSRF guard tarafindan reddedildi."""


class ShortlinkTooManyHops(ShortlinkError):
    """Max hop sayisina ulasildi; dongu/zincir bozuk."""


@dataclass
class ShortlinkResult:
    final_url: str
    hops: list[str]
    shortlink_detected: bool


def is_shortlink(url: str) -> bool:
    """Host shortlink listesinde mi?"""
    if not url:
        return False
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return False
    return host in SHORT_HOSTS


def _is_private_host(hostname: str) -> bool:
    """http_fetch modulu ile ayni mantik — private/loopback/link-local red."""
    if not hostname:
        return True
    hostname = hostname.strip("[]").lower()
    try:
        ip = ipaddress.ip_address(hostname)
        return (
            ip.is_loopback or ip.is_private or ip.is_link_local
            or ip.is_multicast or ip.is_reserved or ip.is_unspecified
        )
    except ValueError:
        pass
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return True
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            continue
        if (
            ip.is_loopback or ip.is_private or ip.is_link_local
            or ip.is_multicast or ip.is_reserved or ip.is_unspecified
        ):
            return True
    return False


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Manuel hop takibi icin redirect'leri otomatik uygulama."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # urllib default davranisini bloklariz; manuel hop'la ilerleyecegiz.
        return None


def _head_one(url: str, *, timeout_s: int) -> tuple[Optional[int], Optional[str]]:
    """Tek HEAD istegi. Return (status, location_or_None)."""
    req = urllib.request.Request(
        url,
        method="HEAD",
        headers={
            "User-Agent": _USER_AGENT,
            "Accept": "*/*",
            "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.5",
        },
    )
    opener = urllib.request.build_opener(_NoRedirect())
    try:
        with opener.open(req, timeout=timeout_s) as resp:
            # urllib HEAD + non-redirect -> direkt response
            status = resp.status if hasattr(resp, "status") else resp.getcode()
            # 2xx ise location yok
            return status, None
    except urllib.error.HTTPError as exc:
        # 301/302/303/307/308 → HTTPError yakalanir (no-redirect handler)
        if exc.code in (301, 302, 303, 307, 308):
            location = exc.headers.get("Location") or exc.headers.get("location")
            return exc.code, location
        return exc.code, None
    except (urllib.error.URLError, socket.timeout, TimeoutError) as exc:
        raise ShortlinkError(f"HEAD hata: {exc}")


def _get_one_for_redirect(url: str, *, timeout_s: int) -> tuple[Optional[int], Optional[str]]:
    """
    HEAD bazi siteler tarafindan 403/405 ile reddedilir (Amazon sik sik).
    Fallback: byte okumadan GET baslat + Connection'i hemen kapat.
    """
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": _USER_AGENT,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
            "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.5",
        },
    )
    opener = urllib.request.build_opener(_NoRedirect())
    try:
        with opener.open(req, timeout=timeout_s) as resp:
            status = resp.status if hasattr(resp, "status") else resp.getcode()
            # 2xx ise fetch tamam — location yok
            return status, None
    except urllib.error.HTTPError as exc:
        if exc.code in (301, 302, 303, 307, 308):
            location = exc.headers.get("Location") or exc.headers.get("location")
            return exc.code, location
        return exc.code, None
    except (urllib.error.URLError, socket.timeout, TimeoutError) as exc:
        raise ShortlinkError(f"GET hata: {exc}")


def expand_shortlink(
    url: str,
    *,
    max_hops: int = _DEFAULT_MAX_HOPS,
    timeout_s: int = _DEFAULT_TIMEOUT_S,
) -> ShortlinkResult:
    """
    Shortlink veya regular URL -> final URL.

    - is_shortlink(url)=False ise direkt geri doner (hops=[url], detected=False).
    - True ise HEAD (sonra GET fallback) ile redirect zinciri takip edilir.
    - SSRF + max_hops + timeout guardrail'leri.
    """
    if not url:
        raise ShortlinkError("url bos")

    current = url.strip()
    hops: list[str] = [current]
    detected = is_shortlink(current)

    if not detected:
        return ShortlinkResult(final_url=current, hops=hops, shortlink_detected=False)

    for _ in range(max_hops):
        host = (urlparse(current).hostname or "").lower()
        if not host:
            raise ShortlinkError(f"host yok: {current}")
        if _is_private_host(host):
            raise ShortlinkSSRFBlocked(f"hop host reddedildi: {host}")

        # Once HEAD
        try:
            status, location = _head_one(current, timeout_s=timeout_s)
        except ShortlinkError:
            # HEAD basarisiz → GET fallback
            status, location = _get_one_for_redirect(current, timeout_s=timeout_s)

        # 405 Method Not Allowed → GET fallback
        if status == 405 or (status and 400 <= status < 500 and not location):
            status, location = _get_one_for_redirect(current, timeout_s=timeout_s)

        if not location:
            # Redirect yok — final URL
            return ShortlinkResult(
                final_url=current, hops=hops, shortlink_detected=detected,
            )

        next_url = urljoin(current, location.strip())
        if next_url == current:
            # Kendi kendine donen redirect — cikis
            return ShortlinkResult(
                final_url=current, hops=hops, shortlink_detected=detected,
            )
        hops.append(next_url)
        current = next_url

    raise ShortlinkTooManyHops(
        f"max_hops={max_hops} asildi; son hop={current}"
    )
