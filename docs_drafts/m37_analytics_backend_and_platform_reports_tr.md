# Analytics Backend + Platform Reports — Rapor (M37)

Tarih: 2026-04-07

---

## 1. Executive Summary

Analytics altyapısı truth audit yapıldı. Mevcut metriklerin tamamı gerçek DB sorgularına bağlıydı — sahte, hardcoded ya da stub veri yoktu. Bu fazda tek gerçek boşluk kapatıldı: `PromptAssemblyRun` tablosu analytics'e bağlı değildi. Ek olarak publish funnel metrikleri (review_pending, publish_backlog, review_rejected) Overview'a eklendi ve Operations analytics'e assembly run sayaçları dahil edildi. Tüm yüzeylerde gerçek veri akıyor.

---

## 2. Analytics Truth Audit Sonucu

Audit kapsamı: tüm analytics endpoint'leri ve servis fonksiyonları.

| Endpoint | Durum | Not |
|----------|-------|-----|
| `GET /analytics/overview` | ✅ Gerçek | Job + PublishRecord DB sorguları |
| `GET /analytics/operations` | ✅ Gerçek | JobStep elapsed, provider trace parse |
| `GET /analytics/source-impact` | ✅ Gerçek | NewsSource, ScanResult, NewsItem tabloları |
| `GET /analytics/channel` | ✅ Gerçek | PublishRecord → YouTube platform filtresi |
| `GET /analytics/content` | ✅ Gerçek | Job, PublishRecord, Template, Blueprint |
| `GET /analytics/template-impact` | ✅ Gerçek | Job.template_id, Job.blueprint_id gruplamalar |
| `PromptAssemblyRun` tablosu | ❌ Bağlı değildi | M37'de eklendi |

**Sonuç:** Tek eksik `PromptAssemblyRun` → Analytics bağlantısıydı. Tüm diğer metrikler sağlamdı.

---

## 3. Backend'de Hangi Metrik Grupları Tamamlandı

### OverviewMetrics — Yeni Alanlar (M37)

`review_pending_count`, `review_rejected_count`, `publish_backlog_count` eklendi.

| Alan | Sorgu Tipi | Pencere |
|------|-----------|---------|
| `review_pending_count` | Current-state count | Pencere bağımsız (şu an bekleyenler) |
| `publish_backlog_count` | Current-state count | Pencere bağımsız (approved/scheduled ama henüz published değil) |
| `review_rejected_count` | Windowed count | Seçilen pencereye göre (ne kadar reddedildi) |

**Tasarım kararı:** `review_pending` ve `publish_backlog` operator dikkat gerektiren anlık durumlar olduğundan pencere filtresi uygulanmadı. `review_rejected` ise geçmişe dönük analiz metriği, windowed.

### OperationsMetrics — Yeni Alanlar (M37)

| Alan | Kaynak |
|------|--------|
| `total_assembly_runs` | `PromptAssemblyRun` tablosu, `is_dry_run=False` |
| `dry_run_count` | `PromptAssemblyRun` tablosu, `is_dry_run=True` |

### Yeni Endpoint: GET /analytics/prompt-assembly → PromptAssemblyMetrics

| Alan | Açıklama |
|------|----------|
| `total_assembly_runs` | Toplam çalışma (dry + production) |
| `dry_run_count` | Preview/dry run sayısı |
| `production_run_count` | Gerçek job assembly sayısı |
| `avg_included_blocks` | Ortalama dahil edilen blok sayısı |
| `avg_skipped_blocks` | Ortalama atlanan blok sayısı |
| `module_stats` | module_scope bazlı gruplama (run_count, avg_included, avg_skipped) |
| `provider_stats` | provider_name bazlı gruplama (run_count, response_count, error_count) |

---

## 4. Platform Overview Neleri Gösteriyor

**AnalyticsOverviewPage** üç ana bölümden oluşuyor:

### Temel Metrikler (`analytics-core-metrics`)
- Toplam Job / Tamamlanan Job / Başarısız Job
- Job Başarı Oranı (%)
- Ortalama Üretim Süresi
- Retry Oranı (%)

### Yayın Metrikleri (`analytics-publish-metrics`)
- Yayınlanan / Başarısız Yayın / Yayın Başarı Oranı (%)

### Yayın Kuyruğu (`analytics-publish-queue`) — M37'de eklendi
- **İnceleme Bekleyen**: Şu an `pending_review` durumundaki kayıt sayısı
- **Yayın Birikimi**: `approved` veya `scheduled` ama henüz yayınlanmamış kayıt sayısı
- **Reddedilen (Pencere)**: Seçilen zaman penceresinde review_rejected olan kayıt sayısı

### Kanal Özeti (`analytics-channel-overview`)
- YouTube: toplam deneme / yayınlanan / başarısız / draft / devam eden
- Yayın başarı oranı + son yayın tarihi

### Alt Navigasyon
- Operations Analytics → `/admin/analytics/operations`
- Content Analytics → `/admin/analytics/content`

---

## 5. Operations Analytics Neleri Gösteriyor

**AnalyticsOperationsPage** dört ana bölümden oluşuyor:

### Job Performansı (`analytics-job-performance`)
- Ortalama Render Süresi
- Toplam Assembly Çalışması (is_dry_run=False)
- Dry Run Sayısı

### Adım İstatistikleri (`analytics-step-stats`)
- step_key bazında tablo: adım adı / çalışma sayısı / ortalama süre / başarısız sayısı
- Boş olduğunda `step-stats-empty` durumu

### Provider Sağlığı (`analytics-provider-health`)
- Provider bazında tablo: isim / kind / toplam çağrı / başarısız / hata oranı / ort. gecikme / tahmini maliyet
- Cost model legend (actual vs estimated rozeti)
- Genel provider hata oranı metriği

### Prompt Assembly (`analytics-prompt-assembly`) — M37'de eklendi
- Production çalışma sayısı / Dry run sayısı
- Ortalama dahil edilen blok / Ortalama atlanan blok
- Modül dağılımı tablosu (module_scope gruplu)
- Provider dağılımı tablosu (provider_name gruplu, response/error oranları ile)

---

## 6. Content Analytics Neleri Gösteriyor

**AnalyticsContentPage** dört bölümden oluşuyor:

### Özet Metrikler (`content-summary-metrics`)
- Toplam İçerik / Yayınlanan İçerik / Ort. Yayına Kadar Süre
- Aktif Şablon Sayısı / Aktif Blueprint Sayısı

### İçerik Tipi Kırılımı (`content-type-breakdown`)
- standard_video / news_bulletin gibi tip bazlı sayım (bar)

### Modül Dağılımı (`analytics-module-distribution`)
- Tablo: module_type / toplam / tamamlanan / başarısız / başarı oranı / ort. üretim süresi / retry oranı

### Şablon ve Blueprint Etkisi (`analytics-template-impact`)
- Template bazlı tablo: şablon adı / toplam job / başarı oranı / ort. süre
- Blueprint bazlı tablo: blueprint adı / toplam job / başarı oranı

---

## 7. YouTube Analytics ile Bütünlük Nasıl Sağlandı

YouTube analytics çift katmanlı:

**Katman 1 — Channel Overview (Platform Overview sayfası):**
- `GET /analytics/channel` → `ChannelOverviewMetrics`
- `PublishRecord` tablosundan `platform="youtube"` filtresiyle sorgu
- Publish state machine state'leri sayılıyor: published / failed / draft / in_progress
- `last_published_at` en son başarılı publish tarihi
- `has_publish_history` flag'i "Hiç yayın yapılmamış" boş durum kontrolü için

**Katman 2 — Video Trend Analytics:**
- `GET /analytics/youtube/video/{platform_video_id}/trend` → `VideoStatsTrendResponse`
- `VideoStatsSnapshot` tablosu — YouTube Analytics API'den çekilen tarihsel snapshot'lar
- Kronolojik sıralı snapshot listesi: izlenme, like, yorum, izlenme süresi

Bu iki katman birbirini tamamlıyor: bir tanesi platform-level publish durumu, diğeri video-level performans metrikleri.

---

## 8. Prompt Assembly / Provider Trace Analytics Bağlantısı Ne Oldu

### Durum Öncesi (M34 sonrası)
`PromptAssemblyRun` tablosu M34'te oluşturulmuş ve job assembly trace'leri kaydediliyordu. Ancak bu tablo hiçbir analytics endpoint'ine bağlı değildi — veri var ama sorgulanamıyordu.

### M37'de Yapılan Bağlantı

1. **`analytics/service.py`'a `get_prompt_assembly_metrics()` eklendi:**
   - `PromptAssemblyRun` tablosunu sorgular (windowed)
   - `block_count_included` / `block_count_skipped` ortalamaları hesaplar
   - `module_scope` bazlı gruplama
   - `provider_name` bazlı gruplama (response_received vs error ayrımı)
   - `is_dry_run` boolean'ına göre dry/production ayrımı

2. **`GET /api/v1/analytics/prompt-assembly` endpoint'i eklendi**

3. **Operations metrics'e `total_assembly_runs` + `dry_run_count` eklendi:**
   - Operations sayfası zaten açıkken tek bakışta assembly aktivitesi görünür hale geldi

4. **Frontend tarafı:**
   - `analyticsApi.ts`: `PromptAssemblyMetrics` type + `fetchPromptAssemblyMetrics`
   - `usePromptAssemblyMetrics.ts`: React Query hook
   - `AnalyticsOperationsPage`: "Prompt Assembly" section — 4 metric tile + 2 tablo

**Provider Trace ile İlişki:** Provider trace (M16) ayrı bir sistemdir — `provider_trace_json` parse ederek provider çağrı istatistiklerini çıkarır. Prompt Assembly metrics ise `PromptAssemblyRun` tablosunu sorgular. İkisi Operations sayfasında yan yana gösterilir: "Provider Sağlığı" + "Prompt Assembly" bölümleri.

---

## 9. Hangi Dosyalar Değişti

| Dosya | Değişiklik |
|-------|-----------|
| `backend/app/analytics/schemas.py` | `OverviewMetrics`'e review funnel alanları; `OperationsMetrics`'e assembly sayaçları; yeni `AssemblyModuleStat`, `AssemblyProviderStat`, `PromptAssemblyMetrics` modelleri |
| `backend/app/analytics/service.py` | `get_overview_metrics()` review funnel sorguları; `get_operations_metrics()` assembly run sayaçları; yeni `get_prompt_assembly_metrics()` |
| `backend/app/analytics/router.py` | Yeni `GET /analytics/prompt-assembly` endpoint'i |
| `backend/tests/test_m37_analytics_m37.py` | 8 yeni test (yeni dosya) |
| `frontend/src/api/analyticsApi.ts` | `OverviewMetrics` ve `OperationsMetrics` yeni alanlar; `PromptAssemblyMetrics` type; `fetchPromptAssemblyMetrics` |
| `frontend/src/hooks/usePromptAssemblyMetrics.ts` | Yeni React Query hook |
| `frontend/src/pages/admin/AnalyticsOverviewPage.tsx` | "Yayın Kuyruğu" section: 3 kart (pending / backlog / rejected) |
| `frontend/src/pages/admin/AnalyticsOperationsPage.tsx` | "Prompt Assembly" section: 4 tile + modül tablosu + provider tablosu |
| `frontend/src/tests/analytics-overview-page.smoke.test.tsx` | Mock object'lere `review_pending_count: 0, review_rejected_count: 0, publish_backlog_count: 0` eklendi |
| `frontend/src/tests/analytics-operations-page.smoke.test.tsx` | Mock object'lere `total_assembly_runs: 0, dry_run_count: 0` eklendi |

---

## 10. Test Sonuçları

### Backend Testleri

| Test Dosyası | Kapsam | Sonuç |
|-------------|--------|-------|
| `test_m8_c1_analytics_backend.py` | Overview + Operations temel metrikler, pencere filtresi, route 200 | ✅ 24/24 PASS |
| `test_m16_provider_analytics.py` | Provider stats, trace parse, schema alanları | ✅ 3/3 PASS |
| `test_m14_youtube_analytics.py` | Video stats snapshot, trend endpoint, kronolojik sıralama | ✅ 7/7 PASS |
| `test_m18_content_analytics.py` | Content endpoint 200, pencere, date range, invalid, schema, tip kırılımı | ✅ 7/7 PASS |
| `test_m37_analytics_m37.py` | Review funnel, publish backlog, assembly metrics, dry/production ayrımı, modül stats | ✅ 8/8 PASS |
| **Toplam** | | **✅ 49/49 PASS** |

### M37 Testleri Detay
1. `test_overview_includes_review_pending` — pending_review kayıt → `review_pending_count = 1`
2. `test_overview_publish_backlog` — approved kayıt → `publish_backlog_count >= 1`
3. `test_overview_review_rejected_windowed` — pencere içi/dışı rejected ayrımı
4. `test_prompt_assembly_metrics_empty` — veri yok → tüm değerler sıfır
5. `test_prompt_assembly_metrics_with_data` — 1 run → `total_assembly_runs = 1`
6. `test_prompt_assembly_dry_vs_production` — `dry_run_count` ve `production_run_count` doğru
7. `test_prompt_assembly_module_stats` — `module_stats` gruplama doğruluğu
8. `test_operations_includes_assembly_counts` — `total_assembly_runs` operations metrics içinde geliyor

### Frontend Build

```
tsc: ✅ type check clean
vite build: ✅ başarılı
```

Smoke test mock nesneleri TypeScript şema değişikliklerine göre güncellendi.

---

## 11. Kalan Limitasyonlar

1. **`GET /analytics/prompt-assembly` frontend sayfası yok:** Endpoint çalışıyor, Operations sayfasında özet gösteriliyor, ancak tam ekran dedicated Prompt Assembly Analytics sayfası oluşturulmadı. İlerleyen fazda ayrı sekme/sayfa olarak eklenebilir.

2. **`avg_included_blocks` / `avg_skipped_blocks` Overview'da gösterilmiyor:** Sadece Operations sayfasında. Genel dashboard'da blok verimliliği özeti eklenebilir.

3. **Review funnel real-time güncel değil:** Analytics endpoint'i anlık snapshot döndürüyor, SSE ile canlı güncelleme yok. Operator manuel refresh gerekiyor (ya da React Query cache süresi kadar gecikme var).

4. **Video trend analytics UI yok:** `GET /analytics/youtube/video/{id}/trend` endpoint'i tamamlandı, ancak Job Detail veya Publish Detail'de trend grafiği gösterecek bir UI bileşeni henüz eklenmedi.

5. **`VideoStatsSnapshot` populate edilmiyor:** YouTube Analytics API'den snapshot çeken bir arka plan görevi veya cron yok. Endpoint hazır ama besleyici mekanizma kurulmadı.

6. **Modül bazlı assembly maliyeti yok:** `PromptAssemblyMetrics.module_stats` modül başına maliyet içermiyor — sadece çalışma sayısı ve blok ortalaması. Token/maliyet detayı provider_trace üzerinden ayrıca hesaplanabilir.

7. **Date range filtresi Prompt Assembly endpoint'inde yok:** Overview gibi `date_from`/`date_to` desteği henüz eklenmedi — yalnızca `window` parametresi kullanılıyor.

---

## 12. Commit Hash ve Push Durumu

| Commit | Hash | Açıklama |
|--------|------|---------|
| Implementation | `e50952c` | feat: Analytics M37 — publish funnel + prompt assembly metrics |
| Merge | `be70f2b` | feat: Analytics Backend M37 (merge commit) |
| Smoke test fix | `07ac0ea` | fix(tests): update analytics smoke test mocks for new fields |

**Push:** ✅ `github.com:huskobro/contenthub.git main` — başarılı

**Toplam analytics test coverage:** 49/49 PASS (tüm analytics test dosyaları dahil)
