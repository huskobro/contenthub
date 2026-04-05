# M19-C: Content Library Backend Filters + Pagination Hardening Raporu

## Ozet
Standard Video ve News Bulletin list endpoint'lerine backend-side search, status filtresi ve limit/offset sayfalama eklendi. Content Library frontend backend filtrelerine gecirildi.

## Backend Degisiklikleri

### Standard Video (`GET /api/v1/modules/standard-video`)
Yeni parametreler:
- `search`: baslik/konu arama (ilike, case-insensitive)
- `limit`: sayfalama (1-500, varsayilan 100)
- `offset`: sayfalama offset'i
- `status`: mevcut (onceden vardi)

### News Bulletin (`GET /api/v1/modules/news-bulletin`)
Yeni parametreler:
- `status`: durum filtresi (onceden yoktu)
- `search`: baslik/konu arama (ilike, case-insensitive)
- `limit`: sayfalama (1-500, varsayilan 100)
- `offset`: sayfalama offset'i

## Frontend Degisiklikleri

### ContentLibraryPage
- M18'deki istemci tarafli filtreleme kaldirildi.
- Artik tur filtresi React Query key'i ile kontrol ediliyor: `standard_video` secildiginde sadece SV hook'u calisir, `news_bulletin` secildiginde sadece NB hook'u calisir.
- Search ve status filtreleri dogrudan backend'e gonderiliyor.
- Filtre notu "backend tarafinda uygulanir" olarak guncellendi.

### API Client'lar
- `standardVideoApi.ts`: search, limit, offset parametreleri eklendi.
- `newsBulletinApi.ts`: NewsBulletinListParams interface'i + status, search, limit, offset destegi eklendi.

### Hook'lar
- `useStandardVideosList.ts`: limit, offset, search parametreleri queryKey'e dahil edildi.
- `useNewsBulletinsList.ts`: tum parametreler queryKey'e dahil edildi.

## Test Sonuclari
- 10 backend testi: **TAMAMI GECTI** (5 SV + 5 NB)
