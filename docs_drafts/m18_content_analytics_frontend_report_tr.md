# M18-B: Icerik Analytics Frontend Raporu

## Ozet
AnalyticsContentPage backend verisiyle beslenen gercek metrik sayfasina donusturuldu.

## Degisiklikler

### `frontend/src/hooks/useContentMetrics.ts` (yeni)
- React Query hook'u: fetchContentMetrics ile backend'den veri ceker.
- window parametresine gore queryKey olusturur.
- 30sn staleTime ile cache'lenir.

### `frontend/src/api/analyticsApi.ts`
- `ModuleDistribution`, `ContentTypeBreakdown`, `ContentMetrics` interface'leri eklendi.
- `fetchContentMetrics()` fonksiyonu eklendi (OverviewFetchOptions destekli).

### `frontend/src/pages/admin/AnalyticsContentPage.tsx` (yeniden yazildi)
- Kaldirildi: Video Performans Tablosu (deferred placeholder), modul dagilimi deferred metni.
- Eklendi:
  - Zaman penceresi secici (last_7d, last_30d, last_90d, all_time).
  - Ozet metrik kartlari: Toplam Icerik, Yayinlanan, Ort. Yayina Kadar, Aktif Sablon, Aktif Blueprint.
  - Icerik Tipi Kirilimi bolumu (standard_video / news_bulletin).
  - Modul Dagilimi tablosu: modul, toplam is, tamamlanan, basarisiz, basari orani.
  - Yukleniyor ve hata durumlari.

## Kaldirildi
- `video-performance-empty` testId (artik mevcut degil).
- `module-distribution-deferred` testId (artik gercek tablo var).

## Test Guncellemeleri
- 5 test dosyasi guncellendi:
  - youtube-analytics-pack: video-performance testleri → window selector + async module distribution.
  - final-ux-release-readiness-pack: deferred → aktif kontrolleri.
  - reporting-business-intelligence-pack: async waitFor eklendi, MOCK_CONTENT_METRICS eklendi.
  - Tum dosyalara MOCK_CONTENT_METRICS mock verisi eklendi.
