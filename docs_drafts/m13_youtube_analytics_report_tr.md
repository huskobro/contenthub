# M13-C: YouTube Analytics Raporu

## Ozet

YouTube Data API v3 uzerinden gercek video istatistikleri cekilip hem backend endpoint hem de frontend sayfasi olarak sunuldu. Placeholder/mock veri tamamen kaldirildi.

## Backend Degisiklikleri

### `backend/app/publish/youtube/router.py`
- **Yeni endpoint**: `GET /publish/youtube/video-stats`
- **Yeni schemalar**: `VideoStatsItem`, `VideoStatsResponse`
- Calisma mantigi:
  1. DB'den publish_records tablosunda `status='published'` ve `platform_video_id IS NOT NULL` kayitlarini ceker
  2. Video ID yoksa bos response doner (honest empty state)
  3. YouTube token store'dan access_token alir — yoksa 401 doner
  4. YouTube Data API v3 `videos.list` endpointini `part=snippet,statistics` ile cagrir
  5. `viewCount`, `likeCount`, `commentCount` degerlerini toplar
  6. Videolari ve toplam metrikleri doner

### Teknik Notlar
- `youtube.upload` scope'u `videos.list` endpointine erisim sagliyor (kanal sahibinin videolari icin)
- Yeni OAuth scope eklemeye gerek yok
- Token yenileme mevcut `_token_store.get_access_token()` ile otomatik yapiliyor
- Hata durumunda 502 Bad Gateway donuyor (YouTube API hatasi oldugunu acikca belirtiyor)

### `backend/tests/test_youtube_video_stats.py` (YENI — 4 test)
1. `test_video_stats_no_published_videos` — Publish kaydı yokken bos response
2. `test_video_stats_no_token` — Token yokken 401
3. `test_video_stats_youtube_api_error` — YouTube API hata durumu → 502
4. `test_video_stats_success` — Basarili senaryo, metrikler dogru toplanir

## Frontend Degisiklikleri

### `frontend/src/api/credentialsApi.ts`
- `fetchYouTubeVideoStats()` fonksiyonu eklendi

### `frontend/src/hooks/useCredentials.ts`
- `useYouTubeVideoStats()` React Query hook eklendi

### `frontend/src/pages/admin/YouTubeAnalyticsPage.tsx`
- Placeholder mock veri tamamen kaldirildi
- `useYouTubeVideoStats()` hook ile gercek veri cekilyor
- Loading durumu gosteriliyor
- Hata durumu gosteriliyor
- Bos durum: "Henuz yayinlanmis video bulunamadi" (honest empty state)
- Video listesi: baslik, goruntulenme, begeni, yorum sayilari
- Toplam metrikler: views, likes, comments, video_count

## Kapsam Disi Birakilanlar

- Zaman serisi grafikleri (daily views trend vb.) — YouTube Data API v3 Analytics'i ayri scope istiyor, bu M14+ kapsami
- Video bazli detay sayfasi — MVP icin liste yeterli
- Cache/rate-limiting — YouTube API gunluk kota yeterli, MVP icin ek onlem gerekmiyor

## Test Sonuclari

- 4/4 YouTube video stats backend test PASSED
- Frontend YouTube Analytics sayfasi regresyon testi PASSED
