"""
Kaynak Tarama Motoru — M5-C1 (hard dedupe), M5-C2 (soft dedupe + follow-up exception)

RSS kaynaklarını feedparser ile gerçek zamanlı çeker, normalize eder ve
NewsItem kayıtları olarak veritabanına yazar.

Durum semantiği (değişmez):
  SourceScan.status  : 'queued' → 'running' → 'completed' | 'failed'
  NewsItem.status    : her zaman 'new' olarak başlar — tarama motoru asla
                       'used', 'reviewed', 'ignored' veya 'deduped' ataması yapmaz.
                       Bu geçişler ayrı iş akışlarına aittir.

Dedupe katmanları:
  Hard dedupe (M5-C1):
    URL tam eşleşmesi (strip+lowercase).
    allow_followup ile atlanamaz — her zaman çalışır.

  Soft dedupe (M5-C2):
    Başlık benzerliği (Jaccard token örtüşmesi ≥ SOFT_DEDUPE_THRESHOLD).
    allow_followup=True ile atlanabilir (follow-up exception).
    "deduped" kararı yalnızca yanıt içindeki dedupe_details'ta yaşar — DB'de saklanmaz.

Follow-up exception:
  allow_followup=True → soft dedupe atlanır; hard dedupe korunur.
  Bu, önceki taramada görülmüş benzer başlıklı haberlerin takibini mümkün kılar.

UsedNewsRegistry sınırı:
  Bu modül UsedNewsRegistry'yi import etmez, okumaz veya yazmaz.
  "used" kararı editorial / bulletin akışının konusudur.

Kapsam:
  Yalnızca source_type='rss' desteklenir.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsSource, NewsItem, SourceScan
from app.source_scans.dedupe_service import (
    build_dedupe_context,
    evaluate_entry,
    DedupeDecision,
)
from app.automation.event_hooks import emit_operation_event

try:
    import feedparser  # type: ignore
    _FEEDPARSER_AVAILABLE = True
except ImportError:
    feedparser = None  # type: ignore
    _FEEDPARSER_AVAILABLE = False

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Normalizasyon yardımcıları
# ---------------------------------------------------------------------------

def _safe_str(value: object, max_length: int = 0) -> Optional[str]:
    """
    Nesneyi güvenli biçimde string'e dönüştürür.
    max_length > 0 ise kırpar.
    """
    if value is None:
        return None
    text = str(value).strip() or None
    if text and max_length > 0:
        return text[:max_length]
    return text


def _parse_published_at(entry: object) -> Optional[datetime]:
    """
    feedparser entry'sinden yayın tarihini çıkarır.
    published_parsed veya updated_parsed alanlarına bakar.
    Geçersiz veya eksik ise None döner.
    """
    for attr in ("published_parsed", "updated_parsed"):
        value = getattr(entry, attr, None)
        if value is not None:
            try:
                import calendar
                ts = calendar.timegm(value)
                return datetime.fromtimestamp(ts, tz=timezone.utc)
            except Exception:
                continue
    return None


def _build_dedupe_key(url: str) -> str:
    """
    Hard dedupe anahtarı: URL'nin küçük harfli, boşluksuz hali.
    """
    return url.strip().lower()


def _extract_image_url(entry: object) -> Optional[str]:
    """
    M41: feedparser entry'sinden haber görseli URL'si çıkarır.

    Öncelik sırası:
      1. media_content[0].url (RSS media:content)
      2. media_thumbnail[0].url (RSS media:thumbnail)
      3. enclosures[0].href (RSS enclosure, image type)
      4. image.href (atom:image)

    Hiçbiri yoksa None döner.
    """
    urls = _extract_image_urls(entry)
    return urls[0] if urls else None


def _extract_image_urls(entry: object, max_count: int = 5) -> list:
    """
    M41a: feedparser entry'sinden birden fazla haber görseli URL'si çıkarır.

    Tüm kaynakları tarar, benzersiz URL'leri toplar, max_count ile sınırlar.

    Öncelik sırası:
      1. media_content (tüm elemanlar)
      2. media_thumbnail (tüm elemanlar)
      3. enclosures (image/* type olanlar)
      4. image.href (atom:image)

    Returns:
        Benzersiz URL listesi, en fazla max_count adet.
    """
    seen: set = set()
    urls: list = []

    def _add(url: str) -> None:
        clean = url.strip()[:2000]
        if clean and clean not in seen and len(urls) < max_count:
            seen.add(clean)
            urls.append(clean)

    # media:content — tümü
    media_content = getattr(entry, "media_content", None)
    if media_content and isinstance(media_content, list):
        for mc in media_content:
            u = mc.get("url", "") if isinstance(mc, dict) else ""
            if u:
                _add(u)

    # media:thumbnail — tümü
    media_thumbnail = getattr(entry, "media_thumbnail", None)
    if media_thumbnail and isinstance(media_thumbnail, list):
        for mt in media_thumbnail:
            u = mt.get("url", "") if isinstance(mt, dict) else ""
            if u:
                _add(u)

    # enclosures (image type) — tümü
    enclosures = getattr(entry, "enclosures", None)
    if enclosures and isinstance(enclosures, list):
        for enc in enclosures:
            enc_type = enc.get("type", "") if isinstance(enc, dict) else ""
            enc_href = enc.get("href", "") if isinstance(enc, dict) else ""
            if enc_href and "image" in enc_type:
                _add(enc_href)

    # atom image
    image = getattr(entry, "image", None)
    if image:
        href = getattr(image, "href", None)
        if href:
            _add(str(href))

    return urls


# ---------------------------------------------------------------------------
# OG Image Scraping — RSS'te gorsel yoksa haber detay sayfasindan cek
#
# Gate Sources Closure guardrails:
#   - Settings-gated (``source_scans.og_scrape_enabled``, default True).
#   - Per-host throttle: minimum ``source_scans.og_scrape_min_interval_seconds``
#     between calls to the same host (module-local in-memory map).
#   - SSRF guard: rejects non-http(s), private/loopback/link-local hosts,
#     and unresolvable hostnames.
# ---------------------------------------------------------------------------

import ipaddress
import socket
from urllib.parse import urlparse

_OG_SCRAPE_TIMEOUT = 8  # saniye
_OG_SCRAPE_MAX_BYTES = 100_000  # ilk 100KB HTML yeterli (meta tag'lar head'de)

# In-memory per-host timestamp of last successful fetch. Single-process MVP.
_OG_LAST_FETCH: dict[str, float] = {}


def _is_private_host(hostname: str) -> bool:
    """Return True if hostname resolves to a loopback / private / link-local
    address. Used as the SSRF guard."""
    if not hostname:
        return True
    # Strip brackets from IPv6 literals.
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
        # It's a hostname — resolve it.
        try:
            infos = socket.getaddrinfo(hostname, None)
        except socket.gaierror:
            return True  # unresolvable → treat as unsafe
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


async def _og_scrape_settings(db: AsyncSession) -> tuple[bool, float]:
    """Resolve enable flag + per-host min-interval from Settings Registry."""
    enabled = True
    min_interval = 5.0
    try:
        from app.settings.settings_resolver import resolve as _resolve_setting
        enabled_raw = await _resolve_setting("source_scans.og_scrape_enabled", db)
        if enabled_raw is not None:
            enabled = bool(enabled_raw)
        interval_raw = await _resolve_setting(
            "source_scans.og_scrape_min_interval_seconds", db
        )
        if interval_raw is not None:
            try:
                min_interval = float(interval_raw)
            except (TypeError, ValueError):
                pass
    except Exception:
        pass
    return enabled, max(0.0, min_interval)


def _scrape_og_image(article_url: str) -> Optional[str]:
    """Scrape og:image / twitter:image with SSRF + throttle guards.

    Returns None if scraping is disabled via settings, the host is private,
    the per-host throttle window is still active, or any network error.
    Never raises.
    """
    if not article_url or not article_url.startswith(("http://", "https://")):
        return None

    try:
        parsed = urlparse(article_url)
    except Exception:
        return None
    host = (parsed.hostname or "").lower()
    if not host or _is_private_host(host):
        logger.debug("_scrape_og_image: host reddedildi (SSRF guard) — %s", host)
        return None

    # Per-host throttle — module-local dict; default 5s if settings not read.
    # execute_rss_scan resolves real settings and calls _scrape_og_image_gated.
    import time
    now_ts = time.monotonic()
    last = _OG_LAST_FETCH.get(host, 0.0)
    if now_ts - last < 5.0:
        logger.debug("_scrape_og_image: throttled (host=%s, elapsed=%.1fs)", host, now_ts - last)
        return None
    _OG_LAST_FETCH[host] = now_ts

    try:
        import urllib.request
        from html.parser import HTMLParser

        class _OGParser(HTMLParser):
            def __init__(self) -> None:
                super().__init__()
                self.og_image: Optional[str] = None
                self.tw_image: Optional[str] = None

            def handle_starttag(self, tag: str, attrs: list) -> None:
                if tag != "meta":
                    return
                d = dict(attrs)
                if d.get("property") == "og:image" and d.get("content"):
                    self.og_image = d["content"].strip()
                if d.get("name") == "twitter:image" and d.get("content"):
                    self.tw_image = d["content"].strip()

        req = urllib.request.Request(article_url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; ContentHub/1.0)",
        })
        with urllib.request.urlopen(req, timeout=_OG_SCRAPE_TIMEOUT) as resp:
            raw = resp.read(_OG_SCRAPE_MAX_BYTES)
            html_text = raw.decode("utf-8", errors="replace")

        parser = _OGParser()
        parser.feed(html_text)

        image_url = parser.og_image or parser.tw_image
        if image_url and len(image_url) <= 2000:
            return image_url
        return None

    except Exception as exc:
        logger.debug(
            "_scrape_og_image: scrape basarisiz — %s url=%s",
            type(exc).__name__, article_url[:80],
        )
        return None


async def _scrape_og_image_async(article_url: str) -> Optional[str]:
    """
    Async off-load wrapper around the blocking `_scrape_og_image`.

    The sync `_scrape_og_image` uses `urllib.request.urlopen` which blocks the
    calling thread for up to `_OG_SCRAPE_TIMEOUT` seconds. When called from
    inside an async scan loop (event loop thread), this freezes the whole
    FastAPI worker — heartbeats miss, other requests queue, SSE stalls.
    We therefore run the blocking call on the default thread pool via
    `asyncio.to_thread`, which returns the event loop to the scheduler.

    Contract identical to `_scrape_og_image`: never raises, returns url or None.
    """
    import asyncio as _asyncio
    try:
        return await _asyncio.to_thread(_scrape_og_image, article_url)
    except Exception as exc:
        # `_scrape_og_image` swallows everything internally; this guard is
        # purely defensive in case `to_thread` itself fails (extremely rare).
        logger.debug(
            "_scrape_og_image_async: off-load basarisiz — %s url=%s",
            type(exc).__name__, article_url[:80],
        )
        return None


def normalize_entry(
    entry: object,
    source: object,
    scan_id: str,
) -> Optional[dict]:
    """
    feedparser entry'sini NewsItem dict formatına dönüştürür.

    Zorunlu alanlar (url, title) eksikse None döner — bu entry atlanır.
    Hata fırlatmaz; sorunlu entry'ler sessizce çıkarılır ve sayılır.
    """
    url = _safe_str(getattr(entry, "link", None), max_length=1000)
    if not url:
        return None

    title = _safe_str(getattr(entry, "title", None), max_length=0)
    if not title:
        return None

    summary_raw = getattr(entry, "summary", None) or getattr(entry, "description", None)
    summary = _safe_str(summary_raw, max_length=0)

    published_at = _parse_published_at(entry)

    # M41: Haber görseli çıkarma (media:content, enclosure, og:image)
    image_url = _extract_image_url(entry)
    # M41a: Çoklu görsel çıkarma (max 5)
    image_urls = _extract_image_urls(entry, max_count=5)

    # Fallback: RSS'te gorsel yoksa haber detay sayfasindan og:image scrape et.
    # NOT: Asenkron settings bu fonksiyon icinde cagirilmiyor — scan runtime
    # ``og_scrape_enabled`` setting'ini okuyup asagidaki kosul ile kapatabilir.
    # Ornek cagrida normalize_entry'ye scrape_enabled=False gecilir.
    if not image_url and url and getattr(normalize_entry, "_og_scrape_enabled", True):
        scraped = _scrape_og_image(url)
        if scraped:
            image_url = scraped
            if not image_urls:
                image_urls = [scraped]
            logger.debug(
                "normalize_entry: og:image fallback kullanildi — %s",
                scraped[:80],
            )

    raw_preview: dict = {}
    for key in ("id", "link", "title", "published"):
        val = getattr(entry, key, None)
        if val is not None:
            raw_preview[key] = str(val)[:200]

    return {
        "source_id": getattr(source, "id"),
        "source_scan_id": scan_id,
        "title": title,
        "url": url,
        "summary": summary,
        "published_at": published_at,
        "language": getattr(source, "language", None),
        "category": getattr(source, "category", None),
        "status": "new",
        "dedupe_key": _build_dedupe_key(url),
        "raw_payload_json": json.dumps(raw_preview, ensure_ascii=False),
        "image_url": image_url,
        "image_urls_json": json.dumps(image_urls, ensure_ascii=False) if image_urls else None,
    }


# ---------------------------------------------------------------------------
# DB yardımcıları
# ---------------------------------------------------------------------------

async def _load_existing_items(
    db: AsyncSession,
    source_id: str,
    window_days: Optional[int] = None,
) -> list[dict]:
    """
    Bu kaynaga ait mevcut NewsItem kayitlarinin id/url/title uclusunu yukler.
    Hard + soft dedupe icin kullanilir.

    Gate Sources Closure:
      ``window_days`` > 0 ise yalnizca ``created_at >= now - window_days``
      kayitlari dondurur. Bu, zaman icinde sonsuza dek buyuyen soft-dedupe
      havuzunu onler. None / <=0 → eski davranis (tum kayitlar).
    """
    from datetime import timedelta
    q = select(NewsItem.id, NewsItem.url, NewsItem.title).where(
        NewsItem.source_id == source_id
    )
    if window_days and window_days > 0:
        cutoff = datetime.now(tz=timezone.utc) - timedelta(days=window_days)
        q = q.where(NewsItem.created_at >= cutoff)
    rows = await db.execute(q)
    return [
        {"id": row[0], "url": row[1] or "", "title": row[2] or ""}
        for row in rows.all()
    ]


# ---------------------------------------------------------------------------
# Ana tarama fonksiyonu
# ---------------------------------------------------------------------------

async def execute_rss_scan(
    db: AsyncSession,
    scan_id: str,
    allow_followup: bool = False,
) -> dict:
    """
    RSS taramasını gerçek zamanlı olarak çalıştırır.

    Parametreler:
      scan_id        : SourceScan.id
      allow_followup : True → soft dedupe atlanır; hard dedupe korunur.
                       Önceki taramada görülmüş benzer başlıklı haberlerin
                       takibi için kullanılır (follow-up exception).

    Adımlar:
      1. SourceScan ve NewsSource kayıtlarını yükle.
      2. Kaynak türü doğrula — yalnızca 'rss' desteklenir.
      3. SourceScan.status = 'running' yap.
      4. feedparser ile feed'i çek.
      5. Her entry'yi normalize et.
      6. Dedupe: hard (her zaman) + soft (allow_followup=False ise).
      7. Yeni NewsItem kayıtlarını oluştur.
      8. SourceScan.status = 'completed' | 'failed' yap.

    Döner:
      {
        "scan_id"          : str,
        "status"           : "completed" | "failed",
        "fetched_count"    : int,
        "new_count"        : int,
        "skipped_dedupe"   : int,   # hard + soft toplam bastırılan
        "skipped_hard"     : int,   # yalnızca hard dedupe bastırılan
        "skipped_soft"     : int,   # yalnızca soft dedupe bastırılan
        "followup_accepted": int,   # soft eşleşme vardı ama allow_followup ile yazıldı
        "skipped_invalid"  : int,
        "error_summary"    : str | None,
        "dedupe_details"   : list[dict],  # her bastırılan entry için açıklanabilir karar
      }

    dedupe_details semantiği:
      - Yalnızca is_suppressed=True veya followup_override=True olan kararları içerir.
      - "accepted" kararlar dahil edilmez (gürültüyü azaltmak için).
      - NewsItem.status değiştirilmez — bu liste yalnızca scan yanıtında yaşar.
    """
    # -- Kayıtları yükle --
    scan = await db.get(SourceScan, scan_id)
    if scan is None:
        raise ValueError(f"SourceScan bulunamadı: {scan_id}")

    source = await db.get(NewsSource, scan.source_id)
    if source is None:
        raise ValueError(f"NewsSource bulunamadı: {scan.source_id}")

    # -- Kaynak türü kontrolü --
    if source.source_type != "rss":
        err = f"Desteklenmeyen kaynak türü: '{source.source_type}'. Yalnızca 'rss' desteklenir."
        await _mark_failed(db, scan, err)
        return _failed_result(scan_id, err)

    # -- feed_url zorunlu --
    if not source.feed_url:
        err = "Kaynak feed_url alanı boş — RSS taraması yapılamaz."
        await _mark_failed(db, scan, err)
        return _failed_result(scan_id, err)

    # -- Running durumuna geç --
    now = datetime.now(tz=timezone.utc)
    scan.status = "running"
    scan.started_at = now
    await db.commit()
    await db.refresh(scan)

    # -- RSS çek --
    try:
        if not _FEEDPARSER_AVAILABLE or feedparser is None:
            raise ImportError("feedparser kurulu değil")
        # httpx ile fetch — redirect (301/302/308) desteği için
        import httpx
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as _http:
            resp = await _http.get(source.feed_url)
            resp.raise_for_status()
        feed = feedparser.parse(resp.content)
    except Exception as exc:
        err = f"feedparser hatası: {exc}"
        logger.error("RSS taraması başarısız [scan_id=%s]: %s", scan_id, err)
        await _mark_failed(db, scan, err)
        return _failed_result(scan_id, err)

    entries = getattr(feed, "entries", []) or []
    fetched_count = len(entries)

    # -- Settings resolver (M11 + Gate Sources Closure) --
    soft_threshold = None
    dedupe_window_days: Optional[int] = None
    og_scrape_enabled = True
    try:
        from app.settings.settings_resolver import resolve as _resolve_setting
        soft_threshold = await _resolve_setting("source_scans.soft_dedupe_threshold", db)
        raw_window = await _resolve_setting("news_items.soft_dedupe_window_days", db)
        if raw_window is not None:
            try:
                dedupe_window_days = int(raw_window)
            except (TypeError, ValueError):
                dedupe_window_days = None
        og_enabled_raw = await _resolve_setting("source_scans.og_scrape_enabled", db)
        if og_enabled_raw is not None:
            og_scrape_enabled = bool(og_enabled_raw)
    except Exception:
        pass  # Fall back to module defaults

    # IMPORTANT: normalize_entry's own blocking scrape path is disabled for the
    # async scan runtime — the loop below performs the scrape via
    # `_scrape_og_image_async` (asyncio.to_thread off-load) so the event loop
    # stays responsive. Tests that call normalize_entry directly are unaffected
    # because they don't override this flag.
    setattr(normalize_entry, "_og_scrape_enabled", False)
    # Preserve the user's intent so the async loop below can honor it.
    _og_scrape_enabled_for_loop: bool = bool(og_scrape_enabled)

    # -- Mevcut item'lari yukle (hard + soft dedupe, rolling window) --
    existing_items = await _load_existing_items(db, source.id, window_days=dedupe_window_days)
    dedupe_context = build_dedupe_context(
        existing_items, allow_followup=allow_followup, soft_threshold=soft_threshold,
    )

    # -- Entry'leri işle --
    new_count = 0
    skipped_hard = 0
    skipped_soft = 0
    followup_accepted = 0
    skipped_invalid = 0
    dedupe_details: list[dict] = []

    for entry in entries:
        normalized = normalize_entry(entry, source, scan_id)
        if normalized is None:
            skipped_invalid += 1
            continue

        # Async og:image fallback — off-loads blocking urlopen to a thread so
        # the event loop (heartbeats, SSE, other requests) stays responsive.
        # normalize_entry has already been told to skip its own sync scrape.
        if (
            _og_scrape_enabled_for_loop
            and not normalized.get("image_url")
            and normalized.get("url")
        ):
            scraped = await _scrape_og_image_async(normalized["url"])
            if scraped:
                normalized["image_url"] = scraped
                if not normalized.get("image_urls_json"):
                    normalized["image_urls_json"] = json.dumps(
                        [scraped], ensure_ascii=False
                    )

        decision: DedupeDecision = evaluate_entry(
            url=normalized["url"],
            title=normalized["title"],
            context=dedupe_context,
        )

        if decision.is_suppressed:
            if decision.reason == "hard_url_match":
                skipped_hard += 1
                # M41c: görsel backfill — mevcut item'da image_url yoksa güncelle
                if decision.matched_item_id and (
                    normalized.get("image_url") or normalized.get("image_urls_json")
                ):
                    await _backfill_images(
                        db,
                        item_id=decision.matched_item_id,
                        image_url=normalized.get("image_url"),
                        image_urls_json=normalized.get("image_urls_json"),
                    )
            else:
                skipped_soft += 1
            dedupe_details.append(_decision_to_dict(decision))
            continue

        if decision.followup_override:
            followup_accepted += 1
            dedupe_details.append(_decision_to_dict(decision))

        # Yeni kayıt oluştur
        item = NewsItem(
            source_id=normalized["source_id"],
            source_scan_id=normalized["source_scan_id"],
            title=normalized["title"],
            url=normalized["url"],
            summary=normalized["summary"],
            published_at=normalized["published_at"],
            language=normalized["language"],
            category=normalized["category"],
            status="new",
            dedupe_key=normalized["dedupe_key"],
            raw_payload_json=normalized["raw_payload_json"],
            # M41a: görsel alanları — RSS'den çekilen görseller
            image_url=normalized.get("image_url"),
            image_urls_json=normalized.get("image_urls_json"),
        )
        db.add(item)

        # Bu oturumda oluşturulan entry'leri dedupe context'e ekle
        norm_url = normalized["url"].strip().lower()
        dedupe_context.existing_url_map[norm_url] = "pending"
        new_count += 1

    # -- DB'ye yaz --
    try:
        await db.commit()
    except Exception as exc:
        err = f"Veritabanı yazma hatası: {exc}"
        logger.error("SourceScan DB yazma başarısız [scan_id=%s]: %s", scan_id, err)
        await db.rollback()
        await _mark_failed(db, scan, err)
        return _failed_result(scan_id, err, fetched_count, skipped_hard + skipped_soft, skipped_invalid)

    # -- Completed olarak işaretle --
    skipped_dedupe = skipped_hard + skipped_soft
    finished_at = datetime.now(tz=timezone.utc)
    scan.status = "completed"
    scan.finished_at = finished_at
    scan.result_count = new_count
    preview = {
        "fetched": fetched_count,
        "new": new_count,
        "skipped_hard": skipped_hard,
        "skipped_soft": skipped_soft,
        "followup_accepted": followup_accepted,
        "skipped_invalid": skipped_invalid,
    }
    scan.raw_result_preview_json = json.dumps(preview, ensure_ascii=False)
    await db.commit()

    logger.info(
        "RSS tarama tamamlandı [scan_id=%s] fetched=%d new=%d hard=%d soft=%d followup=%d invalid=%d",
        scan_id, fetched_count, new_count, skipped_hard, skipped_soft, followup_accepted, skipped_invalid,
    )

    return {
        "scan_id": scan_id,
        "status": "completed",
        "fetched_count": fetched_count,
        "new_count": new_count,
        "skipped_dedupe": skipped_dedupe,
        "skipped_hard": skipped_hard,
        "skipped_soft": skipped_soft,
        "followup_accepted": followup_accepted,
        "skipped_invalid": skipped_invalid,
        "error_summary": None,
        "dedupe_details": dedupe_details,
    }


async def _backfill_images(
    db: AsyncSession,
    item_id: str,
    image_url: Optional[str],
    image_urls_json: Optional[str],
) -> None:
    """
    M41c: Mevcut NewsItem'da image_url yoksa RSS'den gelen görsel URL'lerini yazar.

    Sadece image_url IS NULL olan kayıtları günceller — mevcut verilerin üstüne yazmaz.
    """
    try:
        item = await db.get(NewsItem, item_id)
        if item is None:
            return
        if item.image_url is not None:
            return  # Zaten görsel var, dokunma
        if image_url:
            item.image_url = image_url
        if image_urls_json:
            item.image_urls_json = image_urls_json
        await db.flush()  # commit scan loop'ta toplu yapılır
        logger.debug("Görsel backfill: item=%s url=%s", item_id, image_url)
    except Exception as exc:
        logger.debug("Görsel backfill başarısız item=%s: %s", item_id, exc)


def _decision_to_dict(d: DedupeDecision) -> dict:
    """DedupeDecision → API yanıtı dict."""
    return {
        "reason": d.reason,
        "is_suppressed": d.is_suppressed,
        "followup_override": d.followup_override,
        "entry_url": d.entry_url,
        "entry_title": d.entry_title,
        "matched_item_id": d.matched_item_id,
        "similarity_score": round(d.similarity_score, 4),
    }


def _failed_result(
    scan_id: str,
    error_summary: str,
    fetched_count: int = 0,
    skipped_dedupe: int = 0,
    skipped_invalid: int = 0,
) -> dict:
    """Başarısız tarama yanıtı oluşturur."""
    return {
        "scan_id": scan_id,
        "status": "failed",
        "fetched_count": fetched_count,
        "new_count": 0,
        "skipped_dedupe": skipped_dedupe,
        "skipped_hard": 0,
        "skipped_soft": 0,
        "followup_accepted": 0,
        "skipped_invalid": skipped_invalid,
        "error_summary": error_summary,
        "dedupe_details": [],
    }


async def _mark_failed(db: AsyncSession, scan: SourceScan, error_summary: str) -> None:
    """SourceScan kaydını failed olarak işaretler ve veritabanına yazar."""
    now = datetime.now(tz=timezone.utc)
    scan.status = "failed"
    if scan.finished_at is None:
        scan.finished_at = now
    scan.error_summary = error_summary[:500]
    # Faz 15: emit source_scan_error inbox item
    await emit_operation_event(
        db,
        item_type="source_scan_error",
        title=f"Kaynak tarama basarisiz: {getattr(scan, 'source_id', '')[:8] if getattr(scan, 'source_id', '') else 'bilinmeyen'}",
        reason=error_summary[:200],
        priority="normal",
        related_entity_type="source_scan",
        related_entity_id=scan.id,
        action_url="/admin/source-scans",
    )
    try:
        await db.commit()
    except Exception:
        await db.rollback()
