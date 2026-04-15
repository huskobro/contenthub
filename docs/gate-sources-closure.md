# Gate Sources Closure (S1–S8)

Tarih: 2026-04-15
Durum: **Tamamlandi**
Kapsam: News source / ingestion / news-item acquisition katmanini operasyonel son urun kalitesine tasiyan kapatma gate'i. RSS tek kaynak tipi haline geldi, shell source tipleri (manual_url, api) sert 422 ile reddediliyor; news_items status ucgeni (new/used/ignored) tamamlandi; user surface ayri bir news-picker sayfasina tasindi; otomatik tarama ve retention arka plan gorevleri Settings Registry'den yonetiliyor; OG scrape SSRF/throttle guardrail'leri ve retry/health cikislari eklendi.

---

## 1. Kapatilan Maddeler

| # | Madde | Ad | Durum |
|---|-------|-----|-------|
| S1 | Auto scan settings wire | `source_scans.scheduler` enabled + interval ayarlarini Settings Registry'den her tick'te yeniden okur; kill-switch anlik etkili | Tamam |
| S2 | N+1 ve pagination | `/sources`, `/news-items`, `/source-scans` listelerinde N+1 temizlendi; envelope `{items,total,offset,limit}` | Tamam |
| S3 | Audit kapsami | `source_scan.execute/retry`, `source.create/update/delete/trigger_scan`, `news_item.*`, `used_news.*` audit log entry'leri | Tamam |
| S4 | Shell cleanup + migration | `source_type` artik Literal['rss']; `scan_mode` Literal['manual','auto']; `news_item.status` Literal['new','used','ignored']; `feed_url` partial UNIQUE index (migration `ec8a1f0b2c4d`) | Tamam |
| S5 | Retention + rolling dedupe window | `poll_retention` arka plan task; 7 yeni KNOWN_SETTINGS; `_load_existing_items` window-gated | Tamam |
| S6 | OG scrape guardrails | SSRF guard (private/loopback reddi), per-host throttle, settings-gated; `/sources/{id}/trigger-scan`, `/sources/{id}/health`, `/source-scans/{id}/retry`, `/source-scans/scheduler/status` | Tamam |
| S7 | User surface + trust breakdown | `/user/news-picker` sayfasi (ayri, admin redirect YOK); trust_level low/medium/high ayri davranis + `trust_breakdown` dict + `medium_trust_items` listesi | Tamam |
| S8 | Test + docs | `test_gate_sources_closure.py` (28 test) + mevcut API test dosyalarinin envelope/literal uyumlandirmasi + bu kapatma dokumani | Tamam |

Kapsam disi (bilincli ertelendi):
- **Semantic dedupe** (embedding tabanli benzerlik) — Gate sonrasi asama.
- **Source discovery UX** — admin icin kesif aramasi; bu Gate ingestion'i kapatir, kesif ayri.
- **Health webhook'lari** — unhealthy kaynak icin alerting; mevcut admin inbox zaten surface aliyor.

---

## 2. Backend Degisiklikleri

### 2.1 Scheduler ve Retention

**`backend/app/source_scans/scheduler.py`**
- Arka plan task `poll_auto_scan_scheduler`; her tick'te Settings Registry'den `source_scans.auto_scan.enabled`, `source_scans.auto_scan.interval_seconds` okur.
- `SCHEDULER_STATE` dict: `enabled`, `effective_interval_seconds`, `last_tick_at/ok/error`, `last_triggered_count`, `skipped_because_disabled`.
- `/source-scans/scheduler/status` endpoint'i bu state'i doner (log tailing gerekmeden dogrulama).

**`backend/app/source_scans/retention.py`** (YENI, 193 LoC)
- `poll_retention(db_session_factory, initial_poll_interval)`: arka plan sweeper.
- `_run_sweep(news_days, scan_days)`:
  1. Expired NewsItem sil — AMA `used_news_registry.news_item_id` ile referansli olanlar KORUNUR (publish provenance).
  2. Expired SourceScan'lere bagli NewsItem'larin `source_scan_id`'sini NULL'a cek (detach).
  3. Expired SourceScan'leri sil.
- `RETENTION_STATE` dict: enabled, interval, news_item_retention_days, source_scan_retention_days, last sweep summary.

**`backend/app/main.py`**
- Lifespan icinde `retention_task = asyncio.create_task(poll_retention(...))` eklendi.
- Shutdown path'inde `auto_scan_task` yaninda `retention_task` da cancel ediliyor.

### 2.2 Settings Registry (7 yeni KNOWN_SETTINGS)

**`backend/app/settings/settings_resolver.py`**

| Key | Default | Clamp | Wired_to |
|-----|---------|-------|----------|
| `news_items.soft_dedupe_window_days` | 30 | [1,365] | `source_scans.scan_engine._load_existing_items` |
| `news_items.retention.enabled` | True | — | `source_scans.retention.poll_retention` |
| `news_items.retention.days` | 180 | [7,3650] | `source_scans.retention.poll_retention` |
| `source_scans.retention.days` | 90 | [1,3650] | `source_scans.retention.poll_retention` |
| `source_scans.retention.poll_interval_seconds` | 3600 | [300,86400] | `source_scans.retention.poll_retention` |
| `source_scans.og_scrape_enabled` | True | — | `source_scans.scan_engine._scrape_og_image` |
| `source_scans.og_scrape_min_interval_seconds` | 5 | [1,60] | `source_scans.scan_engine._scrape_og_image` |

`KNOWN_VALIDATION_RULES` icinde her sayisal key icin `min/max` sinirlari tanimli — runtime clamp ek guvenlik.

### 2.3 OG Scrape Guardrails

**`backend/app/source_scans/scan_engine.py`**

- `_is_private_host(hostname) -> bool`: `ipaddress` + `socket.getaddrinfo` ile loopback/private/link-local/multicast/reserved/unspecified IPv4 ve IPv6 adreslerini reddediyor. Cozulemeyen hostname → unsafe (True).
- `_OG_LAST_FETCH: dict[str, float]`: module-local per-host throttle map.
- `_scrape_og_image(article_url)`:
  1. http(s) disi URL reject.
  2. Private host reject (SSRF).
  3. Per-host throttle (`source_scans.og_scrape_min_interval_seconds`) kontrolu.
  4. Urlopen (8s timeout, 100KB limit), og:image / twitter:image meta parse.
  5. Her hata yutulur → None (asla raise etmez).
- `_og_scrape_settings(db)`: `source_scans.og_scrape_enabled` + min interval'i Settings Registry'den okur.
- `execute_rss_scan()` icinde `setattr(normalize_entry, "_og_scrape_enabled", og_scrape_enabled)` ile enable/disable runtime gate'i uygulaniyor.

### 2.4 HTTP Surface

**`backend/app/sources/router.py`**
- `GET /sources` — envelope: `{items, total, offset, limit}` (offset/limit query params).
- `GET /sources/{id}/health` — son 7 gun icindeki scan ozetinden health label `{healthy, degraded, unhealthy, no_recent_scans, unknown}` ve `last_scan_status/error/finished_at` dondurur.
- `POST /sources/{id}/trigger-scan` — admin "Scan now" butonu: manual scan olusturur, inline calistirir, audit: `source.trigger_scan`. Non-RSS kaynaklar 422.
- `POST/PATCH/DELETE /sources` — audit kapsami (`source.create/update/delete`).

**`backend/app/source_scans/router.py`**
- `GET /source-scans/scheduler/status` — scheduler state surface.
- `GET /source-scans` — envelope.
- `POST /source-scans/{id}/execute` — artik audit entry'ye outcome (status, fetched_count, new_count, skipped_dedupe, error_summary, allow_followup) yaziyor.
- `POST /source-scans/{id}/retry` — yeni queued scan + inline execute; audit: `source_scan.retry` (`retried_from`, `source_id` detay'da). Original scan silinmez, history korunur.

**`backend/app/news_items/router.py`**
- Envelope + pagination.
- Status Literal enforcement (`new`/`used`/`ignored`). Baska deger → 422.
- Audit: `news_item.create/update/delete/ignore/use`.

**`backend/app/used_news_registry/router.py`**
- Audit: `used_news.create/update/delete`.

### 2.5 Migration

**`backend/app/db/migrations/versions/ec8a1f0b2c4d_gate_sources_closure_shell_cleanup.py`**
- `feed_url` icin partial UNIQUE index: `WHERE feed_url IS NOT NULL` (SQLite uyumlu, `_index_exists` idempotency guard).
- `news_items.status` icin check-style normalizasyon (Python katmaninda Literal; veri satirlari icin tek seferlik `UPDATE` ile `reviewed` → `used` tasima).
- Downgrade path mevcut — partial index dropped, status backfill geri alinabilir (best-effort).

### 2.6 Trust Enforcement (low/medium/high distinct)

**`backend/app/modules/news_bulletin/service.py::check_trust_enforcement`**
- Return:
  ```python
  {
    "pass": bool,
    "enforcement_level": str,
    "low_trust_items": [...],
    "medium_trust_items": [...],          # YENI
    "trust_breakdown": {                   # YENI
      "low": int, "medium": int, "high": int, "unknown": int
    },
    "total_checked": int,
    "message": str,
  }
  ```
- Davranis:
  - `low` → her zaman flaglenir (warn altinda uyari, block altinda block).
  - `medium` → her zaman attention listesine eklenir; block ETMEZ.
  - `high` → clean, hic bir listede gorunmez.
  - `unknown` → konservatif (low gibi davranir, `low_trust_items`'a dusulur).

**`backend/app/modules/news_bulletin/router.py::TrustCheckResponse`** — `medium_trust_items` + `trust_breakdown` alanlari surface'de.

---

## 3. Frontend Degisiklikleri

### 3.1 User Surface — `/user/news-picker` (YENI)

**`frontend/src/pages/user/UserNewsPickerPage.tsx`** (330+ LoC)
- URL query: `bulletinId`, `channelProfileId`, `contentProjectId`.
- Bulletin yoksa guided creation CTA → existing wizard.
- Source + category filtresi (React Query ile `/news-items`).
- Max 12 haber secim UI; `TrustPanel` alt komponenti `trust_breakdown` dagilimi ve renkli pill'ler.
- "Production'a Baslat" → `/source-scans` veya `/jobs` API cagrisi (mevcut engine).
- Admin redirect KALDIRILDI — `CreateBulletinWizardPage.tsx` artik buraya yonlendiriyor.

**`frontend/src/app/router.tsx`** — `news-picker` route'u `/user` subtree'ye eklendi.

### 3.2 API Client Guncellemeleri

**`frontend/src/api/sourcesApi.ts`** (rewrite)
- `SourceResponse`: `reviewed_news_count` KALKTI; `last_scan_error`, `consecutive_failure_count` eklendi.
- `SourceListResponse` envelope tipi.
- `fetchSourceHealth`, `triggerSourceScan` yeni fonksiyonlar.

**`frontend/src/api/sourceScansApi.ts`** (rewrite)
- `SourceScanResponse`: `reviewed_news_count_from_scan` KALKTI.
- `SourceScanListResponse` envelope tipi.
- `retrySourceScan`, `fetchScanSchedulerStatus` yeni fonksiyonlar.

### 3.3 Hook Davranisi (geri uyumlu)

**`frontend/src/hooks/useSourcesList.ts`, `useSourceScansList.ts`**
- Default hook `items` dizisini cikarip donduruyor — mevcut consumer'lar degismiyor.
- `useXxxListPaginated` varyantlari envelope'a dogrudan erisim gerekirse kullaniliyor.

### 3.4 Support Komponentleri

**`frontend/src/components/sources/SourceTargetOutputConsistencySummary.tsx`**
- `reviewedNewsCount` parametresi `@deprecated` olarak isaretli (geri uyumluluk; Gate sonrasi kaldirilacak).

---

## 4. Test Sonuclari

### 4.1 Backend

**`backend/tests/test_gate_sources_closure.py`** (YENI, 28 test)
- KNOWN_SETTINGS registration + resolve defaults (2)
- Retention sweep: deletion + referenced preservation + scan detach (2)
- Rolling dedupe window filtering (1)
- OG SSRF guard — 7 parametric + 1 private URL (8)
- OG per-host throttle (1)
- Trust breakdown: low/medium/high counts + block-only-on-low (2)
- Retry endpoint + 404 (2)
- Health endpoint: no_recent_scans / healthy / 404 (3)
- Trigger scan 404 (1)
- Pagination envelope on all 3 lists + offset/limit (2)
- Hard rejection: manual_url, api, curated, reviewed (4)

**Uyumlandirilan mevcut testler:**
- `test_sources_api.py` — 15 test (manual_url/api shell'leri 422'ye cevrildi, envelope, filter).
- `test_source_scans_api.py` — 14 test (envelope, filter).
- `test_news_items_api.py` — 14 test (envelope, `reviewed` → `used`).
- `test_news_bulletin_selected_items_api.py` — 8 test (`_create_news_item` helper status `pending` → `new`).

**Sonuc:** 79/79 in-scope test gecti. Full suite: 1827/1866 (39 failure tumu pre-existing auth/oauth/m7/sprint; Gate kapsami disinda — MEMORY.md'de not edildi).

### 4.2 Frontend

- `npm run build` + `tsc --noEmit` (S7 sirasinda yapilandi): EXIT 0.
- Hook unwrap sayesinde mevcut consumer sayfalari (SourcesRegistryPage, SourceScansRegistryPage, NewsBulletinWizardPage) degismeden calisti.

---

## 5. Dogrulamalar

### 5.1 Scheduler Settings Wire

`source_scans.scheduler.poll_auto_scan_scheduler` her tick'te:
```python
raw_enabled = await _resolve("source_scans.auto_scan.enabled", db)
raw_interval = await _resolve("source_scans.auto_scan.interval_seconds", db)
```
`SCHEDULER_STATE["effective_interval_seconds"]` degeri settings degisince bir sonraki tick'te guncelleniyor; `enabled=False` ise tick `skipped_because_disabled=True` ile sessizce atlaniyor. `GET /source-scans/scheduler/status` bu state'i dogrudan surfaces.

### 5.2 User Redirect

`frontend/src/pages/user/CreateBulletinWizardPage.tsx`:
```typescript
navigate(`/user/news-picker?bulletinId=${bulletin.id}`)
```
Admin surface'ine hicbir `/admin` yonlendirmesi yok. `UserNewsPickerPage` kendi secim + production trigger'ini hallediyor.

### 5.3 Retry / Health / Audit

- Retry: `test_retry_scan_creates_new_queued_scan_for_same_source` — yeni scan id'nin `source_id`'si ve `notes.startswith("Retry of ")`'i dogruluyor.
- Health: `test_source_health_label_no_recent_scans`, `test_source_health_label_healthy_after_completed` — label transition'i dogruluyor.
- Audit: `source_scan.retry`, `source.trigger_scan`, `source_scan.execute` (outcome detayiyla), `news_item.ignore/use`, `used_news.create/update/delete` — her mutation'da `write_audit_log` cagrisi mevcut.

### 5.4 Retention / Rolling Window

- Retention: `test_retention_sweep_deletes_expired_news_items` — referenced NewsItem korunuyor, referanssiz siliniyor. `test_retention_sweep_detaches_scan_link_before_delete` — NewsItem.source_scan_id NULL'lanip SourceScan siliniyor.
- Rolling window: `test_rolling_dedupe_window_filters_old_items` — window=30 → 60 gunluk item dedupe havuzuna dahil degil; window=None → tum kayitlar donuyor.

---

## 6. Migration Ozeti

**Migration id:** `ec8a1f0b2c4d_gate_sources_closure_shell_cleanup`

**Degisiklikler:**
1. `news_sources.feed_url` uzerinde partial UNIQUE index (`WHERE feed_url IS NOT NULL`). `_index_exists` idempotency guard.
2. `news_items.status` veri normalizasyonu: `reviewed` → `used` (tek seferlik backfill).
3. SourceScan / NewsItem Literal enforcement veri tabani seviyesine degil Pydantic katmanina (SQLite CHECK yerine uygulama katmani tercih edildi — daha taninabilir hata mesajlari).

**Downgrade:** partial index drop edilir; status backfill geri alinmaz (veri kaybi onleme).

**Fresh DB koşusu:** `alembic upgrade head` → boş DB uzerinde EXIT 0 (MEMORY.md feedback_alembic_migration_discipline disiplini).

---

## 7. Commit Listesi

Son commit grubu (bu Gate'in tamamlayicisi):
- (a) S1 scheduler settings wire
- (b) S2+S3 envelope + N+1 + audit kapsami (backend code)
- (c) S4 migration ISOLATED (tek commit, tek migration dosyasi + model/schema guncellemesi)
- (d) S5 retention + rolling window + 7 KNOWN_SETTINGS
- (e) S6 OG guardrails + retry + health
- (f) S7 user news-picker + trust breakdown
- (g) S8 tests (closure + uyumlandirma)
- (h) Bu dokuman (ISOLATED, tek commit)

Push durumu: `origin/main` — uzak kosulum mevcut authentication ile calisirsa push edilir.

---

## 8. Bilinen Sinirlar

- **OG scrape throttle:** `time.monotonic()` process-relative oldugundan, test fresh process'te ilk cagri da throttle gibi gorunebilir. Production'da scan interval > 5sn oldugundan bu pratik olarak etkili degil; testte throttle haritasi onceden doldurularak dogrulandi.
- **Migration:** partial UNIQUE index SQLite WAL modunda sorunsuz; Postgres/MySQL'e tasinma durumunda index syntax'i dialect'e gore revize edilecek.
- **Trust level unknown:** `source.trust_level` None ise "low" gibi davranir (konservatif). Admin trust level'i atayana kadar source unbulletin edilmemeli — bu kaniti onaylayan uyari wizard'a eklenebilir (sonraki gate).
- **Scheduler shutdown:** `retention_task` ve `auto_scan_task` shutdown'da cancel ediliyor; ancak sweep ortasinda DB transaction'i varsa commit olmadan dusebilir — sweep her donguden bagimsiz idempotent oldugundan bir sonraki tick'te tekrar calisiyor.

---

## 9. Test Calistirma Notlari

```
cd backend
.venv/bin/python3 -m pytest tests/test_gate_sources_closure.py -v
.venv/bin/python3 -m pytest tests/test_sources_api.py tests/test_source_scans_api.py tests/test_news_items_api.py tests/test_news_bulletin_selected_items_api.py -v
```

Beklenen: 79 passed. Frontend build: `cd frontend && npm run build`.
