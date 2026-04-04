"""
Kaynak Tarama Motoru — M5-C1

RSS kaynaklarını feedparser ile gerçek zamanlı çeker, normalize eder ve
NewsItem kayıtları olarak veritabanına yazar.

Durum semantiği (önemli):
  SourceScan.status  : 'queued' → 'running' → 'completed' | 'failed'
  NewsItem.status    : her zaman 'new' olarak başlar — tarama motoru asla
                       'used', 'reviewed' veya 'ignored' ataması yapmaz.
                       Bu geçişler ayrı iş akışlarına aittir.

Hard dedupe:
  NewsItem.url alanı üzerinden tam eşleşme kontrolü.
  Aynı URL varsa kayıt oluşturulmaz; dedupe_key = url olarak atanır.
  Soft dedupe (başlık benzerliği) M5-C2 kapsamındadır.

Kapsam:
  Yalnızca source_type='rss' desteklenir.
  'manual_url' ve 'api' kaynak türleri bu motorda çalışmaz; açık hata döner.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsSource, NewsItem, SourceScan

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
    Soft dedupe (M5-C2) için ek alan ayrılmış değil — bu fonksiyon
    yalnızca hard dedupe içindir.
    """
    return url.strip().lower()


def normalize_entry(
    entry: object,
    source: NewsSource,
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

    # summary: önce summary, yoksa description dene
    summary_raw = getattr(entry, "summary", None) or getattr(entry, "description", None)
    summary = _safe_str(summary_raw, max_length=0)

    published_at = _parse_published_at(entry)

    # Ham veri izi — yalnızca küçük bir önizleme saklanır
    raw_preview: dict = {}
    for key in ("id", "link", "title", "published"):
        val = getattr(entry, key, None)
        if val is not None:
            raw_preview[key] = str(val)[:200]

    return {
        "source_id": source.id,
        "source_scan_id": scan_id,
        "title": title,
        "url": url,
        "summary": summary,
        "published_at": published_at,
        "language": source.language,
        "category": source.category,
        "status": "new",
        "dedupe_key": _build_dedupe_key(url),
        "raw_payload_json": json.dumps(raw_preview, ensure_ascii=False),
    }


# ---------------------------------------------------------------------------
# Mevcut URL seti — hard dedupe kontrolü
# ---------------------------------------------------------------------------

async def _load_existing_urls(db: AsyncSession, source_id: str) -> set[str]:
    """
    Bu kaynağa ait mevcut tüm NewsItem URL'lerini yükler.
    Hard dedupe için kullanılır.
    """
    rows = await db.execute(
        select(NewsItem.url).where(NewsItem.source_id == source_id)
    )
    return {row[0].strip().lower() for row in rows.all() if row[0]}


# ---------------------------------------------------------------------------
# Ana tarama fonksiyonu
# ---------------------------------------------------------------------------

async def execute_rss_scan(
    db: AsyncSession,
    scan_id: str,
) -> dict:
    """
    RSS taramasını gerçek zamanlı olarak çalıştırır.

    Adımlar:
      1. SourceScan ve NewsSource kayıtlarını yükle.
      2. Kaynak türü doğrula — yalnızca 'rss' desteklenir.
      3. SourceScan.status = 'running' yap.
      4. feedparser ile feed'i çek.
      5. Her entry'yi normalize et.
      6. Hard dedupe: mevcut URL'lerle karşılaştır.
      7. Yeni NewsItem kayıtlarını oluştur.
      8. SourceScan.status = 'completed' | 'failed' yap.

    Döner:
      {
        "scan_id": str,
        "status": "completed" | "failed",
        "fetched_count": int,       # feed'den gelen toplam entry sayısı
        "new_count": int,           # veritabanına yazılan yeni kayıt sayısı
        "skipped_dedupe": int,      # URL çakışması nedeniyle atlanan
        "skipped_invalid": int,     # url/title eksik nedeniyle atlanan
        "error_summary": str | None,
      }
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
        return {
            "scan_id": scan_id,
            "status": "failed",
            "fetched_count": 0,
            "new_count": 0,
            "skipped_dedupe": 0,
            "skipped_invalid": 0,
            "error_summary": err,
        }

    # -- feed_url zorunlu --
    if not source.feed_url:
        err = "Kaynak feed_url alanı boş — RSS taraması yapılamaz."
        await _mark_failed(db, scan, err)
        return {
            "scan_id": scan_id,
            "status": "failed",
            "fetched_count": 0,
            "new_count": 0,
            "skipped_dedupe": 0,
            "skipped_invalid": 0,
            "error_summary": err,
        }

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
        feed = feedparser.parse(source.feed_url)
    except Exception as exc:
        err = f"feedparser hatası: {exc}"
        logger.error("RSS taraması başarısız [scan_id=%s]: %s", scan_id, err)
        await _mark_failed(db, scan, err)
        return {
            "scan_id": scan_id,
            "status": "failed",
            "fetched_count": 0,
            "new_count": 0,
            "skipped_dedupe": 0,
            "skipped_invalid": 0,
            "error_summary": err,
        }

    entries = getattr(feed, "entries", []) or []
    fetched_count = len(entries)

    # -- Mevcut URL'leri yükle (hard dedupe) --
    existing_urls = await _load_existing_urls(db, source.id)

    # -- Entry'leri işle --
    new_count = 0
    skipped_dedupe = 0
    skipped_invalid = 0

    for entry in entries:
        normalized = normalize_entry(entry, source, scan_id)
        if normalized is None:
            skipped_invalid += 1
            continue

        url_key = _build_dedupe_key(normalized["url"])
        if url_key in existing_urls:
            skipped_dedupe += 1
            continue

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
        )
        db.add(item)
        existing_urls.add(url_key)  # Bu oturumdaki çakışmaları da yakala
        new_count += 1

    # -- DB'ye yaz --
    try:
        await db.commit()
    except Exception as exc:
        err = f"Veritabanı yazma hatası: {exc}"
        logger.error("SourceScan DB yazma başarısız [scan_id=%s]: %s", scan_id, err)
        await db.rollback()
        await _mark_failed(db, scan, err)
        return {
            "scan_id": scan_id,
            "status": "failed",
            "fetched_count": fetched_count,
            "new_count": 0,
            "skipped_dedupe": skipped_dedupe,
            "skipped_invalid": skipped_invalid,
            "error_summary": err,
        }

    # -- Completed olarak işaretle --
    finished_at = datetime.now(tz=timezone.utc)
    scan.status = "completed"
    scan.finished_at = finished_at
    scan.result_count = new_count
    preview = {
        "fetched": fetched_count,
        "new": new_count,
        "skipped_dedupe": skipped_dedupe,
        "skipped_invalid": skipped_invalid,
    }
    scan.raw_result_preview_json = json.dumps(preview, ensure_ascii=False)
    await db.commit()

    logger.info(
        "RSS tarama tamamlandı [scan_id=%s] fetched=%d new=%d dedupe=%d invalid=%d",
        scan_id, fetched_count, new_count, skipped_dedupe, skipped_invalid,
    )

    return {
        "scan_id": scan_id,
        "status": "completed",
        "fetched_count": fetched_count,
        "new_count": new_count,
        "skipped_dedupe": skipped_dedupe,
        "skipped_invalid": skipped_invalid,
        "error_summary": None,
    }


async def _mark_failed(db: AsyncSession, scan: SourceScan, error_summary: str) -> None:
    """SourceScan kaydını failed olarak işaretler ve veritabanına yazar."""
    now = datetime.now(tz=timezone.utc)
    scan.status = "failed"
    if scan.finished_at is None:
        scan.finished_at = now
    scan.error_summary = error_summary[:500]
    try:
        await db.commit()
    except Exception:
        await db.rollback()
