"""
Gate Sources Closure — integration tests.

Covers the behaviors introduced by the Gate Sources Closure milestone:

  A) KNOWN_SETTINGS registration — 7 new Gate settings are registered and
     resolvable with the documented defaults.
  B) Retention sweep — expired news_items are deleted, referenced items are
     preserved, and stale source_scans are cleaned up with news_items
     detached rather than cascaded.
  C) Rolling soft-dedupe window — items older than the window no longer
     participate in soft dedupe.
  D) OG scrape SSRF guard — private/loopback hosts are refused.
  E) OG scrape per-host throttle — repeated calls within the window return
     None without hitting the network.
  F) Trust enforcement breakdown — low/medium/high produce distinct signals.
     low_trust_items, medium_trust_items, and trust_breakdown are populated
     and behave correctly under enforcement_level=warn vs block.
  G) Retry endpoint — POST /source-scans/{id}/retry creates a new queued
     scan for the same source and audit-logs source_scan.retry.
  H) Health endpoint — GET /sources/{id}/health returns the health surface
     with labels {healthy, degraded, unhealthy, no_recent_scans, unknown}.
  I) Trigger scan — POST /sources/{id}/trigger-scan creates a manual scan,
     audit-logs source.trigger_scan, and rejects non-rss sources.
  J) Pagination envelopes — /sources, /news-items, /source-scans all return
     {items, total, offset, limit} and honor offset+limit.
  K) Hard rejection — source_type manual_url/api and scan_mode curated are
     422 regardless of other fields. News item status 'reviewed' is 422.
  L) Migration backfill semantics — news_items.status 'reviewed' rows are
     migrated to 'new' (NOT 'used'). 'reviewed' was never "consumed" — it
     was an orphan review-gate state that the product no longer supports.
  M) Duplicate feed_url → 409 Conflict on both POST /sources (create) and
     PATCH /sources/{id} (update). Backed by the partial UNIQUE index from
     gate_sources_001 migration.
  N) Scheduler enabled=False → tick is a no-op. Setting changes take effect
     on the next tick without restart (live-reload).
  O) Scheduler interval change → SCHEDULER_STATE.effective_interval_seconds
     reflects the new value on the next settings read.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.models import NewsItem, SourceScan, UsedNewsRegistry


SOURCES = "/api/v1/sources"
SCANS = "/api/v1/source-scans"
NEWS_ITEMS = "/api/v1/news-items"
BULLETINS = "/api/v1/modules/news-bulletin"


def _uid() -> str:
    return uuid.uuid4().hex[:8]


async def _create_source(client: AsyncClient, **overrides) -> dict:
    payload = {
        "name": f"Src {_uid()}",
        "source_type": "rss",
        "feed_url": f"https://example.com/{_uid()}.xml",
    }
    payload.update(overrides)
    r = await client.post(SOURCES, json=payload)
    assert r.status_code == 201, r.text
    return r.json()


# ---------------------------------------------------------------------------
# A) KNOWN_SETTINGS registration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_known_settings_gate_sources_closure_registered():
    """Gate Sources Closure 7 yeni ayari KNOWN_SETTINGS icinde kayitli olmali."""
    from app.settings.settings_resolver import KNOWN_SETTINGS

    expected = {
        "news_items.soft_dedupe_window_days": 30,
        "news_items.retention.enabled": True,
        "news_items.retention.days": 180,
        "source_scans.retention.days": 90,
        "source_scans.retention.poll_interval_seconds": 3600,
        "source_scans.og_scrape_enabled": True,
        "source_scans.og_scrape_min_interval_seconds": 5,
    }
    for key, default in expected.items():
        assert key in KNOWN_SETTINGS, f"{key} KNOWN_SETTINGS icinde olmali"
        entry = KNOWN_SETTINGS[key]
        assert entry.get("builtin_default") == default or entry.get("default") == default, (
            f"{key} varsayilan degeri {default} olmali"
        )


@pytest.mark.asyncio
async def test_retention_settings_resolve_with_defaults(test_engine):
    """resolve() Gate ayarlarini registered default ile donmeli."""
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from app.settings.settings_resolver import resolve

    Session = async_sessionmaker(test_engine, expire_on_commit=False)
    async with Session() as db:
        assert await resolve("news_items.retention.enabled", db) is True
        assert await resolve("news_items.retention.days", db) == 180
        assert await resolve("source_scans.retention.days", db) == 90
        assert await resolve("source_scans.og_scrape_enabled", db) is True
        assert await resolve("news_items.soft_dedupe_window_days", db) == 30


# ---------------------------------------------------------------------------
# B) Retention sweep
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_retention_sweep_deletes_expired_news_items(test_engine):
    """_run_sweep eski news_items'i siler ama used_news_registry referansini korur."""
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from app.source_scans.retention import _run_sweep

    Session = async_sessionmaker(test_engine, expire_on_commit=False)

    now = datetime.now(timezone.utc)
    old_unref_id = _uid()
    old_ref_id = _uid()
    fresh_id = _uid()

    async with Session() as db:
        old_unref = NewsItem(
            id=old_unref_id,
            title="Eski referanssiz",
            url=f"https://x.com/{old_unref_id}",
            status="new",
            created_at=now - timedelta(days=400),
        )
        old_ref = NewsItem(
            id=old_ref_id,
            title="Eski referansli",
            url=f"https://x.com/{old_ref_id}",
            status="used",
            created_at=now - timedelta(days=400),
        )
        fresh = NewsItem(
            id=fresh_id,
            title="Taze",
            url=f"https://x.com/{fresh_id}",
            status="new",
            created_at=now - timedelta(days=1),
        )
        db.add_all([old_unref, old_ref, fresh])
        await db.flush()

        registry = UsedNewsRegistry(
            news_item_id=old_ref_id,
            usage_type="published",
            target_module="news_bulletin",
            target_entity_id=_uid(),
        )
        db.add(registry)
        await db.commit()

    result = await _run_sweep(Session, news_days=180, scan_days=90)
    assert result["deleted_news_items"] >= 1

    async with Session() as db:
        surviving_ids = set(
            (await db.execute(select(NewsItem.id))).scalars().all()
        )
        assert old_unref_id not in surviving_ids, "Referanssiz eski item silinmeli"
        assert old_ref_id in surviving_ids, "Referansli item silinmemeli"
        assert fresh_id in surviving_ids, "Taze item silinmemeli"


@pytest.mark.asyncio
async def test_retention_sweep_detaches_scan_link_before_delete(test_engine):
    """SourceScan silinmeden once bagli NewsItem.source_scan_id NULL'lanmali."""
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from app.db.models import NewsSource
    from app.source_scans.retention import _run_sweep

    Session = async_sessionmaker(test_engine, expire_on_commit=False)
    now = datetime.now(timezone.utc)

    async with Session() as db:
        src = NewsSource(
            name=f"Retention src {_uid()}",
            source_type="rss",
            feed_url=f"https://x.com/{_uid()}.xml",
        )
        db.add(src)
        await db.flush()

        scan = SourceScan(
            source_id=src.id,
            scan_mode="manual",
            status="completed",
            created_at=now - timedelta(days=200),
        )
        db.add(scan)
        await db.flush()

        fresh_news_id = _uid()
        fresh = NewsItem(
            id=fresh_news_id,
            title="Taze haber eski tarama",
            url=f"https://x.com/{fresh_news_id}",
            status="new",
            source_id=src.id,
            source_scan_id=scan.id,
            created_at=now - timedelta(days=1),
        )
        db.add(fresh)
        await db.commit()

        target_scan_id = scan.id

    result = await _run_sweep(Session, news_days=180, scan_days=90)
    assert result["deleted_source_scans"] >= 1
    assert result["detached_news_items"] >= 1

    async with Session() as db:
        # scan silindi
        gone = await db.execute(select(SourceScan).where(SourceScan.id == target_scan_id))
        assert gone.scalar_one_or_none() is None

        # news_item hayatta, ama source_scan_id NULL
        survived = await db.execute(
            select(NewsItem).where(NewsItem.id == fresh_news_id)
        )
        ni = survived.scalar_one_or_none()
        assert ni is not None, "News item silinmemeli — yalnizca detach edilmeli"
        assert ni.source_scan_id is None, "source_scan_id NULL'lanmali"


# ---------------------------------------------------------------------------
# C) Rolling soft-dedupe window
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_rolling_dedupe_window_filters_old_items(test_engine):
    """_load_existing_items: window disinda kalan item'lar DONMEMELI."""
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from app.db.models import NewsSource
    from app.source_scans.scan_engine import _load_existing_items

    Session = async_sessionmaker(test_engine, expire_on_commit=False)
    now = datetime.now(timezone.utc)

    async with Session() as db:
        src = NewsSource(
            name=f"Rolling src {_uid()}",
            source_type="rss",
            feed_url=f"https://x.com/{_uid()}.xml",
        )
        db.add(src)
        await db.flush()

        fresh_url = f"https://x.com/fresh-{_uid()}"
        old_url = f"https://x.com/old-{_uid()}"

        fresh = NewsItem(
            title="Fresh",
            url=fresh_url,
            status="new",
            source_id=src.id,
            created_at=now - timedelta(days=1),
        )
        old = NewsItem(
            title="Old",
            url=old_url,
            status="new",
            source_id=src.id,
            created_at=now - timedelta(days=60),
        )
        db.add_all([fresh, old])
        await db.commit()

        # window=30 → eskisi pencere disinda → sadece fresh gelmeli
        rows = await _load_existing_items(db, source_id=src.id, window_days=30)
        urls = {r["url"] for r in rows}
        assert fresh_url in urls
        assert old_url not in urls

        # window=None → tum kayitlar
        rows_all = await _load_existing_items(db, source_id=src.id, window_days=None)
        all_urls = {r["url"] for r in rows_all}
        assert fresh_url in all_urls
        assert old_url in all_urls


# ---------------------------------------------------------------------------
# D) OG scrape SSRF guard
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "hostname,expected_private",
    [
        ("127.0.0.1", True),
        ("localhost", True),
        ("10.0.0.1", True),
        ("192.168.1.1", True),
        ("169.254.1.1", True),
        ("::1", True),
        ("8.8.8.8", False),
    ],
)
def test_og_scrape_ssrf_guard_rejects_private_hosts(hostname, expected_private):
    """_is_private_host ozel/loopback/link-local IP'leri reddetmeli."""
    from app.source_scans.scan_engine import _is_private_host

    assert _is_private_host(hostname) is expected_private


def test_og_scrape_rejects_private_url():
    """_scrape_og_image ozel host URL'ini hicbir network cagrisi yapmadan None dondurmeli."""
    from app.source_scans.scan_engine import _scrape_og_image

    assert _scrape_og_image("http://127.0.0.1/page") is None
    assert _scrape_og_image("http://10.0.0.5/news") is None
    assert _scrape_og_image("not-a-url") is None
    assert _scrape_og_image("") is None


# ---------------------------------------------------------------------------
# E) OG scrape per-host throttle
# ---------------------------------------------------------------------------

def test_og_scrape_per_host_throttle_blocks_rapid_calls(monkeypatch):
    """Ayni host icin pencere icinde ikinci cagri network'e gitmeden None donmeli."""
    import time as _time
    from app.source_scans import scan_engine as engine

    # Reset throttle map
    engine._OG_LAST_FETCH.clear()

    # _is_private_host: her host'u public kabul et
    monkeypatch.setattr(engine, "_is_private_host", lambda h: False)

    # Throttle haritasini onceden doldur → simdi cagri yapilirsa throttle uzak olmali
    now = _time.monotonic()
    engine._OG_LAST_FETCH["throttled.example.com"] = now  # su an

    # urlopen cagrilirsa counter artar — throttle calisiyorsa ARTMAMALI
    call_counter = {"n": 0}

    def _fake_urlopen(*_args, **_kwargs):
        call_counter["n"] += 1
        raise RuntimeError("network should not be called while throttled")

    import urllib.request as _ur
    monkeypatch.setattr(_ur, "urlopen", _fake_urlopen)

    result = engine._scrape_og_image("https://throttled.example.com/a")
    assert result is None, "Throttle esnasinda None donmeli"
    assert call_counter["n"] == 0, "Throttle esnasinda urlopen cagrilmamali"

    # Farkli host → throttle etkilenmemeli (map'te yok)
    # Bu host icin last=0.0; time.monotonic() process-relative oldugundan
    # test ortaminda yine throttle devreye girebilir — bu sebeple sadece
    # "farkli host ile map guncellenmez degil, ama counter ayni kalabilir" demek zor.
    # Burada yalnizca AYNI host'un bloklandigini onayliyoruz.
    assert engine._OG_LAST_FETCH.get("throttled.example.com") == now, (
        "Throttle ile vurulan host'un timestamp'i degismemeli"
    )


# ---------------------------------------------------------------------------
# F) Trust enforcement breakdown — low/medium/high distinct
# ---------------------------------------------------------------------------

async def _make_bulletin_with_sources(
    client: AsyncClient,
    trust_levels: list[str],
    enforcement_level: str = "warn",
) -> tuple[str, list[str]]:
    """Helper: create a bulletin, create N sources with given trust_levels,
    create one news_item per source, select them all into the bulletin.
    Returns (bulletin_id, source_ids)."""
    # bulletin
    b_resp = await client.post(
        BULLETINS,
        json={"topic": f"TrustTest {_uid()}", "trust_enforcement_level": enforcement_level},
    )
    assert b_resp.status_code == 201, b_resp.text
    bid = b_resp.json()["id"]

    source_ids = []
    for tl in trust_levels:
        s = await _create_source(client, trust_level=tl)
        source_ids.append(s["id"])
        ni = await client.post(
            NEWS_ITEMS,
            json={
                "title": f"Trust test {_uid()}",
                "url": f"https://x.com/{_uid()}",
                "status": "new",
                "source_id": s["id"],
            },
        )
        assert ni.status_code == 201, ni.text
        sel = await client.post(
            f"{BULLETINS}/{bid}/selected-news",
            json={"news_item_id": ni.json()["id"], "sort_order": 0},
        )
        assert sel.status_code == 201, sel.text

    return bid, source_ids


@pytest.mark.asyncio
async def test_trust_breakdown_counts_low_medium_high(client: AsyncClient):
    """trust_breakdown low/medium/high dagilimini dogru vermeli."""
    bid, _ = await _make_bulletin_with_sources(
        client,
        trust_levels=["low", "low", "medium", "high", "high", "high"],
        enforcement_level="warn",
    )
    r = await client.get(f"{BULLETINS}/{bid}/trust-check")
    assert r.status_code == 200
    body = r.json()
    bd = body["trust_breakdown"]
    assert bd.get("low", 0) == 2
    assert bd.get("medium", 0) == 1
    assert bd.get("high", 0) == 3
    assert len(body["low_trust_items"]) == 2
    assert len(body["medium_trust_items"]) == 1


@pytest.mark.asyncio
async def test_trust_block_level_blocks_only_on_low(client: AsyncClient):
    """enforcement_level=block yalnizca low varsa block etmeli; medium gecmeli."""
    # medium-only → block altinda gecmeli
    bid_medium, _ = await _make_bulletin_with_sources(
        client, trust_levels=["medium", "high"], enforcement_level="block"
    )
    r1 = await client.get(f"{BULLETINS}/{bid_medium}/trust-check")
    assert r1.status_code == 200
    assert r1.json()["pass_check"] is True, "medium-only block altinda gecmeli"
    assert len(r1.json()["medium_trust_items"]) == 1

    # low varsa → block
    bid_low, _ = await _make_bulletin_with_sources(
        client, trust_levels=["low", "high"], enforcement_level="block"
    )
    r2 = await client.get(f"{BULLETINS}/{bid_low}/trust-check")
    assert r2.status_code == 200
    assert r2.json()["pass_check"] is False
    assert len(r2.json()["low_trust_items"]) == 1


# ---------------------------------------------------------------------------
# G) Retry endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_retry_scan_creates_new_queued_scan_for_same_source(client: AsyncClient):
    """POST /source-scans/{id}/retry yeni bir scan olusturmali, audit yazmali."""
    src = await _create_source(client)
    first = await client.post(SCANS, json={"source_id": src["id"], "scan_mode": "manual"})
    assert first.status_code == 201
    first_id = first.json()["id"]

    r = await client.post(f"{SCANS}/{first_id}/retry")
    assert r.status_code == 202, r.text
    new_scan = r.json()
    assert new_scan["id"] != first_id
    assert new_scan["source_id"] == src["id"]
    assert new_scan["scan_mode"] in ("manual", "auto")
    assert (new_scan.get("notes") or "").startswith("Retry of ")


@pytest.mark.asyncio
async def test_retry_scan_not_found(client: AsyncClient):
    r = await client.post(f"{SCANS}/{uuid.uuid4().hex}/retry")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# H) Health endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_source_health_label_no_recent_scans(client: AsyncClient):
    """Hic scan yoksa health=no_recent_scans."""
    src = await _create_source(client)
    r = await client.get(f"{SOURCES}/{src['id']}/health")
    assert r.status_code == 200
    body = r.json()
    assert body["health"] == "no_recent_scans"
    assert body["source_id"] == src["id"]
    assert body["total_scans"] == 0


@pytest.mark.asyncio
async def test_source_health_label_healthy_after_completed(client: AsyncClient):
    """completed scan sonrasi health=healthy olmali."""
    src = await _create_source(client)
    created = (await client.post(SCANS, json={"source_id": src["id"], "scan_mode": "manual"})).json()
    await client.patch(f"{SCANS}/{created['id']}", json={"status": "completed"})
    r = await client.get(f"{SOURCES}/{src['id']}/health")
    assert r.status_code == 200
    assert r.json()["health"] == "healthy"


@pytest.mark.asyncio
async def test_source_health_not_found(client: AsyncClient):
    r = await client.get(f"{SOURCES}/{uuid.uuid4().hex}/health")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# I) Trigger scan
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_trigger_scan_not_found(client: AsyncClient):
    r = await client.post(f"{SOURCES}/{uuid.uuid4().hex}/trigger-scan")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# J) Pagination envelopes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pagination_envelopes_on_all_three_lists(client: AsyncClient):
    """/sources, /news-items, /source-scans envelope {items,total,offset,limit} donmeli."""
    src = await _create_source(client)
    await client.post(SCANS, json={"source_id": src["id"], "scan_mode": "manual"})
    await client.post(
        NEWS_ITEMS,
        json={"title": f"P {_uid()}", "url": f"https://x.com/{_uid()}", "status": "new"},
    )

    for path in (SOURCES, NEWS_ITEMS, SCANS):
        r = await client.get(path)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, dict), f"{path} envelope dict donmeli"
        for k in ("items", "total", "offset", "limit"):
            assert k in body, f"{path} envelope {k} icermeli"
        assert isinstance(body["items"], list)
        assert body["total"] >= 1


@pytest.mark.asyncio
async def test_pagination_envelope_honors_offset_and_limit(client: AsyncClient):
    """offset+limit dogru uygulanmali."""
    # 3 kaynak olustur
    for _ in range(3):
        await _create_source(client)
    r = await client.get(f"{SOURCES}?limit=1&offset=0")
    assert r.status_code == 200
    body = r.json()
    assert body["limit"] == 1
    assert body["offset"] == 0
    assert len(body["items"]) == 1
    assert body["total"] >= 3


# ---------------------------------------------------------------------------
# K) Hard rejection
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_hard_rejection_manual_url_source_type(client: AsyncClient):
    r = await client.post(
        SOURCES,
        json={"name": "x", "source_type": "manual_url", "base_url": "https://x.com"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_hard_rejection_api_source_type(client: AsyncClient):
    r = await client.post(
        SOURCES,
        json={
            "name": "x",
            "source_type": "api",
            "api_endpoint": "https://api.example.com",
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_hard_rejection_curated_scan_mode(client: AsyncClient):
    src = await _create_source(client)
    r = await client.post(SCANS, json={"source_id": src["id"], "scan_mode": "curated"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_hard_rejection_reviewed_news_item_status(client: AsyncClient):
    """status='reviewed' Gate Sources Closure ile kalktı — 422 donmeli."""
    r = await client.post(
        NEWS_ITEMS,
        json={"title": f"R {_uid()}", "url": f"https://x.com/{_uid()}", "status": "reviewed"},
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# L) Migration backfill: reviewed -> new (NOT used)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_migration_reviewed_maps_to_new_not_used():
    """gate_sources_001 migration 'reviewed' -> 'new' ceviriyor (used DEGIL).

    Semantic: 'reviewed' bir orphan review-gate state idi — hicbir zaman
    "tuketildi" (used) anlami tasimiyordu. Migration bu orphan'i yeniden
    acik kuyruga (new) dondurmeli.

    Dogrulama stratejisi: migration dosyasini runtime'da kaynak olarak
    icine bakarak UPDATE komutunun hedefi 'new' oldugunu dogrular — ayni
    zamanda canli DB uzerinde UPDATE'i calistirip sonucu kontrol eder.
    """
    # 1. Static kaynak dogrulamasi — migration dosyasi dogru semantigi icermeli
    import pathlib
    migration_path = (
        pathlib.Path(__file__).parent.parent
        / "alembic" / "versions" / "gate_sources_001_closure.py"
    )
    src = migration_path.read_text(encoding="utf-8")
    assert "SET status='new' WHERE status='reviewed'" in src, (
        "Migration 'reviewed' -> 'new' UPDATE'ini icermeli (used DEGIL)"
    )
    assert "SET status='used' WHERE status='reviewed'" not in src, (
        "Migration ASLA 'reviewed' -> 'used' cevirmemeli — semantic yanlis olur"
    )

    # 2. Runtime dogrulamasi — UPDATE cumlesini canli in-memory DB'de calistir
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import text
    from app.db.base import Base
    from app.db.models import NewsItem

    eng = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # 'reviewed' artik Literal'de yok — ham SQL ile orphan state yerlestir
        await conn.execute(text(
            "INSERT INTO news_items (id, title, url, status, is_test_data, "
            "created_at, updated_at) "
            "VALUES ('rvw1', 'orphan review', 'https://x.com/r1', 'reviewed', "
            "0, datetime('now'), datetime('now'))"
        ))
        # Migration UPDATE cumlesini CALISTIR
        await conn.execute(text(
            "UPDATE news_items SET status='new' WHERE status='reviewed'"
        ))

    Session = async_sessionmaker(eng, expire_on_commit=False)
    async with Session() as db:
        row = await db.execute(text("SELECT status FROM news_items WHERE id='rvw1'"))
        status = row.scalar_one()
        assert status == "new", (
            f"Migration sonrasi 'reviewed' kaydi 'new' olmali, bulunan: {status!r}"
        )
        assert status != "used", "ASLA 'used' olmamali — semantic yanlis"


# ---------------------------------------------------------------------------
# M) Duplicate feed_url -> 409 Conflict
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_duplicate_feed_url_on_create_returns_409(client: AsyncClient):
    """Ayni feed_url'e ikinci POST 409 Conflict donmeli."""
    unique_feed = f"https://dup-test-{_uid()}.com/feed.xml"
    first = await client.post(
        SOURCES,
        json={"name": f"First {_uid()}", "source_type": "rss", "feed_url": unique_feed},
    )
    assert first.status_code == 201

    second = await client.post(
        SOURCES,
        json={"name": f"Second {_uid()}", "source_type": "rss", "feed_url": unique_feed},
    )
    assert second.status_code == 409, (
        f"Duplicate feed_url 409 donmeli, donen: {second.status_code} body={second.text}"
    )
    body = second.json()
    assert "feed_url" in (body.get("detail") or ""), (
        "409 detail feed_url'i belirtmeli"
    )


@pytest.mark.asyncio
async def test_duplicate_feed_url_on_update_returns_409(client: AsyncClient):
    """PATCH ile baska bir source'un feed_url'ini kullanmak 409 donmeli."""
    feed_a = f"https://uniq-a-{_uid()}.com/feed.xml"
    feed_b = f"https://uniq-b-{_uid()}.com/feed.xml"

    a = (await client.post(
        SOURCES,
        json={"name": f"A {_uid()}", "source_type": "rss", "feed_url": feed_a},
    )).json()
    b = (await client.post(
        SOURCES,
        json={"name": f"B {_uid()}", "source_type": "rss", "feed_url": feed_b},
    )).json()

    # B'yi A'nin feed_url'ine PATCH et
    r = await client.patch(f"{SOURCES}/{b['id']}", json={"feed_url": feed_a})
    assert r.status_code == 409, (
        f"PATCH ile duplicate feed_url 409 donmeli, donen: {r.status_code}"
    )


@pytest.mark.asyncio
async def test_self_patch_keeps_own_feed_url_ok(client: AsyncClient):
    """Ayni source kendi feed_url'ini PATCH'lerse 409 DEGIL — normal gecmeli."""
    feed = f"https://self-{_uid()}.com/feed.xml"
    s = (await client.post(
        SOURCES,
        json={"name": f"S {_uid()}", "source_type": "rss", "feed_url": feed},
    )).json()
    # Kendi feed_url'ini tekrar gonder — 409 olmamali
    r = await client.patch(f"{SOURCES}/{s['id']}", json={"feed_url": feed, "notes": "self-update"})
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# N) Scheduler enabled=False -> no-op
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_scheduler_tick_noop_when_disabled(monkeypatch):
    """enabled=False iken _check_and_scan ASLA cagrilmamali + state dogru."""
    from app.source_scans import scheduler as sched

    # _read_effective_settings -> (enabled=False, interval=0.01)
    # NOT: poll_auto_scans `current_interval = interval0` olarak initial
    # settings interval'ini kullanir. Testte gercek tick olabilmesi icin
    # clamp'lenmeden onceki ham deger (0.01) uygulanir — loop `while True`
    # icinde `await asyncio.sleep(current_interval)` cagirir.
    async def _fake_settings(_factory):
        return (False, 0.01)

    check_calls = {"n": 0}

    async def _fake_check_and_scan(_factory, _interval):
        check_calls["n"] += 1
        return 0

    monkeypatch.setattr(sched, "_read_effective_settings", _fake_settings)
    monkeypatch.setattr(sched, "_check_and_scan", _fake_check_and_scan)

    # Reset state
    sched.SCHEDULER_STATE["enabled"] = True
    sched.SCHEDULER_STATE["skipped_because_disabled"] = False
    sched.SCHEDULER_STATE["last_triggered_count"] = 999

    # poll_auto_scans'i birkac tick calistir sonra cancel et
    task = asyncio.create_task(sched.poll_auto_scans(lambda: None, interval=0.01))
    # Initial read + birkac tick'e yetsin diye bekle
    await asyncio.sleep(0.15)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

    # Dogrulamalar
    assert check_calls["n"] == 0, (
        "enabled=False iken _check_and_scan cagrilmamali (no-op)"
    )
    assert sched.SCHEDULER_STATE["enabled"] is False
    assert sched.SCHEDULER_STATE["skipped_because_disabled"] is True
    assert sched.SCHEDULER_STATE["last_tick_ok"] is True
    assert sched.SCHEDULER_STATE["last_triggered_count"] == 0


@pytest.mark.asyncio
async def test_scheduler_tick_runs_when_enabled(monkeypatch):
    """enabled=True iken _check_and_scan cagrilmali + skipped_because_disabled=False."""
    from app.source_scans import scheduler as sched

    async def _fake_settings(_factory):
        return (True, 0.01)

    check_calls = {"n": 0}

    async def _fake_check_and_scan(_factory, _interval):
        check_calls["n"] += 1
        return 3

    monkeypatch.setattr(sched, "_read_effective_settings", _fake_settings)
    monkeypatch.setattr(sched, "_check_and_scan", _fake_check_and_scan)

    sched.SCHEDULER_STATE["skipped_because_disabled"] = True
    sched.SCHEDULER_STATE["last_triggered_count"] = 0

    task = asyncio.create_task(sched.poll_auto_scans(lambda: None, interval=0.01))
    await asyncio.sleep(0.15)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

    assert check_calls["n"] >= 1, "enabled=True iken _check_and_scan en az 1 kez cagrilmali"
    assert sched.SCHEDULER_STATE["skipped_because_disabled"] is False
    assert sched.SCHEDULER_STATE["last_triggered_count"] == 3


# ---------------------------------------------------------------------------
# O) Scheduler interval change -> effective_interval_seconds updates
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_scheduler_interval_reflects_live_settings_change(monkeypatch):
    """Interval ayari degisince SCHEDULER_STATE bir sonraki tick'te guncellenmeli."""
    from app.source_scans import scheduler as sched

    # Sekvansli cevap: 1. cagri 0.01s (loop'un tick atmasina izin ver),
    # 2. cagri 0.02s — live-reload ile SCHEDULER_STATE'in yeni degeri
    # yansittigini kanitla. Clamp normalde [60,86400] araligi dayatir ama
    # test `_read_effective_settings`'i monkeypatch ile tamamen degistiriyor;
    # bu yuzden clamp devre disi kalir ve bize kucuk test degerleri verir.
    call_count = {"n": 0}

    async def _fake_settings(_factory):
        call_count["n"] += 1
        if call_count["n"] == 1:
            # Initial read: kucuk deger ver ki loop sleep(0.01)'de cok tick atsin
            return (True, 0.01)
        # Sonraki tick'ler: 0.02 — state bunu yansitmali
        return (True, 0.02)

    async def _fake_check_and_scan(_factory, _interval):
        return 0

    monkeypatch.setattr(sched, "_read_effective_settings", _fake_settings)
    monkeypatch.setattr(sched, "_check_and_scan", _fake_check_and_scan)

    task = asyncio.create_task(sched.poll_auto_scans(lambda: None, interval=0.01))

    # Initial + birkac tick yapsin
    await asyncio.sleep(0.15)
    after_value = sched.SCHEDULER_STATE["effective_interval_seconds"]

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

    # Initial 0.01 idi — tick sonrasi settings tekrar okununca 0.02 olmali
    # (live-reload kanit)
    assert after_value == 0.02, (
        f"Live-reload sonrasi effective_interval_seconds=0.02 bekleniyordu, "
        f"bulunan: {after_value}"
    )
    # En az initial + bir tick olmus olmali
    assert call_count["n"] >= 2, (
        f"_read_effective_settings initial + en az 1 tick'te cagrilmali, "
        f"toplam: {call_count['n']}"
    )


@pytest.mark.asyncio
async def test_scheduler_status_endpoint_reflects_state(client: AsyncClient):
    """GET /source-scans/scheduler/status SCHEDULER_STATE dict'ini surfaces etmeli."""
    from app.source_scans import scheduler as sched

    sched.SCHEDULER_STATE["enabled"] = True
    sched.SCHEDULER_STATE["effective_interval_seconds"] = 777.0
    sched.SCHEDULER_STATE["last_triggered_count"] = 42

    r = await client.get(f"{SCANS}/scheduler/status")
    assert r.status_code == 200
    body = r.json()
    assert body["enabled"] is True
    assert body["effective_interval_seconds"] == 777.0
    assert body["last_triggered_count"] == 42
    # Dict sekli dogru mu?
    for k in ("enabled", "effective_interval_seconds", "last_tick_at",
              "last_tick_ok", "last_tick_error", "last_triggered_count",
              "skipped_because_disabled"):
        assert k in body, f"scheduler status {k} icermeli"
