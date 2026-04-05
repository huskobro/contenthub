# M17-C — Channel Overview Raporu

## Ozet

Analytics Overview sayfasindaki "Kanal Ozeti" bolumu artik YouTube yayin kayitlarindan gercek aggregation verisiyle dolu. Eski placeholder kartlar (Toplam Icerik, Aktif Moduller, Sablon Etkisi) kaldirildi ve yerini YouTube yayin metrikleri aldi.

## Yeni Endpoint

`GET /api/v1/analytics/channel?window={window}`

### Yanit Schema: ChannelOverviewMetrics

| Alan | Tip | Aciklama |
|------|-----|----------|
| window | str | Zaman penceresi |
| youtube | YouTubeChannelMetrics | YouTube kanal metrikleri |

### YouTubeChannelMetrics

| Alan | Tip | Aciklama |
|------|-----|----------|
| total_publish_attempts | int | Toplam yayin denemesi |
| published_count | int | Basarili yayin sayisi |
| failed_count | int | Basarisiz yayin sayisi |
| draft_count | int | Taslak sayisi |
| in_progress_count | int | Devam eden (review/schedule/publishing) |
| publish_success_rate | float/null | Basarili / toplam |
| last_published_at | str/null | Son basarili yayin tarihi |
| has_publish_history | bool | Yayin gecmisi var mi |

## Veri Kaynagi

- `publish_records` tablosu, `platform='youtube'` filtresi
- Status aggregation: published, failed, draft, in_progress (pending_review, approved, scheduled, publishing)
- last_published_at: `MAX(published_at)`
- has_publish_history: `total > 0`

## Frontend Degisiklikleri

### AnalyticsOverviewPage — Kanal Ozeti
- 6 metrik karti:
  - YouTube Yayin Denemesi
  - Basarili Yayin
  - Basarisiz Yayin
  - Yayin Basari Orani
  - Devam Eden
  - Son Yayin (tarih)
- Yayin gecmisi yoksa: "Henuz YouTube uzerinde yayin gecmisi bulunmuyor."
- Eski placeholder kartlar tamamen kaldirildi

### Yeni Hook: useChannelOverview
- `src/hooks/useChannelOverview.ts`
- `fetchChannelOverviewMetrics()` API fonksiyonu

## Test Sonuclari

| Test | Durum |
|------|-------|
| `test_channel_endpoint_returns_200` | PASSED |
| `test_channel_schema_fields` | PASSED |
| `test_channel_invalid_window` | PASSED |

## Bilinen Sinirlamalar

1. Baglanti durumu (YouTube OAuth) frontend'de ayri kontrol edilir (`useYouTubeStatus`). Bu endpoint yalnizca publish kayitlarindan bilgi verir.
2. Diger platformlar (Instagram, TikTok vb.) henuz desteklenmiyor — YouTube tek platform.
3. Video bazli performans (goruntulenme, begeni) YouTube Analytics sayfasinda; burada yalnizca publish ozeti.
