# Faz 9 — Platform Gonderi / Community Post Yonetimi Raporu

## Ozet

Faz 9, platform gonderi (community post) yonetimini ContentHub'a ekler. YouTube community post API'sinin ucuncu taraf gelistiricilere acik olmamasi nedeniyle, draft/orchestration modeli uygulanmistir.

## Teslim Edilen Bilesenler

### Backend

| Dosya | Aciklama |
|-------|----------|
| `app/db/models.py` | PlatformPost modeli (id, platform, post_type, body, status, delivery_status, vb.) |
| `alembic/versions/faz9_add_platform_posts.py` | Migration — platform_posts tablosu, 8 indeks |
| `app/posts/schemas.py` | 6 Pydantic model (PlatformPostResponse, PostCreateRequest, PostUpdateRequest, PostSubmitRequest, PostSubmitResult, PostListParams) |
| `app/posts/service.py` | CRUD + submit + capability check + stats |
| `app/posts/router.py` | 8 endpoint (POST, GET list, GET stats, GET capability, GET detail, PATCH, POST submit, DELETE) |
| `app/api/router.py` | posts_router kaydi |

### Frontend

| Dosya | Aciklama |
|-------|----------|
| `src/api/postsApi.ts` | PlatformPost tipi, 8 API fonksiyonu |
| `src/hooks/usePosts.ts` | 8 React Query hook |
| `src/pages/user/UserPostsPage.tsx` | Kullanici gonderi sayfasi — olusturma, duzenleme, gonderme, silme |
| `src/pages/admin/AdminPostMonitoringPage.tsx` | Admin izleme — user/channel/platform/status filtre, KPI kartlari, tablo |
| `src/app/router.tsx` | UserPostsPage + AdminPostMonitoringPage route'lari |
| `src/app/layouts/useLayoutNavigation.ts` | "Gonderilerim" (user) + "Gonderi Izleme" (admin) navigasyon |

### Testler

| Dosya | Test Sayisi | Sonuc |
|-------|-------------|-------|
| `tests/test_faz9_posts.py` | 11 | 11/11 PASSED |

Test listesi:
1. Post create endpoint (201 + draft status)
2. Post list returns array
3. Post list with filters
4. Post detail 404
5. Post stats endpoint
6. Capability endpoint (youtube community_post = False)
7. Post update (draft only)
8. Post delete (draft only)
9. PlatformPost model creation
10. EngagementTask community_post type
11. Delivery capability check (not_available for youtube)

## Mimari Kararlar

### YouTube Community Post API Kisitlamasi

YouTube Data API v3, community post olusturmayi ucuncu taraf gelistiricilere acmamaktadir. Bu nedenle:

- **PLATFORM_POST_CAPABILITY dict**: Platform bazli delivery registry. youtube.community_post = False.
- **Draft/Orchestration modeli**: Gonderiler taslak olarak olusturulur, submit edildiginde EngagementTask kaydedilir ancak delivery_status="not_available" olarak isaretlenir.
- **Kullanici bilgilendirilir**: Capability notice banner ile API kisitlamasi acikca gosterilir.
- **Future-safe**: API destegi geldiginde adapter pattern ile delivery eklenebilir.

### AssistedComposer Reuse

AssistedComposer, Faz 7'de (yorum yaniti) olusturulup Faz 9'da gonderi olusturma VE gonderi duzenleme icin yeniden kullanildi. Bu, bileseni uc farkli kullanim senaryosunda dogrulamistir.

### EngagementTask Entegrasyonu

`community_post` tipi EngagementTask, submit isleminde otomatik olusturulur. target_object_type="platform_post" olarak kaydedilir.

## TypeScript ve Build Durumu

- `npx tsc --noEmit`: Hatasiz
- `npx vite build`: Basarili (UserPostsPage 9.32 kB chunk)

## Bilinen Kisitlamalar

1. YouTube community post API destegi yok — draft/orchestration modeli aktif
2. Diger platformlar (Twitter/X, Instagram vb.) henuz eklenmedi — PLATFORM_POST_CAPABILITY genisletilebilir
3. AI-assisted gonderi yazimi (AssistedComposer onAiSuggest) henuz backend'e baglanmadi — slot hazir

## Onceki Bilinen Test Sorunlari

Asagidaki test hatalari Faz 9 oncesinden mevcuttur ve bu faz kapsaminda degistirilmemistir:
- `test_m7_c1_migration_fresh_db`: Alembic modul yolu sorunu (Python 3.9)
- `test_create_rss_source`: 422 sema uyumsuzlugu
