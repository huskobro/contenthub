# M26 — Server-Backed Discovery

## Ozet
ContentHub command palette'inin gercek bir operator discovery merkezi olmasini saglayan server-backed arama altyapisi.

## Backend Degisiklikleri

### Yeni: Discovery Modulu
- `backend/app/discovery/router.py` — `GET /api/v1/discovery/search?q=...&limit=5`
- `backend/app/discovery/service.py` — Tum entity'lerde birlesik ilike arama
- `backend/app/discovery/schemas.py` — DiscoveryResult + DiscoveryResponse modelleri
- `backend/app/api/router.py` — Discovery router kaydi

### Aranan Kategoriler
| Kategori | Aranan Alan | Route Pattern |
|----------|-------------|---------------|
| job | module_type, id | /admin/jobs/{id} |
| content (SV) | title, topic | /admin/content/standard-video/{id} |
| content (NB) | title, topic | /admin/content/news-bulletin/{id} |
| template | name | /admin/templates/{id} |
| style_blueprint | name | /admin/style-blueprints/{id} |
| source | name | /admin/sources/{id} |
| news_item | title | /admin/news-items/{id} |
| asset | name (service uzerinden) | /admin/assets/{id} |

### Mevcut Endpoint'lere Eklenen Arama
- `GET /api/v1/jobs?search=...` — module_type + id uzerinde ilike
- `GET /api/v1/sources?search=...` — name uzerinde ilike
- `GET /api/v1/templates?search=...` — name uzerinde ilike
- `GET /api/v1/style-blueprints?search=...` — name uzerinde ilike
- `GET /api/v1/news-items?search=...` — title uzerinde ilike

## Frontend Entegrasyonu

### useDiscoverySearch Hook
- `frontend/src/hooks/useDiscoverySearch.ts`
- React Query + 300ms debounce
- 2+ karakter sorgu esiginde tetiklenir
- Sonuclar Command-compatible objelerine map edilir
- Kategori bazli ikonlar (📋 job, 📚 content, 📡 source vb.)

### CommandPalette Entegrasyonu
- 2+ karakter yazildiginda server discovery otomatik calisir
- Discovery sonuclari "Bulunan Kayitlar" grubu altinda gosterilir
- Yukleniyor durumunda ⏳ ikonu ve "Araniyor..." mesaji
- Discovery sonuclarina tiklamak ilgili detay sayfasina yonlendirir
- Statik komut sonuclari ve discovery sonuclari birlikte gosterilir

## Kararlar
- Asset aramasi disk taramasi yerine mevcut asset service uzerinden yapilir
- Discovery endpointi fail-safe: tekil kategori hatasi tum aramayi kirmaz
- Kategori basina limit parametresi (varsayilan 5, max 10)
- staleTime: 30sn — tekrarlanan sorgular cache'ten gonderilir
