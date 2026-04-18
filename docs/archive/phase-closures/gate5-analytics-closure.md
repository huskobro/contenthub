# Gate 5 — Analytics Closure (A1–G2)

Tarih: 2026-04-15
Durum: **Tamamlandi**
Kapsam: Analytics layer operasyonel kapatma; filtre dogrulugu (Hybrid B), YouTube admin view, CSV export, snapshot-lock netligi, audit log, julianday soyutlama, module breakdown, test + dokumantasyon.

---

## 1. Kapatilan Maddeler

| # | Madde | Ad | Durum |
|---|-------|-----|-------|
| A1 | Source-Impact filtre netligi | Hybrid B: UI'dan user/channel/platform drop + SystemScopeNote + backend kontrati korundu | Tamam |
| A2 | Prompt-Assembly filtre netligi | Hybrid B: ayni desen | Tamam |
| B1 | AdminYouTubeAnalyticsPage | Yeni sayfa, tum YouTube baglanti snapshot'lari (`/admin/analytics/youtube-admin`) | Tamam |
| B2 | YouTube hata sertlestirmesi | `fmtNum` null/undefined + isFinite guard, `engagementRate` guard, reduce/sort `(?? 0)` | Tamam |
| C1 | Export servisi (10 kind) | `export_service.to_csv()` multi-section flatten, UTF-8 BOM | Tamam |
| C2 | ExportButton + route | `/api/v1/analytics/export?kind=&format=csv`, per-kind indirme | Tamam |
| C3 | Filtre paritesi (source-impact/prompt-assembly) | Per-section ExportButton sadece `window` iletiyor | Tamam |
| D1 | Snapshot-lock disclaimer | `<SnapshotLockDisclaimer />` tum admin analytics sayfalarinda | Tamam |
| E1 | `epoch_diff_seconds()` helper | SQLite julianday soyutlamasi; `service.py` artik direkt cagirmiyor | Tamam |
| F1 | Analytics audit log | `analytics.view.<kind>` entry yazilir, actor_id/filter/entity kayitli | Tamam |
| F2 | Module breakdown | Overview endpoint'e module-level publish/job sayac kirilimi | Tamam |
| G1 | Test coverage | 32 test (export, csv format, audit, helper, service purity) | Tamam |
| G2 | Closure doc | Bu dokuman | Tamam |

Kapsam disi (bilincli ertelendi):
- **Audit retention policy** (`audit.retention.days` Settings Registry key) — ayri disiplinli gelistirme; Gate 5 icinde degil.
- **Frontend vitest integration smoke** — unit seviyesinde backend taraflari dogrulandi, frontend smoke kapsam genisletilirken yapilacak (sonraki gate).

---

## 2. Backend Degisiklikleri

### 2.1 Yeni Modüller

**`backend/app/analytics/sql_helpers.py`**
- `epoch_diff_seconds(start_expr, end_expr) -> BinaryExpression`
- SQLite `(julianday(end) - julianday(start)) * 86400` sarmalayicisi.
- service.py ve diger analytics modulleri artik `julianday()` stringini tasimiyor.

**`backend/app/analytics/export_service.py`**
- `to_csv(payload: dict, kind: str) -> str`
- 10 kind destekli: overview, operations, content, source-impact, channel, template-impact, prompt-assembly, dashboard, publish, channel-performance
- Multi-section flatten: scalar `field,value` + her liste icin `[section]` header
- Bos listeler icin `(empty)` marker
- UTF-8 BOM header (`\ufeff` frontend tarafinda Blob'a prepend edilir)
- Unknown kind icin `ValueError` firlatir

**`backend/app/analytics/audit.py`**
- `record_analytics_view(db, report_kind, actor_id, filters)` — fire-and-forget
- `actor_id is None` ise no-op
- `write_audit_log` flush + explicit `await db.commit()` (analytics read-only; session baska yerden commit edilmiyor)
- Exception absorb: warning + rollback; asla raise etmez

### 2.2 Endpoint Degisiklikleri

**`GET /api/v1/analytics/export`** (yeni)
- Query: `kind`, `format=csv`, `window`, `date_from`, `date_to`
- Dogrulama: bilinmeyen `kind` veya `format` → 400
- Response: `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="analytics-{kind}-{date}.csv"`
- Gorev: ilgili `service.get_*()` cagirir, `to_csv()` ile donusturur, header yorumu ekler (`# analytics export kind={kind}`)

**Her analytics GET endpoint** → `await record_analytics_view(...)` cagiriyor (non-blocking, fire-and-forget).

### 2.3 Source-Impact / Prompt-Assembly (A1/A2 Hybrid B)

- Backend kontrat korundu: `user_id`, `channel_id`, `platform` parametreleri hala istenirse kabul ediliyor.
- Pratik kullanim: admin UI bu parametreleri **gondermiyor** — sadece `window`/`date_from`/`date_to`.
- Sonuc: rapor **sistem-global kirilimi** yansitir; UI'da `SystemScopeNote` bunu acikca soyler.
- `ExportButton` (source-impact, prompt-assembly) sadece `window` iletir; tam apiParams gondermez.

---

## 3. Frontend Degisiklikleri

### 3.1 Yeni Bilesenler

**`frontend/src/components/analytics/SystemScopeNote.tsx`**
- Amber callout, circle-info ikonu.
- Prop: `subject` (default "Bu rapor"), `className`.
- `data-testid="system-scope-note"`.
- Kullanim: source-impact + prompt-assembly section'larinda.

**`frontend/src/components/analytics/SnapshotLockDisclaimer.tsx`**
- Slate-gray callout (SystemScopeNote'tan renkli olarak ayri).
- `data-testid="snapshot-lock-disclaimer"`.
- Tum admin analytics sayfalarinda filter bar altinda.

**`frontend/src/components/analytics/ExportButton.tsx`**
- `useAnalyticsExport` hook kullaniyor.
- Props: `kind`, `params`, `label`, `variant`.
- Loading/error state: inline error `<span data-testid="export-error-{kind}">`.
- `data-testid="export-{kind}"`.

**`frontend/src/api/analyticsExportApi.ts`**
- `fetchAnalyticsCsv({ kind, window, date_from, date_to })` → `Promise<string>`
- `api.getText()` ile raw CSV text cekiyor.

**`frontend/src/hooks/useAnalyticsExport.ts`**
- State machine: idle / loading / error
- `triggerDownload({kind, params})`:
  - CSV'yi fetch
  - `\ufeff` BOM prepend (Excel/Sheets compat)
  - Blob + URL.createObjectURL + anchor click + revoke
  - Filename: `analytics-{kind}-{window?}-{dateRange?}-{ISODate}.csv`

### 3.2 Yeni Sayfa

**`frontend/src/pages/admin/AdminYouTubeAnalyticsPage.tsx`** (~475 LOC)
- Route: `/admin/analytics/youtube-admin` (visibility: `panel:analytics`)
- YouTube Analytics API **v2 snapshot**'lari uzerinden hesaplar (mevcut `YouTubeAnalyticsPage` → YouTube Data API per-connection farki korundu).
- Features:
  - Connection picker (ilk YouTube baglantisi otomatik secili)
  - Window picker (7 / 28 / 90 gun)
  - Son senkron bilgisi + per-connection ve bulk sync trigger
  - 8 metric tile: views, minutes, net subs, likes, shares, comments, avg duration, avg %
  - Top videos DataTable (7 kolon)
  - Traffic / Devices / Demographics 3'lu grid
  - PageShell actions'ta `ExportButton(channel-performance)`
  - `SnapshotLockDisclaimer` + disclaimer blok

### 3.3 Mevcut Sayfa Guncellemeleri

- **`AnalyticsOverviewPage`** — `ExportButton(overview)` + `SnapshotLockDisclaimer`
- **`AnalyticsOperationsPage`** — `ExportButton(operations)` (page-level, full apiParams) + source-impact/prompt-assembly section'larinda `SystemScopeNote` + per-section `ExportButton` (sadece window) + `SnapshotLockDisclaimer`
- **`AnalyticsContentPage`** — `ExportButton(content)` + `ExportButton(template-impact)` + `SnapshotLockDisclaimer`
- **`PublishAnalyticsPage`** — `ExportButton(publish)` + `SnapshotLockDisclaimer`
- **`YouTubeAnalyticsPage`** — B2 hardening: `fmtNum`/`fmtNumFull` null+isFinite guard, `engagementRate` non-finite guard, reduce/sort `(?? 0)` default; `ExportButton(channel)` + `ExportButton(channel-performance)`

### 3.4 Router

- `/admin/analytics/youtube-admin` route eklendi (panel:analytics visibility guard).

---

## 4. Test Sonuclari

### 4.1 Backend — `test_gate5_analytics_closure.py`

```
32 passed in 0.61s
```

Test kategorileri:
- **Export endpoint (4 + 10 param)** — 10 kind CSV donusu, unknown kind 400, unknown format 400, date range kabulu
- **CSV multi-section format (4 + 10 param)** — scalar section, liste section, empty list marker, invalid kind ValueError, 10 valid kind
- **Audit log (3)** — view'da entry yazimi, actor_id=None no-op, exception absorb
- **SQL helpers (1)** — `epoch_diff_seconds` stringify edildiginde `julianday` ve `86400` icerir
- **service.py julianday-free (1)** — `inspect.getsource(service)` icinde `julianday` gecmiyor, `epoch_diff_seconds` gecyior

### 4.2 Audit Commit Semantigi

`test_audit_log_written_on_view` ilk koşuda 0 satir bulmustu. Sebep: analytics endpoint'leri salt-okunur, `write_audit_log` sadece flush yapiyor, session baska yerden commit edilmiyor. Fix: `audit.py` icinde `await db.commit()` eklendi (exception durumunda rollback). Re-run: PASS.

---

## 5. Verification Notlari

### 5.1 Export Endpoint

```bash
curl -s "http://localhost:8000/api/v1/analytics/export?kind=overview&format=csv" | head -5
# Cikti:
# # analytics export kind=overview
# field,value
# window,last_30d
# published_count,0
# ...
```

Beklenen: `text/csv` content-type, `Content-Disposition: attachment`, header yorumu ilk satirda.

### 5.2 Audit Log Dogrulama

```sql
SELECT action, actor_id, entity_type, entity_id, details_json, created_at
FROM audit_log
WHERE action LIKE 'analytics.view.%'
ORDER BY created_at DESC
LIMIT 5;
```

Her admin analytics sayfa ziyaretinde 1 satir olusur.

### 5.3 Source-Impact / Prompt-Assembly Hybrid B

- UI: user/channel/platform filtresi **yok**.
- `SystemScopeNote` section icinde gorunur.
- ExportButton CSV'si `window` parametresini iceriyor, user/channel/platform hic yok.
- Backend testi: ayni parametre listesini eski cagrilarla karsilastirinca contract bozulmamis.

---

## 6. Dokunulmayan / Dokunulmayacak Alanlar

- Legacy, Horizon, Bridge, Atrium surface'lar
- Mevcut `YouTubeAnalyticsPage` (B1 ayri sayfa olarak ek; B2 sadece null-guard hardening)
- Audit retention policy (ayri scope)
- Backend visibility engine (kontrat degismedi)
- Job engine, settings registry, visibility engine

---

## 7. Commit Listesi

| Hash | Commit | Dosya Sayisi |
|------|--------|---------------|
| `82b3c26` | gate5 spec: analytics closure design (A1-G2) | 1 |
| `656715a` | gate5: analytics backend foundations (sql_helpers + audit + export + hybrid-B) | ~8 |
| `e7efcab` | gate5: A1/A2 hybrid B — SystemScopeNote on source-impact + prompt-assembly | 2 |
| `06859ed` | gate5: C1/C2 export CSV + B2 youtube hardening + filter parity | ~12 |
| `d4a5968` | gate5: B1 AdminYouTubeAnalyticsPage + D1 snapshot-lock disclaimer | ~7 |
| (bu commit) | gate5: C5 tests + closure doc + audit commit fix | 3 |

---

## 8. Bilinen Limitler

- Frontend smoke test coverage dar — vitest entegrasyonu bir sonraki gate'te genisletilecek.
- Audit log retention/cleanup job yok — manuel veya `audit.retention.days` setting sonraki iterasyonda.
- Export servisi salt-okunur payload'lar icin; buyuk liste export'lari streaming yapmaz (v1 kabul edilebilir).
- `SystemScopeNote` sadece source-impact + prompt-assembly icin gosteriliyor; gelecek global-only report'lar eklendiginde yeniden kullanilabilir.

---

## 9. Gate 5 Sonuc

Analytics layer artik:
- Kullaniciya filtre yalanlari anlatmiyor (Hybrid B ile scope acikca belirtildi).
- YouTube snapshot'lari icin admin cross-connection gorunumu var.
- Her rapor kind'i CSV olarak indirilebiliyor.
- Snapshot-lock netligi tum sayfalarda.
- Kim hangi raporu ne filtresiyle gordu: audit log'da.
- julianday soyutlamasi merkezi yerde, `service.py` temiz.
- Module breakdown overview'de gorunur.
- 32 backend testi gecti, 0 uyari.
