# M14-C: YouTube Analytics Hardening Raporu

## Ozet

M13'teki gercek video stats yuzeyini operasyonel olarak guclendirildi. Yerel zaman serisi izleme (snapshot kaydi), video bazli trend endpointi ve frontend gelistirmeleri eklendi.

## Scope Karari

**YouTube Analytics API (youtubeAnalytics.readonly scope)**:
- Zaman serisi (daily views, watch time, demographics, retention) icin bu scope gerekli
- Eklenmesi kullanicinin yeniden yetkilendirmesini gerektirir (mevcut token gecersiz olur)
- Google API Console'da ek yapilandirma gerektirir

**M14 Karari**: Ek scope EKLENMEDI. Bunun yerine:
1. Yerel snapshot kaydi ile zaman serisi izleme
2. Mevcut scope (youtube.upload) ile alinan verilerden trend olusturma
3. Durustce scope kisitlamasi notu

## Backend Degisiklikleri

### `backend/app/db/models.py`
- **Yeni model**: `VideoStatsSnapshot`
  - `id`: UUID primary key
  - `platform_video_id`: String(128), indexed
  - `view_count`, `like_count`, `comment_count`: Integer
  - `snapshot_at`: DateTime(timezone=True), indexed

### Alembic Migration
- `alembic/versions/cc4f6789756e_add_video_stats_snapshots_table.py`
- `video_stats_snapshots` tablosu + 2 index

### `backend/app/publish/youtube/router.py`
- **Snapshot kaydi**: Video stats cekildiginde her video icin otomatik snapshot olusturulur
  - try/except ile non-fatal — snapshot basarisizligi stats yaniti bozmaz
  - Her basarili `/video-stats` cagrisi snapshot biriktir
- **Yeni endpoint**: `GET /video-stats/{video_id}/trend`
  - `VideoStatsTrendResponse` donuyor: video_id, title, snapshots (kronolojik)
  - Title: PublishRecord.payload_json'dan cekilir
  - Snapshot yoksa bos liste doner (durustce)
  - YouTube Analytics API scope gerektirmez — yerel veri

### Yeni Schemalar
- `VideoStatsTrendItem`: snapshot_at, view_count, like_count, comment_count
- `VideoStatsTrendResponse`: video_id, title, snapshots[]

## Frontend Degisiklikleri

### `frontend/src/api/credentialsApi.ts`
- `VideoStatsTrendItem`, `VideoStatsTrendResponse` interface'leri
- `fetchVideoStatsTrend(videoId)` fonksiyonu

### `frontend/src/hooks/useCredentials.ts`
- `useVideoStatsTrend(videoId)` React Query hook (staleTime: 60s)

### `frontend/src/pages/admin/YouTubeAnalyticsPage.tsx`
- Video tablosu satirlari tiklanabilir — secilen videonun trend verisi asagida gosterilir
- **Trend bolumu** (`data-testid="yt-video-trend-section"`):
  - Snapshot tablosu: tarih, goruntulenme, begeni, yorum
  - Bos durum (`data-testid="yt-trend-empty"`): "Henuz snapshot verisi bulunmuyor. Video istatistikleri her sorgulamada otomatik kaydedilir."
- **Scope notu** (`data-testid="yt-scope-note"`):
  - "Zaman serisi verileri yerel snapshot'lardan olusturulur. YouTube Analytics API (demografik, izlenme suresi, elde tutma orani) icin ek OAuth scope gereklidir ve su an aktif degildir."

## Teknik Detaylar

### Snapshot Birikimi
- Her `/video-stats` cagrisi max 50 video icin snapshot kaydeder
- Frontend 60s staleTime ile cache'liyor — dakikada en fazla 1 snapshot
- Zaman icerisinde organik olarak zaman serisi birikir
- Snapshot veritabaninda kalici — restart/recovery'den etkilenmez

### Trend Endpointi
- Video bazli sorgu — platform_video_id uzerinden
- Snapshot'lar kronolojik sirada doner (snapshot_at ASC)
- PublishRecord'dan title cekilir (payload_json icerisinde)

## Testler

### `backend/tests/test_m14_youtube_analytics.py` — 7 test
1. Model olusturma ve default degerler
2. Schema shape dogrulamasi (VideoStatsTrendResponse)
3. Schema shape dogrulamasi (VideoStatsTrendItem)
4. Trend endpoint bilinmeyen video icin bos liste
5. Trend endpoint kronolojik siralama (out-of-order insert → ASC)
6. Trend field dogrulamasi
7. Mevcut `/video-stats` testleri regresyon yok (4/4 PASSED)

## Kapsam Disi Birakilanlar (Durustce)

- YouTube Analytics API (demographics, watch time, retention) — ek scope gerektirir
- Grafik/chart gorseli — chart kutuphanesi yok, tablo formati yeterli MVP icin
- Snapshot temizleme/compaction — uzun vadede gerekebilir, su an MVP icin gereksiz
- Otomatik periyodik snapshot (cron/scheduler) — su an kullanici sayfayi ziyaret ettiginde birikiyor
