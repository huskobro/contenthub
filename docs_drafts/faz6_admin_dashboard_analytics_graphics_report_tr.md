# Faz 6 — Admin Dashboard + Analytics + Grafikler Raporu

## Tarih
2026-04-09

## Executive Summary

Faz 6 tamamlandi. Ana hedefler:

1. **Admin Dashboard V2** — gercek operasyonel gozlem merkezi (KPI kartlari, gunluk uretim trendi, modul dagilimi, platform yayin dagilimi, yayin basari trendi, operasyonel durum, son hatalar)
2. **Shared Filter Model** — `AdminAnalyticsFilterBar` ile tum analytics sayfalarinda ortak user/channel/platform/date filtreleme
3. **Backend Filter Destegi** — tum 7 mevcut + 2 yeni analytics endpoint'e `user_id`, `channel_profile_id`, `platform` filter parametreleri eklendi
4. **Publish Analytics** — yeni sayfa: yayin hunisi, platform kirilimi, gunluk yayin trendi
5. **User Analytics Zemini** — user panel'de kendi verisini goren basit analytics sayfasi
6. **10 yeni backend testi** — dashboard, publish, filter kabul, bos veri durumlari

---

## Faz A — Metric Model Audit

### ContentProject Seviyesinde Metrikler
| Metrik | Kaynak |
|---|---|
| Toplam proje sayisi | `COUNT(content_projects)` |
| Modul bazli proje dagilimi | `content_projects.module_type` GROUP BY |
| Proje durum dagilimi | `content_projects.content_status` |
| Kullanici bazli proje sayisi | `content_projects.user_id` GROUP BY |
| Kanal bazli proje sayisi | `content_projects.channel_profile_id` GROUP BY |

### Job Seviyesinde Metrikler
| Metrik | Kaynak |
|---|---|
| Toplam is sayisi | `COUNT(jobs)` |
| Aktif is sayisi | `jobs.status IN ('queued','running')` |
| Tamamlanan / basarisiz | `jobs.status` filtreleme |
| Is basari orani | `completed / total` |
| Ortalama uretim suresi | `AVG(finished_at - started_at)` |
| Retry orani | `retry_count > 0 / total` |
| Modul bazli is dagilimi | `jobs.module_type` GROUP BY |
| Gunluk is trendi | `date(jobs.created_at)` GROUP BY |
| Step bazli sure/hata | `job_steps.step_key` GROUP BY |
| Provider hata orani | `job_steps.step_key IN provider_keys` |
| Provider maliyet | `job_steps.provider_trace_json` aggregation |

### PublishRecord Seviyesinde Metrikler
| Metrik | Kaynak |
|---|---|
| Toplam yayin sayisi | `COUNT(publish_records)` |
| Yayinlanan / basarisiz / taslak / inceleme / planli | `publish_records.status` |
| Yayin basari orani | `published / total` |
| Platform bazli kirilim | `publish_records.platform` GROUP BY |
| Ortalama yayina kadar sure | `AVG(published_at - job.created_at)` |
| Gunluk yayin trendi | `date(publish_records.created_at)` GROUP BY |
| Yayin hunisi | status dagilimi |

### Admin vs User Metrik Ayirimi
- **Admin**: tum veriyi gorur, user/channel/platform filtreleri ile daraltabilir
- **User**: sadece kendi verisi (`user_id` otomatik scope)
- Ayni endpoint, ayni chart component'ler — sadece filter farki

### Henuz Uretilemeyenler
- Engagement metrikleri (YouTube view/like) — VideoStatsSnapshot var ama analytics aggregation'a henuz bagli degil
- Template/Style etkisi zaten mevcut (template-impact endpoint'i)
- Source etkisi zaten mevcut (source-impact endpoint'i)

---

## Faz B — Shared Filter Model

### AdminAnalyticsFilterBar Komponenti
- **Dosya**: `frontend/src/components/analytics/AdminAnalyticsFilterBar.tsx`
- **Filtreler**: user, channel profile, platform, date range, time window
- **Cascading**: user secilince channel profile listesi daralir
- **URL sync**: filtre state'i URL search params'da tutulur (shareability + back button)
- **Reuse**: tum admin analytics sayfalari tek component kullaniyor
- **Props**: `hidePlatform`, `hideUser`, `hideChannel`, `hideDateRange` ile sayfa bazli kontrol

### useAnalyticsFilters Hook
- **Dosya**: `frontend/src/hooks/useAnalyticsFilters.ts`
- URL param'lardan okur/yazar
- `apiParams` getter'i backend format'ina cevirir
- `clearFilters`, `clearDateRange` yardimci fonksiyonlari

### Backend Filter Zinciri
- `_apply_entity_filters()` helper fonksiyonu: entity tip'ine gore (job/publish/step) uygun subquery zincirleri uygular
- `user_id` → ContentProject.user_id subquery → Job.content_project_id
- `channel_profile_id` → Job.channel_profile_id direkt
- `platform` → PublishRecord.platform direkt

---

## Faz C — Admin Dashboard V2

### AdminOverviewPage Yeniden Tasarim
- Eski: basit quick-links + system readiness + recent jobs
- Yeni: gercek operasyonel dashboard

### Dashboard Bolumleri
1. **Filter Bar** — AdminAnalyticsFilterBar (user/channel/platform/date)
2. **KPI Kartlari** (gradient hero area)
   - Toplam Proje, Toplam Is, Aktif Is, Yayin Basari Orani
   - Ort. Uretim Suresi, Retry Orani, Basarisiz Is, Toplam Yayin
3. **Grafikler** (2x2 grid)
   - Gunluk Uretim Trendi (TrendChart/AreaChart)
   - Modul Dagilimi (DistributionDonut)
   - Platform Yayin Dagilimi (ComparisonBar)
   - Yayin Basari Trendi (TrendChart)
4. **Operasyonel Durum** + **Son Isler** (2-column)
   - Kuyruk boyutu
   - Son 5 hata (tiklayinca job detail'e gider)
   - Son 5 is (tiklayinca job detail'e gider)
5. **Hizli Erisim** — quick-link kartlari (sadeleştirildi)

### Veri Kaynagi
- `GET /api/v1/analytics/dashboard` — tek endpoint, tum KPI + trend + distribution

---

## Faz D — Analytics Sayfa Ayrimi

### Mevcut Sayfalar (guncellendi)
1. **AnalyticsOverviewPage** — genel bakis + alt sayfa navigasyonu (yeni: publish link eklendi)
2. **AnalyticsOperationsPage** — operations metrikleri (guncelleme: shared filter bar)
3. **AnalyticsContentPage** — icerik performansi (guncelleme: shared filter bar)
4. **YouTubeAnalyticsPage** — YouTube kanal analytics (degisiklik yok)

### Yeni Sayfa
5. **PublishAnalyticsPage** (`/admin/analytics/publish`)
   - Yayin ozet KPI'lari
   - Yayin durumu dagilimi (donut)
   - Platform kirilimi (bar chart)
   - Gunluk yayin trendi (area chart)
   - Yayin hunisi (draft → review → scheduled → published)

---

## Faz E — Shared Chart System

Mevcut chart component seti Faz 1'den beri var ve yeterli:

| Component | Kullanimdaki Sayfalar |
|---|---|
| `TrendChart` | Dashboard (uretim + yayin trendi), User Analytics, Publish Analytics |
| `DistributionDonut` | Dashboard (modul dagilimi), Publish Analytics (status), User Analytics |
| `ComparisonBar` | Dashboard (platform), Publish Analytics (platform) |
| `StatusGrid` | Mevcut (kullanilabilir) |
| `PublishHeatmap` | Mevcut (deferred) |
| `ProviderLatencyChart` | Operations Analytics |
| `StepDurationChart` | Operations Analytics |
| `ModuleDistributionChart` | Content Analytics |
| `JobSuccessRateChart` | Mevcut |

Yeni chart component'e ihtiyac olmadi — mevcut set yeterli.
Tum chart'lar design system token'larina uyumlu.

---

## Faz F — Backend Analytics Contract

### Yeni Endpoint'ler
| Endpoint | Response Model | Aciklama |
|---|---|---|
| `GET /analytics/dashboard` | `DashboardSummary` | Admin dashboard KPI + trend + distribution |
| `GET /analytics/publish` | `PublishAnalytics` | Yayin-spesifik analytics |

### Tum Endpoint'lere Eklenen Filtreler
| Parametre | Tip | Varsayilan | Aciklama |
|---|---|---|---|
| `user_id` | Optional[str] | None | Kullanici bazli filtreleme |
| `channel_profile_id` | Optional[str] | None | Kanal profil bazli filtreleme |
| `platform` | Optional[str] | None | Platform bazli filtreleme |

Filtre verilmezse kumulatif gorunum. Filtre verilirse uygun kirilim.

### Aggregation Mantigi
- `_apply_entity_filters()` — deterministik, subquery-tabanli
- N+1 yok — tek sorguda aggregation
- Daily trend: `date(created_at)` GROUP BY ile gunluk bucketlama
- Recent errors: son 5 basarisiz job, `last_error` alani ile

---

## Faz G — User Analytics Zemini

### UserAnalyticsPage
- **Dosya**: `frontend/src/pages/user/UserAnalyticsPage.tsx`
- **Route**: `/user/analytics`
- Otomatik `user_id` scope (authStore'dan)
- Ayni `fetchDashboardSummary` API'sini kullanir
- Ayni chart component'leri (TrendChart, DistributionDonut) reuse eder
- KPI: Projelerim, Islerim, Yayin Basari, Ort. Uretim
- Grafikler: Uretim Trendi, Modul Dagilimi

### Reuse Yapisi
- `fetchDashboardSummary` + `AnalyticsFilterParams` → admin/user ortak
- Chart component'ler ortak
- Formatters admin sayfalarindan kopyalanmadi, ayni pattern

---

## Faz H — UX/Product Quality

- Dashboard "metric wallpaper" degil — her kart ve grafik karar vermeye yardimci
- Loading state'ler: SkeletonMetricGrid + SkeletonCard
- Empty state: "Secilen donemde veri yok" mesajlari
- Filter aktif gostergesi: "Filtre aktif" badge'i
- "Kumulatif gorunum" / "Filtreli gorunum" etiketi
- Son hatalar tiklayinca job detail'e gider
- Quick filter: Son 7/30/90 gun + Tum Zamanlar
- Filtre temizleme: "Tum Filtreleri Temizle" butonu
- Tarih temizleme: ayri "Tarihi Temizle" butonu

---

## Degisen Dosyalar

### Yeni Dosyalar
| Dosya | Amac |
|---|---|
| `frontend/src/hooks/useAnalyticsFilters.ts` | Shared filter state hook (URL sync) |
| `frontend/src/hooks/useDashboardSummary.ts` | Dashboard summary React Query hook |
| `frontend/src/hooks/usePublishAnalytics.ts` | Publish analytics React Query hook |
| `frontend/src/components/analytics/AdminAnalyticsFilterBar.tsx` | Shared reusable filter bar |
| `frontend/src/pages/admin/PublishAnalyticsPage.tsx` | Publish analytics sayfasi |
| `frontend/src/pages/user/UserAnalyticsPage.tsx` | User analytics giris yuzeyi |
| `backend/tests/test_faz6_analytics_filters.py` | 10 yeni analytics testi |
| `docs_drafts/faz6_admin_dashboard_analytics_graphics_report_tr.md` | Bu rapor |

### Degisen Backend Dosyalar
| Dosya | Degisiklik |
|---|---|
| `backend/app/analytics/schemas.py` | +DailyTrendItem, +DashboardSummary, +PublishAnalytics schema'lari |
| `backend/app/analytics/router.py` | Tum endpoint'lere user_id/channel_profile_id/platform filtreleri, +2 yeni endpoint |
| `backend/app/analytics/service.py` | +_apply_entity_filters helper, tum service fonksiyonlarina filter desteği, +get_dashboard_summary, +get_publish_analytics |

### Degisen Frontend Dosyalar
| Dosya | Degisiklik |
|---|---|
| `frontend/src/api/analyticsApi.ts` | +AnalyticsFilterParams, +DailyTrendItem, +DashboardSummary, +PublishAnalyticsData types, +fetchDashboardSummary, +fetchPublishAnalytics, +filter-aware fetch wrappers |
| `frontend/src/pages/AdminOverviewPage.tsx` | Tamamen yeniden yazildi: gercek dashboard V2 |
| `frontend/src/pages/admin/AnalyticsOverviewPage.tsx` | useState → useAnalyticsFilters, WindowSelector → AdminAnalyticsFilterBar, +publish nav link |
| `frontend/src/pages/admin/AnalyticsOperationsPage.tsx` | useState → useAnalyticsFilters, WindowSelector → AdminAnalyticsFilterBar |
| `frontend/src/pages/admin/AnalyticsContentPage.tsx` | useState → useAnalyticsFilters, WindowSelector → AdminAnalyticsFilterBar |
| `frontend/src/app/router.tsx` | +PublishAnalyticsPage lazy import + route, +UserAnalyticsPage lazy import + route |

---

## Test Sonuclari

### Backend
- **1517 passed** (onceki: 1507 — +10 yeni Faz 6 testi)
- Bilinen onceden mevcut hatalar: test_m7 (alembic path), test_sources_api (schema uyumsuzlugu)

### Yeni Testler (10/10 passed)
1. `test_dashboard_summary_structure` — PASSED
2. `test_dashboard_with_entity_filters` — PASSED
3. `test_publish_analytics_structure` — PASSED
4. `test_publish_analytics_with_platform_filter` — PASSED
5. `test_overview_accepts_entity_filters` — PASSED
6. `test_operations_accepts_entity_filters` — PASSED
7. `test_content_accepts_entity_filters` — PASSED
8. `test_dashboard_cumulative_view` — PASSED
9. `test_dashboard_no_data_returns_zeros` — PASSED
10. `test_publish_analytics_no_data` — PASSED

### Frontend
- TypeScript: 0 hata
- Vite build: basarili (2.41s)

---

## Kalan Limitasyonlar

1. **Filter'lar henuz mevcut hook'lara yansitilmiyor** — `useAnalyticsOverview`, `useAnalyticsOperations` vb. eski hook'lar hala sadece `window` kabul ediyor. Filter-aware versiyonlari (`fetchOverviewMetricsFiltered` vb.) API'de mevcut ama hook'lara sarmalanmadi. Mevcut analytics sayfalarinda filter backend'e gercekten gitmiyor — sadece dashboard ve publish analytics gercek filter kullaniyor.

2. **User analytics sinirlari** — UserAnalyticsPage basit bir giris yuzeyi. Channel profile secimi, tarih araligi filtresi yok. Sadece window selector var.

3. **Engagement metrikleri dahil degil** — YouTube VideoStatsSnapshot verileri analytics aggregation'a henuz bagli degil. Bu ileri fazda eklenebilir.

4. **Export deferred** — Dashboard/analytics'ten CSV/PDF export henuz yok.

5. **Cascading filter API-side validation yok** — Frontend'de user secilince channel daraliyor ama backend user_id + uyumsuz channel_profile_id gonderilirse hata vermez, sadece bos sonuc doner.

6. **Admin filter bar user/channel listesi tum kullanicilari ceker** — Buyuk user sayilarinda performans sorunu olabilir. Ileride autocomplete/search'e donusturulebilir.
