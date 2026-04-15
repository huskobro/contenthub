"""
Guvenli HTTP fetch — SSRF guard + per-host throttle + byte limit.

product_scrape adiminda kullanilir. Pattern source_scans/scan_engine.py'den
uyarlandi — ayni guardrails set'i, ancak daha buyuk HTML bodisi icin
(urun sayfalari genelde 500KB-2MB arasi).

Guardrails:
  - Scheme zorunlu http/https.
  - Host cozumu: loopback + private + link-local + multicast + reserved
    reddedilir (ipaddress.ip_address + getaddrinfo).
  - Per-host throttle: modul-icine in-memory dict; default 3s.
  - Byte limit: varsayilan 1.5 MB. Ustune cikilirsa TRUNCATED uyarisi + kesme.
  - Timeout: 10s.
  - User-Agent: ContentHub/product_review identifier.

Sync stdlib `urllib.request` kullaniyor — no extra deps. `to_thread.run_sync`
ile async contexten cagrilir.

Dikkat: robots.txt kontrolu ayri bir katman (settings.scrape.respect_robots_txt).
Bu modul sadece ag-seviyesi guvenligi saglar.
"""

from __future__ import annotations

import ipaddress
import logging
import socket
import time
import urllib.request
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

_FETCH_TIMEOUT_SECONDS = 10
_FETCH_MAX_BYTES_DEFAULT = 1_500_000  # 1.5 MB
_PER_HOST_LAST_FETCH: dict[str, float] = {}

# ContentHub UA — siteler bizi tanisin, log'larda anlasilabilir olsun.
_USER_AGENT = (
    "Mozilla/5.0 (compatible; ContentHub/1.0 product_review)"
)


class FetchError(Exception):
    """http_fetch tarafindan firlatilan tum hatalar."""


class SSRFBlocked(FetchError):
    """Host SSRF guard tarafindan reddedildi."""


class ThrottleBlocked(FetchError):
    """Per-host throttle penceresi henuz kapanmadi."""


class FetchTimeoutError(FetchError):
    """Timeout sinirini astik."""


class FetchHTTPError(FetchError):
    """HTTP non-2xx response."""


@dataclass
class FetchResult:
    status: int
    url: str
    final_url: str
    html: str
    bytes_read: int
    truncated: bool
    elapsed_ms: int


def _is_private_host(hostname: str) -> bool:
    """loopback / private / link-local / multicast / reserved reddet."""
    if not hostname:
        return True
    hostname = hostname.strip("[]").lower()
    try:
        ip = ipaddress.ip_address(hostname)
        return (
            ip.is_loopback
            or ip.is_private
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        )
    except ValueError:
        pass

    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return True
    for info in infos:
        raw = info[4][0]
        try:
            ip = ipaddress.ip_address(raw)
        except ValueError:
            continue
        if (
            ip.is_loopback
            or ip.is_private
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            return True
    return False


def _check_throttle(host: str, min_interval_s: float) -> None:
    """Raise ThrottleBlocked if within window; else record timestamp.

    Ilk kez gorulen host her zaman gecer — `time.monotonic()` arbitrary
    reference point'den baslar (macOS/Linux'ta kucuk degerler dondurebilir),
    bu yuzden `last=0.0` ile hesap hatali olurdu.
    """
    if min_interval_s <= 0:
        return
    now = time.monotonic()
    last = _PER_HOST_LAST_FETCH.get(host)
    if last is None:
        # Ilk gorulen host — kayit et ve gec.
        _PER_HOST_LAST_FETCH[host] = now
        return
    elapsed = now - last
    if elapsed < min_interval_s:
        raise ThrottleBlocked(
            f"host={host} throttled: {elapsed:.1f}s < {min_interval_s:.1f}s min interval"
        )
    _PER_HOST_LAST_FETCH[host] = now


def reset_throttle_cache() -> None:
    """Test kolayligi icin per-host throttle cache'ini temizle."""
    _PER_HOST_LAST_FETCH.clear()


def fetch_html(
    url: str,
    *,
    max_bytes: int = _FETCH_MAX_BYTES_DEFAULT,
    timeout_s: int = _FETCH_TIMEOUT_SECONDS,
    min_interval_s: float = 3.0,
) -> FetchResult:
    """
    Guvenli HTTP GET. HTML text'ini + metadata dondurur.

    Raises:
      FetchError      — URL parse hatasi, scheme destegi yok, vb.
      SSRFBlocked     — Host private/loopback.
      ThrottleBlocked — Per-host min interval asilmadi.
      FetchTimeoutError — Zaman asimi.
      FetchHTTPError  — Non-2xx status.
    """
    if not url or not isinstance(url, str):
        raise FetchError("url gecersiz (bos)")

    parsed = urlparse(url.strip())
    if parsed.scheme.lower() not in ("http", "https"):
        raise FetchError(f"sadece http/https destekleniyor: {parsed.scheme!r}")

    host = (parsed.hostname or "").lower()
    if not host:
        raise FetchError("host yok")

    if _is_private_host(host):
        raise SSRFBlocked(f"host reddedildi (SSRF guard): {host}")

    _check_throttle(host, min_interval_s)

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": _USER_AGENT,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
            "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.5",
        },
    )

    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            status = resp.status if hasattr(resp, "status") else resp.getcode()
            final_url = resp.geturl()
            # final_url da SSRF check'den gecsin (redirect attack)
            final_parsed = urlparse(final_url)
            final_host = (final_parsed.hostname or "").lower()
            if final_host and final_host != host and _is_private_host(final_host):
                raise SSRFBlocked(
                    f"redirect sonrasi host reddedildi: {final_host}"
                )

            raw = resp.read(max_bytes + 1)
            bytes_read = len(raw)
            truncated = bytes_read > max_bytes
            if truncated:
                raw = raw[:max_bytes]

            # Encoding: Content-Type charset → fallback utf-8
            content_type = resp.headers.get("Content-Type", "")
            encoding = "utf-8"
            if "charset=" in content_type.lower():
                try:
                    encoding = content_type.lower().split("charset=")[1].split(";")[0].strip() or "utf-8"
                except Exception:
                    encoding = "utf-8"
            try:
                html = raw.decode(encoding, errors="replace")
            except LookupError:
                html = raw.decode("utf-8", errors="replace")
    except TimeoutError as exc:  # py3.10+: socket.timeout is alias
        raise FetchTimeoutError(f"timeout: {exc}")
    except socket.timeout as exc:
        raise FetchTimeoutError(f"timeout: {exc}")
    except urllib.error.HTTPError as exc:
        raise FetchHTTPError(f"HTTP {exc.code}: {exc.reason}")
    except urllib.error.URLError as exc:
        raise FetchError(f"network error: {exc.reason}")
    except SSRFBlocked:
        raise
    except Exception as exc:
        raise FetchError(f"unexpected: {type(exc).__name__}: {exc}")

    elapsed_ms = int((time.monotonic() - started) * 1000)

    if not (200 <= status < 300):
        raise FetchHTTPError(f"HTTP {status}")

    return FetchResult(
        status=status,
        url=url,
        final_url=final_url,
        html=html,
        bytes_read=bytes_read if not truncated else max_bytes,
        truncated=truncated,
        elapsed_ms=elapsed_ms,
    )
