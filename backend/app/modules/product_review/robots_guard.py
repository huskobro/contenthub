"""
robots.txt respect (Faz G).

Product Review scrape adiminda `product_review.scrape.respect_robots_txt`
ayari True ise, product URL'ine GET yapilmadan once robots.txt kontrolu
uygulanir. False (default) ise bu katman tamamen devre disidir — ama
loglara bilgi dusmeye devam edebilir.

API:
  is_allowed(url, user_agent, *, respect_robots_txt, timeout_s, cache)
    -> True  : fetch yapilabilir
    -> False : robots.txt bu kullanici ajanina blok atti
    (respect_robots_txt=False ise her zaman True.)

Cache: host-bazli lru_cache (LRU 64 host). Test kolayligi icin reset()
helper'i var.

Guardrails:
  - Kendi ici HTTP istegi urllib + timeout.
  - Host down/404 durumunda "allow" (robots.txt olmayan site default izinli).
  - Timeout / parse error durumunda: permissive=False ise "block", True ise "allow".
    Default permissive=True (kriz durumunda scrape'e izin ver — kullanicinin
    ozgur iradesi: respect_robots_txt=True aciksa zaten host scrape'i onayladi
    demektir, permissive duzeni sadece hata durumuna karsi fail-soft'tur).

Not: Python stdlib `urllib.robotparser` kullanilmaz cunku global socket
timeout set etmeye zorluyor; biz inline HTTP fetch + parse yapiyoruz.
"""

from __future__ import annotations

import logging
import socket
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)


_USER_AGENT = "ContentHub/1.0 product_review"
_DEFAULT_TIMEOUT_S = 4
_MAX_ROBOTS_BYTES = 200_000  # 200 KB


@dataclass
class _RobotsRules:
    """User-agent -> list[(rule_kind, path)] map."""

    fetched: bool = False
    error: Optional[str] = None
    ua_rules: dict[str, list[tuple[str, str]]] = field(default_factory=dict)

    def is_allowed(self, ua: str, path: str) -> bool:
        """Basit longest-match; disallow > allow specificity ile karar."""
        ua_low = (ua or "").lower()
        candidates: list[str] = []
        for key in self.ua_rules:
            if key == "*" or key in ua_low:
                candidates.append(key)
        # Daha spesifik UA eslesmesi varsa onu tercih et
        if not candidates:
            return True
        # En uzun UA match'i al ("*" her zaman en kisa — sondur)
        candidates.sort(key=lambda k: (-len(k), k))
        chosen = candidates[0]
        rules = self.ua_rules.get(chosen, [])

        best_allow: Optional[int] = None
        best_disallow: Optional[int] = None
        path = path or "/"
        for kind, rule_path in rules:
            if not rule_path:
                # "Disallow:" bos -> tumu allow, "Allow:" bos -> ignore
                if kind == "disallow":
                    # Bosluk bosken blok yok
                    continue
            if path.startswith(rule_path):
                ln = len(rule_path)
                if kind == "allow":
                    best_allow = ln if best_allow is None else max(best_allow, ln)
                else:
                    best_disallow = ln if best_disallow is None else max(best_disallow, ln)
        if best_disallow is None:
            return True
        if best_allow is None:
            return False
        # Daha uzun (daha spesifik) kural kazanir. Esit olursa allow kazanir.
        return best_allow >= best_disallow


_CACHE: dict[str, _RobotsRules] = {}
_MAX_CACHE = 64


def reset() -> None:
    """Host cache'i temizle (test kolayligi)."""
    _CACHE.clear()


def _fetch_robots(host: str, *, scheme: str, timeout_s: int) -> _RobotsRules:
    """Tek HTTP GET ile robots.txt oku + parse et."""
    url = f"{scheme}://{host}/robots.txt"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": _USER_AGENT,
            "Accept": "text/plain, */*;q=0.1",
        },
    )
    rules = _RobotsRules()
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            status = resp.status if hasattr(resp, "status") else resp.getcode()
            if status == 404:
                # Default: her kullanici icin izinli
                rules.fetched = True
                rules.ua_rules = {"*": []}
                return rules
            if not (200 <= status < 300):
                rules.fetched = False
                rules.error = f"HTTP {status}"
                return rules
            raw = resp.read(_MAX_ROBOTS_BYTES)
            text = raw.decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            rules.fetched = True
            rules.ua_rules = {"*": []}
            return rules
        rules.fetched = False
        rules.error = f"HTTP {exc.code}"
        return rules
    except (urllib.error.URLError, socket.timeout, TimeoutError) as exc:
        rules.fetched = False
        rules.error = f"network: {exc}"
        return rules
    except Exception as exc:  # noqa: BLE001
        rules.fetched = False
        rules.error = f"unexpected: {type(exc).__name__}"
        return rules

    # Parse robots.txt
    current_uas: list[str] = []
    ua_rules: dict[str, list[tuple[str, str]]] = {}
    for raw_line in text.splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if not line:
            continue
        if ":" not in line:
            continue
        field_name, _, value = line.partition(":")
        field_name = field_name.strip().lower()
        value = value.strip()
        if field_name == "user-agent":
            current_uas = [value.lower()]
            ua_rules.setdefault(current_uas[0], [])
        elif field_name in ("disallow", "allow"):
            if not current_uas:
                current_uas = ["*"]
                ua_rules.setdefault("*", [])
            for ua in current_uas:
                ua_rules.setdefault(ua, []).append((field_name, value))
        # Sitemap, Crawl-delay vb. yok sayilir (Faz G scope'unda)

    rules.fetched = True
    rules.ua_rules = ua_rules
    return rules


def _get_rules(host: str, scheme: str, timeout_s: int) -> _RobotsRules:
    cached = _CACHE.get(host)
    if cached is not None:
        return cached
    rules = _fetch_robots(host, scheme=scheme, timeout_s=timeout_s)
    if len(_CACHE) >= _MAX_CACHE:
        # Basit FIFO purge — bircogu zaman productreview scrape'i icin bile fazla
        first_key = next(iter(_CACHE))
        _CACHE.pop(first_key, None)
    _CACHE[host] = rules
    return rules


def is_allowed(
    url: str,
    user_agent: str = _USER_AGENT,
    *,
    respect_robots_txt: bool = False,
    timeout_s: int = _DEFAULT_TIMEOUT_S,
    permissive_on_error: bool = True,
) -> bool:
    """
    URL icin fetch izin kontrolu.

    respect_robots_txt=False => True (kisa devre).
    """
    if not respect_robots_txt:
        return True
    if not url:
        return True
    try:
        parsed = urlparse(url)
    except Exception:
        return permissive_on_error
    scheme = (parsed.scheme or "https").lower()
    host = (parsed.hostname or "").lower()
    if not host:
        return permissive_on_error

    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"

    rules = _get_rules(host, scheme, timeout_s)
    if not rules.fetched:
        # Error: permissive karar
        logger.debug("robots: fetch hata host=%s err=%s", host, rules.error)
        return permissive_on_error
    return rules.is_allowed(user_agent, path)
