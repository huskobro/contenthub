# Faz 10 — Channel Performance Analytics Raporu

## Executive Summary

Faz 10, ContentHub'a kanal bazli performans analytics katmanini ekler. Mevcut analytics v2 omurgasini ChannelProfile ekseninde derinlestirir ve production + publish + engagement verilerini tek bir kanal baglaminda birlestirir. Admin tum kanallari filtreli gorebilir, user kendi kanallarinin performansini izleyebilir.

## Metric Source Audit

### Metrik Kaynaklari Tablosu

| Metrik Grubu | Kaynak Entity | Kanal Baglantisi | Mevcut Durumu |
|---|---|---|---|
| **Toplam icerik** | ContentProject | channel_profile_id FK | Tam calisiyor |
| **Is sayisi / basari** | Job | channel_profile_id (indexed) | Tam calisiyor |
| **Uretim suresi** | Job (started_at → finished_at) | channel_profile_id | Tam calisiyor |
| **Retry orani** | Job.retry_count | channel_profile_id | Tam calisiyor |
| **Modul dagilimi** | Job.module_type | channel_profile_id | Tam calisiyor |
| **Publish sayisi/basari** | PublishRecord | Job → channel_profile_id | Tam calisiyor |
| **Yorum sayisi/yanit** | SyncedComment | channel_profile_id FK | Tam calisiyor |
| **Yanit orani** | SyncedComment.reply_status | channel_profile_id | Tam calisiyor |
| **Etkilesim gorevi** | EngagementTask | channel_profile_id FK | Tam calisiyor |
| **Gonderi sayisi** | PlatformPost | channel_profile_id FK | Tam (draft/orchestration) |
| **Playlist sayisi** | SyncedPlaylist | channel_profile_id FK | Tam calisiyor |
| **Platform baglantisi** | PlatformConnection | channel_profile_id FK | Tam calisiyor |
| **Retention/watch time** | — | — | Platform API entegrasyonu yok |
| **Subscriber growth** | PlatformConnection.subscriber_count | channel_profile_id | Henuz trend yokmuyor |

### Uretilemeyen Metrikler

- **Watch time / Retention**: YouTube Analytics API entegrasyonu yok
- **Subscriber growth trend**: Tek nokta subscriber_count var, trend hesaplanmiyor
- **Best time to publish**: Veri altyapisi hazir ama analiz fonksiyonu henuz yok
- **Community post delivery metrics**: YouTube API ucuncu taraflara acik degil

## Backend Degisiklikleri

### Yeni Endpoint

`GET /api/v1/analytics/channel-performance`

Parametreler: `window`, `date_from`, `date_to`, `user_id`, `channel_profile_id`, `platform`

### Degisen Dosyalar

| Dosya | Degisiklik |
|-------|-----------|
| `app/analytics/service.py` | +`get_channel_performance()` fonksiyonu (~250 satir), engagement model importlari eklendi |
| `app/analytics/schemas.py` | +`ChannelPerformance`, `ChannelRanking`, `ChannelDailyTrend`, `ModuleCount`, `EngagementTypeCount`, `RecentError` schemalar |
| `app/analytics/router.py` | +`GET /channel-performance` endpoint, `ChannelPerformance` import |

### Aggregation Detayi

`get_channel_performance()` fonksiyonu su aggregation'lari yapar:

1. **Production**: Job count/status + avg duration + retry rate + ContentProject count + module distribution
2. **Publish**: PublishRecord count/status + success rate
3. **Engagement**: SyncedComment (total/replied/pending/reply_rate) + EngagementTask (total/executed/failed + type distribution) + PlatformPost (total/draft/queued/posted) + SyncedPlaylist (total/items)
4. **Channel Health**: PlatformConnection (total/connected)
5. **Daily Trend**: Job-based daily aggregation
6. **Channel Rankings**: ChannelProfile LEFT JOIN Job ile kanal bazli siralama (yalnizca channel_profile_id filtresi yoksa)
7. **Recent Errors**: Son 5 basarisiz job

## Frontend Degisiklikleri

### Yeni Dosyalar

| Dosya | Aciklama |
|-------|----------|
| `src/api/analyticsApi.ts` | +ChannelPerformanceData tipi ve fetch fonksiyonu |
| `src/hooks/useChannelPerformance.ts` | React Query hook |
| `src/pages/admin/AdminChannelPerformancePage.tsx` | Admin kanal performans sayfasi |
| `src/pages/user/UserChannelAnalyticsPage.tsx` | User kanal performans sayfasi |

### Admin Kanal Performans Sayfasi

Route: `/admin/analytics/channel-performance`

Icerik:
- AdminAnalyticsFilterBar (user/channel/platform/date range/window)
- Uretim KPI kartlari (5 kart)
- Yayin KPI kartlari (4 kart)
- Etkilesim KPI kartlari (7 kart)
- Kanal Sagligi KPI kartlari (2 kart)
- Gunluk Uretim Trendi (TrendChart)
- Modul Dagilimi (DistributionDonut)
- Yayin Durumu (ComparisonBar)
- Etkilesim Dagilimi (DistributionDonut)
- Kanal Siralamasi (ComparisonBar + tablo)
- Son Hatalar listesi
- Platform kisitlama bildirimi

### User Kanal Performans Sayfasi

Route: `/user/analytics/channels`

Icerik:
- Zaman penceresi secici
- Kanal secici (sadece kullanicinin kendi kanallari)
- Ozet KPI kartlari (4 kart)
- Yayin KPI kartlari (4 kart)
- Etkilesim KPI kartlari (5 kart)
- Uretim Trendi (TrendChart)
- Modul Dagilimi (DistributionDonut)
- Etkilesim Dagilimi (DistributionDonut)
- Baglanti Durumu
- Platform kisitlama notu

### Chart / Visualization Stratejisi

Kullanilan shared chart componentleri:
- **TrendChart**: Gunluk uretim trendi
- **DistributionDonut**: Modul dagilimi, etkilesim dagilimi
- **ComparisonBar**: Yayin durumu, kanal siralamasi

### Navigasyon Degisiklikleri

| Dosya | Degisiklik |
|-------|-----------|
| `src/app/router.tsx` | +Lazy import'lar, +`/admin/analytics/channel-performance` ve `/user/analytics/channels` route'lari |
| `src/app/layouts/useLayoutNavigation.ts` | +"Kanal Performansi" admin analytics nav, +"Kanal Performansim" user engagement nav, +ROUTE_VISIBILITY mapping |

## Publish + Engagement + Content Birlesmesi

Tek endpoint (`/analytics/channel-performance`) su verileri tek response'da birlestirir:

- ContentProject → `total_content`
- Job → `total_jobs`, `completed_jobs`, `failed_jobs`, `job_success_rate`, `avg_production_duration_seconds`, `retry_rate`, `module_distribution`
- PublishRecord → `total_publish`, `published_count`, `failed_publish`, `publish_success_rate`
- SyncedComment → `total_comments`, `replied_comments`, `pending_comments`, `reply_rate`
- EngagementTask → `total_engagement_tasks`, `executed_tasks`, `failed_tasks`, `engagement_type_distribution`
- PlatformPost → `total_posts`, `draft_posts`, `queued_posts`, `posted_posts`
- SyncedPlaylist → `total_playlists`, `total_playlist_items`
- PlatformConnection → `total_connections`, `connected_connections`

## Test Sonuclari

| Dosya | Test Sayisi | Sonuc |
|-------|-------------|-------|
| `tests/test_faz10_channel_performance.py` | 10 | 10/10 PASSED |

Test listesi:
1. Endpoint reachable (200)
2. Response contains all metric groups
3. Window filter works (4 pencere)
4. Channel profile filter applied
5. Channel rankings included (no filter)
6. Daily trend is list
7. Module distribution is list
8. Engagement type distribution is list
9. Empty state returns zeros
10. Service direct call works

## TypeScript / Build

- `npx tsc --noEmit`: Hatasiz
- `npx vite build`: Basarili

## Kalan Limitasyonlar

1. **Retention / watch time**: YouTube Analytics API entegrasyonu gerekiyor
2. **Subscriber growth trend**: Tek nokta veri var, trend izleme yok
3. **Best time to publish**: Veri altyapisi hazir, analiz fonksiyonu deferred
4. **Community post delivery**: YouTube API kisiti — sadece draft metrikleri
5. **Channel benchmarking**: Karsilastirmali analiz henuz yok, omurga hazir (channel_rankings)
6. **Heatmap**: Deferred — TrendChart + DistributionDonut + ComparisonBar ile baslandi

## Onceki Bilinen Test Sorunlari

- `test_m7_c1_migration_fresh_db`: Alembic modul yolu (Python 3.9)
- `test_create_rss_source`: 422 sema uyumsuzlugu
