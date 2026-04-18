# Gate 4 — Publish Closure (Z-1 / Z-2 / Z-3 / Z-4 / Z-5)

Tarih: 2026-04-15
Durum: **Tamamlandi**
Kapsam: Publish layer'i operasyonel kapatma; bulk islemler, review queue, scheduler health, token pre-flight, hata kategorize.

---

## 1. Kapatilan Maddeler

| # | Madde | Adi | Durum |
|---|-------|-----|-------|
| Z-1 | Bulk Aksiyonlari | Approve / Reject / Cancel / Retry (per-record sonuclar) | Tamam |
| Z-2 | Review Queue | `/admin/publish/review` ozel sayfa, sadece pending_review | Tamam |
| Z-3 | Scheduler Health | In-memory snapshot + `/publish/scheduler/status` + UI badge | Tamam |
| Z-4 | Token Pre-flight | Non-aggressive expiry kontrolu + scheduler skip + UI badge | Tamam |
| Z-5 | Hata Triage | `last_error_category` enum + UI chip + filtre | Tamam |

---

## 2. Backend Degisiklikleri

### 2.1 Schema / Migration
- Yeni Alembic revision: `gate4_001` — `publish_records.last_error_category` kolonu (NOT NULL degil, error siniflandirma metni).
- Idempotent guard: kolon zaten varsa atlar.
- Downgrade -1 sadece kolonu siler (tablo silmez).

### 2.2 Yeni / Degisen Modeller
- `publish_records.last_error_category: str | None`
- `PublishRecordRead`, `PublishRecordSummary` schema'lara `last_error_category` eklendi.
- `PublishListParams` icin `error_category` filtre parametresi eklendi.

### 2.3 Yeni Servisler
- `app.publish.error_classifier.categorize_publish_error(message, exc=None) -> str`
  - Pattern-based: token / quota_exceeded / network / validation / permission / asset_missing / unknown
  - Exception class adina da bakar (HTTPError, RequestError vb).
- `app.publish.bulk_service` — per-record sub-transaction pattern, partial-fail toleranslı.
  - `bulk_approve(record_ids, session_factory)`
  - `bulk_reject(record_ids, rejection_reason, session_factory)` — reason bos ise reddeder.
  - `bulk_cancel(record_ids, session_factory)`
  - `bulk_retry(record_ids, session_factory)`
  - Her record kendi session'unda calisir; biri patlarsa digerleri etkilenmez.
  - Dedup: ayni `record_id` listede bircok kez verilse bile bir kez islenir.
- `app.publish.token_preflight`
  - `classify_token_expiry(connection) -> TokenExpiryStatus` — pure function, hem backend hem UI esik paylasimi icin.
  - `assert_publish_token_ready(connection)` — sadece `requires_reauth=True` ise blocking; `expired` + refresh_token varsa self-healing geçerlidir.
  - `suggested_action_for_severity(severity)` — operator dostu Türkçe metinler.
- `app.publish.scheduler.snapshot_scheduler_status(state)` — pure, in-memory snapshot:
  - state: `healthy` | `stale` | `unknown`
  - Alanlar: `last_tick_at`, `last_due_count`, `last_triggered_count`, `last_skipped_count`, `interval_seconds`, `consecutive_errors`, `last_error`, `total_skipped`.
  - DB tablosu yok (Decision 2: in-memory `app.state`).

### 2.4 Yeni Endpoints
| Method | Path | Aciklama |
|--------|------|----------|
| POST | `/publish/bulk/approve` | Bulk approve (per-record sonuc) |
| POST | `/publish/bulk/reject` | Bulk reject (rejection_reason zorunlu) |
| POST | `/publish/bulk/cancel` | Bulk cancel |
| POST | `/publish/bulk/retry` | Bulk retry |
| GET | `/publish/scheduler/status` | Scheduler health snapshot |
| GET | `/publish/connections/{id}/token-status` | Connection token expiry |

### 2.5 Scheduler Loop Degisiklikleri
- `_check_and_trigger` artık `(triggered, due, skipped)` 3'lu doner (eskiden tek int).
- Her loop tick'inde `app.state` snapshot guncellenir (interval, last_tick_at, counts).
- Token pre-flight non-aggressive: sadece `requires_reauth=True` ise record skip + `publish.scheduler.skip_reauth` audit log.

### 2.6 State Machine Disiplini
- Bulk endpoints'lar PublishStateMachine'i bypass etmez.
- Her per-record islem standart `submit_for_review`/`review_action`/`cancel_publish`/`retry_publish` servis fonksiyonlarini cagirir.
- Audit log'lar `write_audit_log` flush-only semantic'ine uygun, caller commit eder (Gate 3A dersi).

---

## 3. Frontend Degisiklikleri

### 3.1 Yeni / Guncellenen Tipler (`api/publishApi.ts`)
- `BulkActionItemResult { record_id, ok, error?, from_status?, to_status? }`
- `BulkActionResponse { succeeded, failed, results }`
- `BulkActionBody { record_ids }`, `BulkRejectBody { record_ids, rejection_reason }`
- `SchedulerHealth { state, last_tick_at, last_due_count, last_triggered_count, last_skipped_count, interval_seconds, consecutive_errors, last_error, total_skipped }`
- `TokenStatus { severity, seconds_remaining, expires_at, requires_reauth, has_refresh_token, is_blocking, suggested_action }`
- `PublishRecord*` tiplerine `last_error_category: string | null` eklendi.
- `PublishListParams.error_category` opsiyonel filtre.

### 3.2 Yeni Hooks (`hooks/usePublish.ts`)
- `useBulkApprovePublishRecords()`, `useBulkRejectPublishRecords()`, `useBulkCancelPublishRecords()`, `useBulkRetryPublishRecords()` — invalidasyon dahil
- `useSchedulerHealth()` — 30s polling
- `useConnectionTokenStatus(connectionId)` — 60s staleTime

### 3.3 Yeni Components (`components/publish/`)
- `SchedulerHealthBadge.tsx` — color-coded dot, tooltip detayli, healthy/stale/unknown
- `PublishErrorChip.tsx` — kategori → Türkçe label + tip
- `TokenExpiryBadge.tsx` — severity badge, `hideWhenHealthy` opsiyonu

### 3.4 Yeni Sayfa
- `pages/admin/PublishReviewQueuePage.tsx` — `/admin/publish/review`
  - Sadece `status=pending_review` filtresi (lock).
  - Sadece Approve + Reject bulk aksiyonlari (Cancel/Retry burada anlam ifade etmez).
  - Reject icin `window.prompt` ile zorunlu reason girisi.
  - Detay icin paylasilan `/admin/publish/:id` sayfasina link.

### 3.5 Guncellenen Sayfalar
- **PublishCenterPage** — bulk selection, BulkActionBar, scheduler badge (header `actions`), error_category filtresi, PublishErrorChip status kolonunda.
- **PublishDetailPage** — "Hata Kategorisi" satiri PublishErrorChip ile.
- **AdminConnectionsPage** — yeni "Token" kolonu, TokenExpiryBadge.
- **BridgePublishCenterPage** — header'da SchedulerHealthBadge, failed kartlarda PublishErrorChip.

### 3.6 Router
- Yeni route: `/admin/publish/review` (VisibilityGuard `panel:publish`).

---

## 4. Test Sonuclari

### 4.1 Backend
- Yeni dosya: `backend/tests/test_gate4_publish_closure.py` — 42 test, hepsi pass.
  - TestErrorClassifier (11)
  - mark_failed/mark_published kategori temizleme (2)
  - TestSchedulerHealth (6)
  - TestTokenClassifier (10) — self-healing kuralı dahil
  - DB integration token_preflight (3)
  - Scheduler tick + pre-flight integration (3)
  - bulk_service per-record isolation + dedup (5)
- Mevcut publish suite: 31/31 pass
- M7 fresh DB migration: 9/9 pass (ALEMBIC_TARGET=`gate4_001` guncel)
- Toplam: 1797 test pass; 37 pre-existing failure (Gate 4 ile ilgisiz, MEMORY notuyla teyitli)

### 4.2 Frontend
- TypeScript: `tsc -p tsconfig.json` exit 0
- Build: `npm run build` exit 0 (sadece pre-existing chunk-size warning)
- Vitest delta:
  - Tek Gate-4 kaynakli kirilma: `bridge-legacy-fallback.smoke.test.tsx` — `usePublish` mock'u eksik bulk + scheduler hooks. Mock guncellendi, 4/4 pass.
  - Diger publish-adjacent (canvas-flow / sprint4) failure'lari `useDeleteChannelProfile` ile ilgili, pre-existing.

---

## 5. Mimarisel Kararlar

| # | Karar | Sebep |
|---|-------|-------|
| 1 | Bulk endpoint'ler ayri (NOT generic dispatcher) | State machine disiplini her endpoint'in kendi enforcer'iyla calismasini saglar; yanlislikla state-bypass riski dusuk. |
| 2 | Scheduler health DB'siz, in-memory `app.state` | Restart sonrasi healthy bilgisi anlamsizdir; persistans gerekirsiz. Ucuz, hizli, observable. |
| 3 | Token pre-flight non-aggressive | "Refresh token varsa expired blocking degildir" — operator gereksiz reauth talebi gormez. |
| 4 | Per-record sub-transaction | Bulk islemde bir record patladiginda digerlerini etkilemez; partial-fail UX gerceklesir. |
| 5 | Pure helper functions (`snapshot_scheduler_status`, `classify_token_expiry`) | Test edilebilirlik + UI/backend esik paylasimi. |
| 6 | Reject reason zorunlu | Audit trail kalitesi; "neden reddedildi" daima cevaplanabilir. |

---

## 6. Bilinen Sinirlar / Defer

- Bulk operasyon notification'i SSE'ye baglanmadi (gelecek polish).
- Token pre-flight mevcut sadece scheduler tick'inde; manuel "Yayinla" butonu pre-flight'a tabi degil — ileride eklenebilir.
- Scheduler health backend metricleri Prometheus'a aktarilmadi (ileride gerekli olabilir).
- BridgePublishCenterPage'de bulk toolbar yok — board view'da bulk anlamli olmaz; review queue ayri sayfa zaten saglandi.
- E2E (Playwright) testleri yok; vitest smoke yeterli kabul edildi.

---

## 7. Operator Notlari

### Bulk Approve / Reject Workflow
1. `/admin/publish` veya `/admin/publish/review` ac.
2. Tablo basinda checkbox ile kayitlari sec.
3. BulkActionBar'dan aksiyonu sec.
4. Reject icin prompt'a en az 1 karakterlik gerekce yaz.
5. Banner'da `X başarılı, Y başarısız` ozeti gor; partial-fail durumunda detay icin per-record API yaniti React Query cache'ine yazilir.

### Scheduler Health
- `/admin/publish` header'inda yesil/kirmizi nokta:
  - Yesil "Çalışıyor" — son tick taze.
  - Kirmizi "Donmuş olabilir" — son hata + `consecutive_errors > 0`.
  - Gri "Henüz tick atmadi" — process yeni baslatilmis.
- Tooltip'te `last_due / triggered / skipped (reauth) / interval` detayi.

### Token Pre-flight
- `/admin/connections` "Token" kolonu connection bazinda durum:
  - `ok` (yeşil), `warn`/`critical` (sari, sure delta gosterir), `expired` (gri, refresh_token self-healing), `reauth` (kirmizi, scheduler skip), `unknown` (gri).
- Sadece `reauth` durumunda scheduler o connection'in publish'lerini atlar; audit log: `publish.scheduler.skip_reauth`.

### Hata Triage
- `/admin/publish` sayfasinda "Hata" filtresi:
  - token_error / quota_exceeded / network / validation / permission / asset_missing / unknown
- Failed kayitlarda status kolonunda chip; hover ile tip.
- PublishDetailPage'de "Hata Kategorisi" + "Son Hata" ayri satirlar.

---

## 8. Degisen Dosyalar (Ozet)

### Backend
- `backend/alembic/versions/gate4_001_*.py` (yeni)
- `backend/app/publish/enums.py` (PublishErrorCategory enum)
- `backend/app/publish/error_classifier.py` (yeni)
- `backend/app/publish/bulk_service.py` (yeni)
- `backend/app/publish/token_preflight.py` (yeni / genisletildi)
- `backend/app/publish/scheduler.py` (snapshot + skip)
- `backend/app/publish/router.py` (bulk + status + token-status endpoints)
- `backend/app/publish/schemas.py` (yeni response shape'ler)
- `backend/app/publish/service.py` (mark_failed/mark_published kategori)
- `backend/app/db/models.py` (last_error_category)
- `backend/app/main.py` (scheduler init lifecycle)
- `backend/tests/test_gate4_publish_closure.py` (yeni, 42 test)
- `backend/tests/test_publish_scheduler_tick.py` (3-tuple)
- `backend/tests/test_m7_c1_migration_fresh_db.py` (gate4_001 target)

### Frontend
- `frontend/src/api/publishApi.ts` (tipler + bulk/scheduler/token client'lar)
- `frontend/src/hooks/usePublish.ts` (6 yeni hook)
- `frontend/src/components/publish/SchedulerHealthBadge.tsx` (yeni)
- `frontend/src/components/publish/PublishErrorChip.tsx` (yeni)
- `frontend/src/components/publish/TokenExpiryBadge.tsx` (yeni)
- `frontend/src/pages/admin/PublishCenterPage.tsx` (selection + bulk + badge + filter + chip)
- `frontend/src/pages/admin/PublishDetailPage.tsx` (chip integration)
- `frontend/src/pages/admin/PublishReviewQueuePage.tsx` (yeni)
- `frontend/src/pages/admin/AdminConnectionsPage.tsx` (token kolonu)
- `frontend/src/surfaces/bridge/BridgePublishCenterPage.tsx` (badge + chip)
- `frontend/src/app/router.tsx` (review queue route)
- `frontend/src/tests/bridge-legacy-fallback.smoke.test.tsx` (mock guncel)

---

## 9. Sonuc

Publish layer'i kapatildi: bulk islemleri partial-fail toleranslı, review queue ayri sayfaya tasindi, scheduler health 30s polling ile gorunur, token pre-flight non-aggressive (operatoru taciz etmez), failed publish'ler kategorize ve filtrelenebilir.

State machine disiplini, audit trail, snapshot-lock kurallari korundu. Yeni feature acilmadi; sadece publish layer'inin kapanisini guclendiren polish yapildi.
