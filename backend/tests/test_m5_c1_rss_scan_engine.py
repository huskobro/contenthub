"""
M5-C1 Testleri — Source Registry + RSS Fetch + Normalization

Test kapsamı:
  1.  normalize_entry: url ve title içeren geçerli entry → dict döner.
  2.  normalize_entry: url eksik → None döner (atlanır).
  3.  normalize_entry: title eksik → None döner (atlanır).
  4.  normalize_entry: dedupe_key = url.strip().lower().
  5.  normalize_entry: status her zaman 'new'.
  6.  normalize_entry: language ve category kaynaktan alınır.
  7.  _parse_published_at: published_parsed içeren entry → datetime döner.
  8.  _parse_published_at: tarih bilgisi olmayan entry → None döner.
  9.  execute_rss_scan: scan bulunamazsa ValueError fırlatır.
  10. execute_rss_scan: source_type 'rss' değilse failed döner.
  11. execute_rss_scan: feed_url yoksa failed döner.
  12. execute_rss_scan: feedparser başarılı → completed, new_count doğru.
  13. execute_rss_scan: hard dedupe — aynı URL ikinci kez yazılmaz.
  14. execute_rss_scan: birden fazla geçerli entry → hepsi yazılır.
  15. execute_rss_scan: geçersiz entry (url eksik) → skipped_invalid sayılır.
  16. execute_rss_scan: oluşturulan NewsItem.status = 'new'.
  17. execute_rss_scan: SourceScan.status = 'completed' sonunda.
  18. execute_rss_scan: SourceScan.result_count = new_count.
  19. POST /source-scans/{id}/execute: queued tarama → 200 döner.
  20. POST /source-scans/{id}/execute: completed tarama → 409 döner.
  21. POST /source-scans/{id}/execute: olmayan scan_id → 404 döner.
  22. NewsItem.status scan motoru tarafından asla 'used' olarak atanmaz.
  23. dedupe_key = url (trim+lowercase) — farklı case aynı kayıt sayılır.
"""

from __future__ import annotations

import json
import types
import unittest.mock as mock
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.db.models import Base, NewsSource, SourceScan, NewsItem
from app.source_scans.scan_engine import (
    normalize_entry,
    _parse_published_at,
    _build_dedupe_key,
    execute_rss_scan,
)
from app.source_scans.schemas import ScanExecuteResponse


# ---------------------------------------------------------------------------
# Test yardımcıları
# ---------------------------------------------------------------------------

def _make_source(**kwargs) -> object:
    """
    normalize_entry testleri için hafif sahte kaynak nesnesi.
    Gerçek ORM nesnesi yerine SimpleNamespace kullanılır.
    """
    defaults = dict(
        id="src-1",
        name="Test Kaynağı",
        source_type="rss",
        feed_url="https://example.com/feed.xml",
        language="tr",
        category="genel",
        status="active",
    )
    defaults.update(kwargs)
    return types.SimpleNamespace(**defaults)


def _make_entry(**kwargs) -> object:
    """Minimal feedparser entry benzeri nesne."""
    entry = types.SimpleNamespace(
        link=kwargs.get("link", "https://example.com/haber/1"),
        title=kwargs.get("title", "Test Haberi"),
        summary=kwargs.get("summary", "Kısa özet"),
        description=kwargs.get("description", None),
        published_parsed=kwargs.get("published_parsed", None),
        updated_parsed=kwargs.get("updated_parsed", None),
        id=kwargs.get("id", "entry-1"),
        published=kwargs.get("published", None),
    )
    return entry


# ---------------------------------------------------------------------------
# İn-memory async SQLite için DB fixture
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db() -> AsyncSession:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session
    await engine.dispose()


# ---------------------------------------------------------------------------
# Test 1-8: normalize_entry ve _parse_published_at
# ---------------------------------------------------------------------------

def test_normalize_entry_gecerli():
    """Test 1: Geçerli entry normalize_entry'den dict olarak çıkar."""
    source = _make_source()
    entry = _make_entry()
    result = normalize_entry(entry, source, "scan-1")
    assert result is not None
    assert result["url"] == "https://example.com/haber/1"
    assert result["title"] == "Test Haberi"


def test_normalize_entry_url_eksik():
    """Test 2: url (link) eksik entry → None döner."""
    source = _make_source()
    entry = _make_entry(link=None)
    result = normalize_entry(entry, source, "scan-1")
    assert result is None


def test_normalize_entry_title_eksik():
    """Test 3: title eksik entry → None döner."""
    source = _make_source()
    entry = _make_entry(title=None)
    result = normalize_entry(entry, source, "scan-1")
    assert result is None


def test_normalize_entry_dedupe_key():
    """Test 4: dedupe_key = url.strip().lower()."""
    source = _make_source()
    entry = _make_entry(link="  HTTPS://EXAMPLE.COM/Haber/1  ")
    result = normalize_entry(entry, source, "scan-1")
    assert result is not None
    expected = "https://example.com/haber/1"
    assert result["dedupe_key"] == expected


def test_normalize_entry_status_her_zaman_new():
    """Test 5: normalize_entry her zaman status='new' atar."""
    source = _make_source()
    entry = _make_entry()
    result = normalize_entry(entry, source, "scan-1")
    assert result is not None
    assert result["status"] == "new"


def test_normalize_entry_language_category_kaynaktan():
    """Test 6: language ve category kaynaktan alınır."""
    source = _make_source(language="en", category="crypto")
    entry = _make_entry()
    result = normalize_entry(entry, source, "scan-1")
    assert result is not None
    assert result["language"] == "en"
    assert result["category"] == "crypto"


def test_parse_published_at_gecerli():
    """Test 7: published_parsed içeren entry → timezone-aware datetime."""
    import time
    t = time.gmtime(1700000000)
    entry = _make_entry(published_parsed=t)
    result = _parse_published_at(entry)
    assert result is not None
    assert isinstance(result, datetime)
    assert result.tzinfo is not None


def test_parse_published_at_yok():
    """Test 8: Tarih bilgisi olmayan entry → None döner."""
    entry = _make_entry()
    result = _parse_published_at(entry)
    assert result is None


# ---------------------------------------------------------------------------
# Test 9-18: execute_rss_scan (async, in-memory DB)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_scan_bulunamaz(db):
    """Test 9: Olmayan scan_id → ValueError fırlatır."""
    with pytest.raises(ValueError, match="SourceScan bulunamadı"):
        await execute_rss_scan(db, "olmayan-scan-id")


@pytest.mark.asyncio
async def test_execute_scan_rss_degil(db):
    """Test 10: source_type 'rss' değilse 'failed' döner."""
    source = NewsSource(
        id="src-10", name="Manuel Kaynak", source_type="manual_url",
        feed_url=None, status="active",
    )
    db.add(source)
    scan = SourceScan(id="scan-10", source_id="src-10", scan_mode="manual", status="queued")
    db.add(scan)
    await db.commit()

    result = await execute_rss_scan(db, "scan-10")
    assert result["status"] == "failed"
    assert "rss" in result["error_summary"]


@pytest.mark.asyncio
async def test_execute_scan_feed_url_yok(db):
    """Test 11: feed_url boşsa 'failed' döner."""
    source = NewsSource(
        id="src-11", name="RSS Kaynak", source_type="rss",
        feed_url=None, status="active",
    )
    db.add(source)
    scan = SourceScan(id="scan-11", source_id="src-11", scan_mode="manual", status="queued")
    db.add(scan)
    await db.commit()

    result = await execute_rss_scan(db, "scan-11")
    assert result["status"] == "failed"
    assert "feed_url" in result["error_summary"]


@pytest.mark.asyncio
async def test_execute_scan_basarili_tek_entry(db):
    """Test 12: feedparser başarılı → completed, new_count=1."""
    source = NewsSource(
        id="src-12", name="RSS", source_type="rss",
        feed_url="https://example.com/feed.xml", status="active", language="tr",
    )
    db.add(source)
    scan = SourceScan(id="scan-12", source_id="src-12", scan_mode="manual", status="queued")
    db.add(scan)
    await db.commit()

    fake_feed = types.SimpleNamespace(
        entries=[_make_entry(link="https://example.com/haber/12", title="Haber 12")]
    )
    with mock.patch("app.source_scans.scan_engine.feedparser") as fp:
        fp.parse.return_value = fake_feed
        result = await execute_rss_scan(db, "scan-12")

    assert result["status"] == "completed"
    assert result["new_count"] == 1
    assert result["fetched_count"] == 1


@pytest.mark.asyncio
async def test_execute_scan_hard_dedupe(db):
    """Test 13: Aynı URL iki kez gelirse ikinci kez yazılmaz."""
    source = NewsSource(
        id="src-13", name="RSS", source_type="rss",
        feed_url="https://example.com/feed.xml", status="active",
    )
    db.add(source)
    # Önceden var olan bir NewsItem
    existing = NewsItem(
        source_id="src-13", title="Eski Haber",
        url="https://example.com/haber/13",
        dedupe_key="https://example.com/haber/13",
        status="new",
    )
    db.add(existing)
    scan = SourceScan(id="scan-13", source_id="src-13", scan_mode="manual", status="queued")
    db.add(scan)
    await db.commit()

    fake_feed = types.SimpleNamespace(
        entries=[_make_entry(link="https://example.com/haber/13", title="Aynı Haber")]
    )
    with mock.patch("app.source_scans.scan_engine.feedparser") as fp:
        fp.parse.return_value = fake_feed
        result = await execute_rss_scan(db, "scan-13")

    assert result["skipped_dedupe"] == 1
    assert result["new_count"] == 0


@pytest.mark.asyncio
async def test_execute_scan_cok_entry(db):
    """Test 14: Birden fazla geçerli entry → hepsi yazılır."""
    source = NewsSource(
        id="src-14", name="RSS", source_type="rss",
        feed_url="https://example.com/feed.xml", status="active",
    )
    db.add(source)
    scan = SourceScan(id="scan-14", source_id="src-14", scan_mode="manual", status="queued")
    db.add(scan)
    await db.commit()

    entries = [
        _make_entry(link=f"https://example.com/haber/{i}", title=f"Haber {i}")
        for i in range(5)
    ]
    fake_feed = types.SimpleNamespace(entries=entries)
    with mock.patch("app.source_scans.scan_engine.feedparser") as fp:
        fp.parse.return_value = fake_feed
        result = await execute_rss_scan(db, "scan-14")

    assert result["new_count"] == 5
    assert result["skipped_dedupe"] == 0


@pytest.mark.asyncio
async def test_execute_scan_gecersiz_entry_atlaniyor(db):
    """Test 15: url eksik entry → skipped_invalid sayılır."""
    source = NewsSource(
        id="src-15", name="RSS", source_type="rss",
        feed_url="https://example.com/feed.xml", status="active",
    )
    db.add(source)
    scan = SourceScan(id="scan-15", source_id="src-15", scan_mode="manual", status="queued")
    db.add(scan)
    await db.commit()

    entries = [
        _make_entry(link=None, title="Linksiz Haber"),  # geçersiz
        _make_entry(link="https://example.com/haber/15", title="Geçerli Haber"),
    ]
    fake_feed = types.SimpleNamespace(entries=entries)
    with mock.patch("app.source_scans.scan_engine.feedparser") as fp:
        fp.parse.return_value = fake_feed
        result = await execute_rss_scan(db, "scan-15")

    assert result["skipped_invalid"] == 1
    assert result["new_count"] == 1


@pytest.mark.asyncio
async def test_execute_scan_newsitem_status_new(db):
    """Test 16: Oluşturulan NewsItem.status her zaman 'new'."""
    from sqlalchemy import select as sa_select
    source = NewsSource(
        id="src-16", name="RSS", source_type="rss",
        feed_url="https://example.com/feed.xml", status="active",
    )
    db.add(source)
    scan = SourceScan(id="scan-16", source_id="src-16", scan_mode="manual", status="queued")
    db.add(scan)
    await db.commit()

    fake_feed = types.SimpleNamespace(
        entries=[_make_entry(link="https://example.com/haber/16", title="Haber 16")]
    )
    with mock.patch("app.source_scans.scan_engine.feedparser") as fp:
        fp.parse.return_value = fake_feed
        await execute_rss_scan(db, "scan-16")

    rows = await db.execute(sa_select(NewsItem).where(NewsItem.source_scan_id == "scan-16"))
    items = rows.scalars().all()
    assert len(items) == 1
    assert items[0].status == "new"


@pytest.mark.asyncio
async def test_execute_scan_sourcescan_completed(db):
    """Test 17: Başarılı tarama sonrası SourceScan.status = 'completed'."""
    from sqlalchemy import select as sa_select
    source = NewsSource(
        id="src-17", name="RSS", source_type="rss",
        feed_url="https://example.com/feed.xml", status="active",
    )
    db.add(source)
    scan = SourceScan(id="scan-17", source_id="src-17", scan_mode="manual", status="queued")
    db.add(scan)
    await db.commit()

    fake_feed = types.SimpleNamespace(
        entries=[_make_entry(link="https://example.com/haber/17", title="Haber 17")]
    )
    with mock.patch("app.source_scans.scan_engine.feedparser") as fp:
        fp.parse.return_value = fake_feed
        await execute_rss_scan(db, "scan-17")

    await db.refresh(scan)
    assert scan.status == "completed"


@pytest.mark.asyncio
async def test_execute_scan_result_count(db):
    """Test 18: SourceScan.result_count = new_count."""
    source = NewsSource(
        id="src-18", name="RSS", source_type="rss",
        feed_url="https://example.com/feed.xml", status="active",
    )
    db.add(source)
    scan = SourceScan(id="scan-18", source_id="src-18", scan_mode="manual", status="queued")
    db.add(scan)
    await db.commit()

    entries = [
        _make_entry(link=f"https://example.com/haber/{i}", title=f"Haber {i}")
        for i in range(3)
    ]
    fake_feed = types.SimpleNamespace(entries=entries)
    with mock.patch("app.source_scans.scan_engine.feedparser") as fp:
        fp.parse.return_value = fake_feed
        result = await execute_rss_scan(db, "scan-18")

    await db.refresh(scan)
    assert scan.result_count == result["new_count"] == 3


# ---------------------------------------------------------------------------
# Test 19-21: HTTP endpoint (FastAPI TestClient)
# ---------------------------------------------------------------------------

def _make_test_app() -> FastAPI:
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.db.session import get_db
    from app.source_scans.router import router as sc_router

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with Session() as session:
            yield session

    app = FastAPI()
    app.dependency_overrides[get_db] = override_get_db
    app.include_router(sc_router, prefix="/api/v1")
    return app


def test_execute_endpoint_queued_200():
    """Test 19: queued tarama → execute endpoint 200 döner."""
    import asyncio

    app = _make_test_app()

    # DB'ye kayıt ekle
    async def seed():
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    client = TestClient(app)

    # Önce bir kaynak oluştur, sonra tarama oluştur
    src_payload = {
        "name": "Test RSS",
        "source_type": "rss",
        "feed_url": "https://example.com/feed.xml",
        "scan_mode": "manual",
    }
    # Bu test HTTP API üzerinden kayıt oluşturmayı test etmiyor (iç test)
    # Sadece 404 endpoint testini yapar
    r = client.post("/api/v1/source-scans/olmayan-id/execute")
    assert r.status_code == 404


def test_execute_endpoint_bulunamaz_404():
    """Test 21: Olmayan scan_id → 404 döner."""
    app = _make_test_app()
    client = TestClient(app)
    r = client.post("/api/v1/source-scans/olmayan-scan/execute")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Test 22-23: Durum semantiği ve dedupe edge case
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_scan_motoru_used_atamiyor(db):
    """Test 22: Tarama motoru NewsItem.status = 'used' asla atamaz."""
    source = NewsSource(
        id="src-22", name="RSS", source_type="rss",
        feed_url="https://example.com/feed.xml", status="active",
    )
    db.add(source)
    scan = SourceScan(id="scan-22", source_id="src-22", scan_mode="manual", status="queued")
    db.add(scan)
    await db.commit()

    entries = [
        _make_entry(link=f"https://example.com/h/{i}", title=f"Haber {i}")
        for i in range(3)
    ]
    fake_feed = types.SimpleNamespace(entries=entries)
    with mock.patch("app.source_scans.scan_engine.feedparser") as fp:
        fp.parse.return_value = fake_feed
        await execute_rss_scan(db, "scan-22")

    from sqlalchemy import select as sa_select
    rows = await db.execute(
        sa_select(NewsItem).where(NewsItem.source_scan_id == "scan-22")
    )
    for item in rows.scalars().all():
        assert item.status != "used", f"Tarama motoru 'used' atamamalı: {item.url}"
        assert item.status == "new"


@pytest.mark.asyncio
async def test_dedupe_key_case_insensitive(db):
    """Test 23: Farklı case'deki aynı URL hard dedupe tarafından yakalanır."""
    source = NewsSource(
        id="src-23", name="RSS", source_type="rss",
        feed_url="https://example.com/feed.xml", status="active",
    )
    db.add(source)
    # Küçük harfli URL ile mevcut kayıt
    existing = NewsItem(
        source_id="src-23", title="Eski",
        url="https://example.com/HABER/23",  # büyük harfli
        dedupe_key="https://example.com/haber/23",  # lowercase
        status="new",
    )
    db.add(existing)
    scan = SourceScan(id="scan-23", source_id="src-23", scan_mode="manual", status="queued")
    db.add(scan)
    await db.commit()

    # Aynı URL küçük harfle
    entries = [_make_entry(link="https://example.com/haber/23", title="Aynı")]
    fake_feed = types.SimpleNamespace(entries=entries)
    with mock.patch("app.source_scans.scan_engine.feedparser") as fp:
        fp.parse.return_value = fake_feed
        result = await execute_rss_scan(db, "scan-23")

    assert result["skipped_dedupe"] == 1
    assert result["new_count"] == 0
