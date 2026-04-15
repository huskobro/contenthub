# Analytics Closure — Gate 5 Design Spec

**Tarih:** 2026-04-15
**Durum:** Onaylı, uygulamaya geçiliyor
**Kapsam:** Analytics layer'i tek closure paketiyle tamamen kapatmak (A1-G2, 12 madde)
**Defer:** YOK (analytics scope içinde)

---

## 1. Hedef

Analytics layer bugün overwhelmingly REAL (10 endpoint + 8 sayfa + 19 hook gerçek veriye bağlı).
Bu tur eksik polish + dürüstlük + export altyapısını kapatır. Layer tekrar açılmayacak şekilde kapanır.

---

## 2. Scope Maddeleri

| # | Madde | Açıklama |
|---|-------|----------|
| A1 | Source-impact filter hybrid B | UI'dan user/channel/platform dropdown kaldır; backend contract korunur; sayfa notu |
| A2 | Prompt-assembly filter hybrid B | Aynı pattern |
| A3 | Backend docstring regression koruma testi | Hybrid B'nin kasıtlı olduğu dökümante |
| B1 | AdminYouTubeAnalyticsPage | Yeni dosya, çoklu connection karşılaştırma |
| B2 | YouTube pages error hardening | Null guard + error boundary |
| B3 | Filter parity | UserYouTubeAnalyticsPage shared filter pattern'e hizalanır |
| C1 | Ortak export servisi | `/analytics/export?kind=...&format=csv` + frontend hook |
| C2 | Export butonları | Tüm analytics sayfalarında |
| D1 | Snapshot-lock disclaimer | Banner component, 8 sayfada |
| D2 | julianday helper | `backend/app/analytics/sql_helpers.py` soyutlama |
| E1 | Module breakdown | Content endpoint'inde `group_by_module`; UI'da tablo |
| F1 | Analytics audit log | Mevcut audit_log tablosu + thin wrapper |
| G1 | Test coverage | ~30 backend test + 4 frontend smoke |
| G2 | Closure doc | `docs/gate5-analytics-closure.md` |

---

## 3. Mimari Kararlar

### K1. Hybrid B (A1/A2)
**Karar:** Backend contract korunur, UI'dan yanıltıcı filtreler kaldırılır, sayfada sistem-scope notu gösterilir.

**Sebep:** Source ve PromptAssemblyRun entity'leri user/channel'a bağlı değil (schema sınırı). Yeni FK eklemek news/prompt layer'a taşar — analytics scope dışı. UI'dan kaldırmak en dürüst çözüm. Contract kırmamak downstream consumer'ları korur.

### K2. Disclaimer-only snapshot-lock (D1)
**Karar:** Snapshot-lock için schema honoring refactor yapılmaz; banner ile operatör bilgilendirilir.

**Sebep:** Analytics sorguları bugün runtime settings okumuyor — saf DB aggregation yapıyor. Yani gerçek snapshot ihlali yok. Gelecekte threshold okumaya başlanırsa disclaimer proaktif not verir. CLAUDE.md kuralını dürüstlükle karşılar.

### K3. Dialect-deferred julianday helper (D2)
**Karar:** `epoch_diff_seconds()` helper'ı açılır; SQLite `julianday()` wrap'lenir; dialect detection **eklenmez**.

**Sebep:** Proje local-first SQLite. Postgres geçişi olursa tek dosyada değişir. Premature dialect abstraction YAGNI.

### K4. Fire-and-forget audit (F1)
**Karar:** Audit log yazımı response'u bloklamaz; exception absorb edilir.

**Sebep:** Read-only observability — failure response kirletmemeli. Mevcut `audit_log` tablosu reuse edilir, yeni tablo yok.

### K5. AdminYouTubeAnalyticsPage yeni dosya (B1)
**Karar:** Mevcut YouTubeAnalyticsPage (1016 LoC) toggle ile refactor edilmez; yeni dosya açılır.

**Sebep:** Refactor regresyon riski yüksek. Yeni dosya = net scope, net test, atomic revert.

### K6. YouTube export client-side (C1)
**Karar:** `/analytics/youtube/*` için backend export endpoint açılmaz; YouTube sayfaları client-side CSV üretir.

**Sebep:** Dual backend export pattern complexity. YouTube veri zaten UI hook'larında mevcut.

---

## 4. Commit Planı (5 atomik)

| # | Commit | Maddeler | Dosyalar |
|---|--------|----------|----------|
| C1 | backend foundations | D2, F1 (backend), E1 (backend) | sql_helpers.py (yeni), audit.py (yeni), service.py, router.py |
| C2 | A1/A2 hybrid B | A1, A2, A3 | FilterBar prop, 2 consumer sayfası, SystemScopeNote component |
| C3 | export + polish | C1, C2, B2, B3, E1 (FE) | export_service.py, /export router, useAnalyticsExport, ExportButton, YouTube pages harden, ModuleBreakdown UI |
| C4 | admin yt + disclaimer | B1, D1 | AdminYouTubeAnalyticsPage, SnapshotLockDisclaimer, router.tsx |
| C5 | tests + doc | G1, G2 | test_gate5_analytics_closure.py, 4 vitest smoke, gate5-analytics-closure.md |

---

## 5. Backend Dosya Envanteri

**Yeni:**
- `backend/app/analytics/sql_helpers.py` — `epoch_diff_seconds()` helper
- `backend/app/analytics/export_service.py` — `to_csv(dict, kind)` flatten
- `backend/app/analytics/audit.py` — `record_view(session, user_id, kind, filters)` thin wrapper
- `backend/tests/test_gate5_analytics_closure.py` — ~30 test

**Değişen:**
- `backend/app/analytics/service.py` — 7× julianday → helper; `get_content_metrics(group_by_module: bool)`; docstring "Hybrid B" notu
- `backend/app/analytics/router.py` — `/content?group_by_module=`; `/export?kind=&format=`; her endpoint'e audit çağrısı
- `backend/app/analytics/youtube_analytics_router.py` — audit çağrısı

**DB:** Schema değişikliği YOK (mevcut `audit_log` tablosu reuse).

---

## 6. Frontend Dosya Envanteri

**Yeni:**
- `frontend/src/api/analyticsExportApi.ts` — fetch + blob download client
- `frontend/src/hooks/useAnalyticsExport.ts` — React hook
- `frontend/src/components/analytics/ExportButton.tsx` — ortak button
- `frontend/src/components/analytics/SnapshotLockDisclaimer.tsx` — banner
- `frontend/src/components/analytics/SystemScopeNote.tsx` — A1/A2 notu
- `frontend/src/components/analytics/ModuleBreakdownTable.tsx` — E1 UI
- `frontend/src/pages/admin/AdminYouTubeAnalyticsPage.tsx` — B1 yeni sayfa
- `frontend/src/tests/ExportButton.smoke.test.tsx`
- `frontend/src/tests/SnapshotLockDisclaimer.smoke.test.tsx`
- `frontend/src/tests/SystemScopeNote.smoke.test.tsx`
- `frontend/src/tests/AdminYouTubeAnalyticsPage.smoke.test.tsx`

**Değişen:**
- `frontend/src/components/analytics/AdminAnalyticsFilterBar.tsx` — `hideEntityFilters?: boolean` prop
- `frontend/src/pages/admin/AnalyticsOverviewPage.tsx` — disclaimer + export
- `frontend/src/pages/admin/AnalyticsContentPage.tsx` — disclaimer + export + module breakdown
- `frontend/src/pages/admin/AnalyticsOperationsPage.tsx` — disclaimer + export
- `frontend/src/pages/admin/PublishAnalyticsPage.tsx` — disclaimer + export
- `frontend/src/pages/admin/YouTubeAnalyticsPage.tsx` — null guard + export
- `frontend/src/pages/user/UserYouTubeAnalyticsPage.tsx` — null guard + export + filter parity
- `frontend/src/pages/user/UserAnalyticsPage.tsx` — disclaimer + export
- `frontend/src/pages/user/UserChannelAnalyticsPage.tsx` — disclaimer + export
- `frontend/src/app/router.tsx` — AdminYouTubeAnalyticsPage route

**Phase 0 keşif gerekli:** Source-impact ve prompt-assembly'yi **hangi sayfa** tüketiyor? Grep ile tespit edilecek, dosya listesi keşif sonrası netleşecek.

---

## 7. Export Detayı

**Backend endpoint:**
```
GET /analytics/export?kind=<kind>&format=csv&window=&date_from=&date_to=&user_id=&channel_profile_id=&platform=
```
- `kind` valid değerleri: `overview`, `operations`, `content`, `source-impact`, `channel`, `template-impact`, `prompt-assembly`, `dashboard`, `publish`, `channel-performance`
- Response: `text/csv; charset=utf-8`, `Content-Disposition: attachment`
- Flatten kuralı: top-level scalar'lar → tek satır; `*_stats` listeleri → header + rows; `daily_trend` → header + rows; multi-section tek dosya

**Frontend hook:**
```ts
useAnalyticsExport({ kind, filters }) → { export: () => Promise<void>, isPending: boolean, error }
```
Blob fetch → `URL.createObjectURL` → anchor click → revoke.

**YouTube sayfaları:** Backend export endpoint çağırmaz; client-side CSV üretir.

---

## 8. Risk + Mitigasyon Özeti

| Risk | Mitigasyon |
|------|------------|
| Source-impact/prompt-assembly tüketen sayfa belirsiz | Phase 0: grep tespiti |
| audit_log metadata kolonu yok | Schema kontrol; yoksa `note` field'ına stringify |
| YouTube page refactor regresyon | Sadece ek null guard; mevcut akış dokunulmaz |
| CSV flatten complex nested bozulur | Per-kind unit test |
| Audit DB overhead | Fire-and-forget async |
| Vitest parallel freeze | maxThreads=4, targeted batch |
| gate5_001 migration M7 kırar | Migration YOK — schema değişikliği yok |

---

## 9. Test Plan Özeti

**Backend:** `test_gate5_analytics_closure.py` ~30 test (TestSqlHelpers 2 + TestExportService 8 + TestExportRouter 4 + TestModuleBreakdown 3 + TestAnalyticsAudit 4 + TestSourceImpactDocstring 1 + TestYouTubeAudit 2 + integration 6)

**Frontend:** 4 yeni smoke test (ExportButton, SnapshotLockDisclaimer, SystemScopeNote, AdminYouTubeAnalyticsPage) + değişen sayfalarda mock güncellemeleri

**Manual smoke (closure doc'a):** curl export; audit_log query; UI disclaimer görünürlüğü; admin yt page render

---

## 10. Closure Kriterleri

- [ ] 12 madde (A1-G2) tamamlandı
- [ ] Backend testleri pass (yeni + mevcut delta 0 regression)
- [ ] Frontend tsc + build exit 0
- [ ] Vitest targeted batch pass
- [ ] `/analytics/export?kind=overview&format=csv` manuel curl başarılı
- [ ] Source-impact ve prompt-assembly sayfalarında dropdown YOK, sistem-scope notu VAR
- [ ] AdminYouTubeAnalyticsPage render ediyor
- [ ] audit_log'da `analytics.view.*` event'leri yazılıyor
- [ ] `docs/gate5-analytics-closure.md` yazıldı
- [ ] 5 commit atomik pass
- [ ] Push başarılı

**Analytics layer tekrar açılmayacak şekilde kapanır.** Bu turdan sonra `deferred` kategorisinde analytics layer maddesi kalmaz.

---

## 11. Analytics Scope Dışı (Bu Turda Yapılmaz)

- `NewsSource.user_id` FK + migration → news layer
- `PromptAssemblyRun.user_id` FK + migration → prompt-assembly engine layer
- Postgres dialect detection → db/migration layer
- `audit.retention.days` setting → settings layer
- Analytics v2, AI insight, anomaly detection → yeni feature, analytics kapanışını geciktirmez

---

## 12. Sonuç

Plan onaylı. 5 commit atomik, her biri build-passable.
Uygulama başlangıcında Phase 0 (keşif) hariç yeni bloke edici soru sorulmaz.
