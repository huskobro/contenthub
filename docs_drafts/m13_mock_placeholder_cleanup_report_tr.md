# M13-D: Mock/Placeholder Temizlik Raporu

## Ozet

Analytics sayfalarindaki placeholder tire isareti (—) ve sahte metrikler gercek API verisine baglanarak temizlendi. Deferred/disabled not metinleri standart "backend entegrasyonu" kalibina uyumlandi.

## Degisiklikler

### `frontend/src/pages/admin/AnalyticsOverviewPage.tsx`
- **Onceki durum**: Metrik kartlari sabit "—" (tire) gosteriyordu
- **Sonraki durum**: React Query hook'lari ile gercek backend API'den veri cekilyor
- Wired metrikler:
  - Toplam yayin sayisi → `/publish/youtube/video-stats` → `video_count`
  - Toplam goruntulenme → `/publish/youtube/video-stats` → `total_views`
  - Toplam begeni → `/publish/youtube/video-stats` → `total_likes`
- Veri kaynaği yokken: "Veri kaynagi yok" label'i gosteriliyor (honest empty state)
- Hata durumunda: "Hata" label'i gosteriliyor
- `filter-disabled-note` metni standart "backend entegrasyonu" kalibina dondu

### `frontend/src/pages/admin/AnalyticsOperationsPage.tsx`
- **Onceki durum**: Job sayilari ve provider_error_rate placeholder idi
- **Sonraki durum**: `/jobs` endpointinden gercek job verileri cekilyor
  - Toplam is sayisi
  - Basarili is sayisi
  - Hatali is sayisi
  - `provider_error_rate`: `failed / total * 100` formulu ile hesaplaniyor
- Veri yokken: honest "0" veya "0.0%" gosteriliyor

### `frontend/src/pages/admin/ContentLibraryPage.tsx`
- `library-filters-deferred` note metni standart "backend entegrasyonu" kalibina dondu
- Eski metin: "Backend status filtresi yalnizca standart video endpointinde mevcut..."
- Yeni metin: "Filtreleme backend entegrasyonu tamamlaninca aktif olacaktir..."

## Standart Not Kalibi

Tum deferred/disabled notlar asagidaki kaliba uyduruldu:
- **Anahtar kelime**: "backend entegrasyonu"
- **Yasak ifadeler**: "ilerideki fazlarda", "backend aktif olunca" (bu ifadeler test suite'leri tarafindan enforce ediliyor)

## Daha Once Zaten Durust Olan Alanlar

- `AnalyticsContentPage` module distribution notu — M12'de duzeltilmisti
- `AnalyticsOperationsPage` source impact notu — M12'de duzeltilmisti
- `StandardVideoDetailPage` manage notu — M12'de duzeltilmisti
- `JobDetailPage` actions paneli — M12'de duzeltilmisti

## Test Sonuclari

- `final-ux-release-readiness-pack.smoke.test.tsx` — 34/34 PASSED
- `library-gallery-content-management-pack.smoke.test.tsx` — tum testler PASSED
- `youtube-analytics-pack.smoke.test.tsx` — tum testler PASSED
- Toplam frontend: 2116/2116 PASSED (5 failure duzeltildi)
