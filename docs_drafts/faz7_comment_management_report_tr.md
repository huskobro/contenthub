# Faz 7 — Platform Etkilesim: Yorum Yonetimi Raporu

## Tarih
2026-04-09

## Executive Summary

Faz 7 tamamlandi. Ana hedefler:

1. **SyncedComment Model** — YouTube (ve gelecekte diger platform) yorumlarinin yerel kopyasi, sync/upsert destegi
2. **YouTube Comment Sync** — commentThreads API uzerinden video yorumlarini cekme, pagination, upsert (max 500/sync)
3. **Comment Reply** — YouTube comments.insert API ile yanit gonderme, EngagementTask kaydi
4. **User Panel Comments** — `/user/comments` sayfasi: kanal/platform/durum filtreleri, yorum listesi, detay paneli, yanit composer
5. **Admin Comment Monitoring** — `/admin/comments` sayfasi: tum kullanici/kanal/platform/durum filtreleri, KPI kartlari, sync durumu, yorum tablosu
6. **AssistedComposer** — yeniden kullanilabilir metin composer (manual input + AI onerisi slot'u)
7. **EngagementTask comment_reply** — yorum yaniti aksiyonu izlenebilir gorev olarak kaydedilir
8. **9 backend test** — endpoint, model, upsert, duplicate koruma, EngagementTask

---

## Faz A — Yetenek Denetimi

### YouTube API Scope
- `https://www.googleapis.com/auth/youtube` — full scope, commentThreads + comments okuma/yazma kapsami
- `commentThreads.list` — video yorumlarini cekme (top-level + inline replies)
- `comments.insert` — yorum yaniti gonderme

### Mevcut Altyapi
- YouTubeTokenStore: async access_token alma, otomatik refresh
- httpx pattern: Bearer token auth, async HTTP client
- EngagementTask modeli: mevcut, `type` alani ile genisletilebilir

---

## Faz B — Domain / Data Model

### SyncedComment Model
- **Tablo**: `synced_comments`
- **Dosya**: `backend/app/db/models.py` (line ~1265)
- **Alanlar**:
  - `id` (UUID, PK)
  - `platform` (youtube, gelecekte baska)
  - `platform_connection_id` (FK → platform_connections)
  - `channel_profile_id` (FK → channel_profiles)
  - `content_project_id` (nullable)
  - `external_comment_id` (unique, YouTube comment ID)
  - `external_video_id` (YouTube video ID)
  - `external_parent_id` (nullable, reply ise parent comment ID)
  - `author_name`, `author_channel_id`, `author_avatar_url`
  - `text`, `published_at`, `like_count`, `reply_count`
  - `is_reply` (bool)
  - `reply_status` (none / pending / replied / failed)
  - `our_reply_text`, `our_reply_at`
  - `sync_status` (synced / stale / error)
  - `last_synced_at`, `created_at`, `updated_at`
- **Indexler**: platform, platform_connection_id, channel_profile_id, content_project_id, external_comment_id (unique), external_video_id, external_parent_id

### EngagementTask Genislemesi
- `type="comment_reply"` — yorum yaniti aksiyonu
- `target_object_type="youtube_comment"` — hedef nesne tipi
- `target_object_id` — external_comment_id referansi
- `final_user_input` — gonderilen yanit metni
- `status="executed"` — basarili gonderim

### Alembic Migration
- **Dosya**: `backend/alembic/versions/faz7_add_synced_comments.py`
- **Revision**: `b3e4f5a6c7d8`
- **Down revision**: `9841ba491fcb`
- Idempotent: `_table_exists` + `_index_exists` kontrolleri

---

## Faz C — YouTube Comment Sync

### sync_video_comments Service
- **Dosya**: `backend/app/comments/service.py`
- YouTube `commentThreads.list` API cagrisi
- `part=snippet,replies` — top-level + inline replies
- Pagination: `nextPageToken` ile devam, max 500 yorum/sync
- Upsert: `external_comment_id` uzerinden — mevcut ise guncelle, yoksa ekle
- Error handling: 403 (kota), 404 (video bulunamadi), genel HTTP hatalari
- Token: `YouTubeTokenStore.get_access_token()` ile Bearer auth

### Upsert Mantigi
- `_upsert_comment()` helper: SELECT by external_comment_id → UPDATE (text, like_count, reply_count, author_name, author_avatar_url) veya INSERT
- `(is_new, is_updated)` tuple donusu — metriklendirme icin

---

## Faz D — User Panel Comments Sayfasi

### UserCommentsPage
- **Dosya**: `frontend/src/pages/user/UserCommentsPage.tsx`
- **Route**: `/user/comments`
- **Filtreler**: kanal profili, platform, yanit durumu
- **Yorum listesi**: avatar, yazar adi, zaman damgasi, yorum metni (2 satir), begeni, yanit sayisi, durum badge'i
- **Detay paneli**: tam metin, meta bilgi, onceki yanitimiz (varsa), sync butonu
- **Responsive**: 3+2 kolon grid (lg), tek kolon (mobil)

---

## Faz E — Manuel Yanit Akisi

### Reply Workflow
1. Kullanici yorum secer → detay paneli acilir
2. AssistedComposer ile yanit yazar
3. "YouTube'a Gonder" butonu → `POST /comments/{id}/reply`
4. Backend: YouTube API'ye yanit gonder → SyncedComment.reply_status guncelle → EngagementTask olustur
5. Basari/hata mesaji gosterilir
6. Yanit gonderildikten sonra composer kapanir, onceki yanitimiz gosterilir

### reply_to_comment Service
- parentId belirle: top-level ise kendi external_comment_id, reply ise external_parent_id
- `comments.insert` API cagrisi
- Basarisiz: reply_status="failed", hata mesaji dondur
- Basarili: reply_status="replied", our_reply_text/our_reply_at guncelle, EngagementTask olustur

---

## Faz F — AssistedComposer

### Komponent
- **Dosya**: `frontend/src/components/engagement/AssistedComposer.tsx`
- **Reuse**: yorum yaniti, gelecekte playlist aciklamasi, gonderi basligi vb.
- **Props**:
  - `value/onChange` — kontrollü metin state
  - `onSubmit` — gonder aksiyonu
  - `placeholder`, `submitLabel`, `maxLength`
  - `disabled`, `loading`
  - `onAiSuggest` — opsiyonel AI onerisi callback'i (varsa "AI ile Oner" butonu gosterilir)
  - `aiSuggestion`, `aiLoading` — AI onerisi gosterim/uygulama
  - `contextLabel` — baslik etiketi
- **Ozellikler**:
  - Ctrl+Enter ile gonder
  - Karakter sayaci (soft limit)
  - AI onerisi chip'i (Kullan/Kapat)
  - Gelecek AI entegrasyonu icin hazir slot

---

## Faz G — Admin Comment Monitoring

### AdminCommentMonitoringPage
- **Dosya**: `frontend/src/pages/admin/AdminCommentMonitoringPage.tsx`
- **Route**: `/admin/comments`
- **Filtreler**: kullanici, kanal profili, platform, yanit durumu (cascading: user secimi kanal listesini daraltiyor)
- **KPI kartlari**: Toplam Yorum, Cevaplanmis, Cevaplanmamis, Basarisiz
- **Sync durumu**: video bazinda yorum sayisi ve son sync zamani
- **Yorum tablosu**: yazar, yorum (2 satir), video, platform, durum badge, begeni, tarih

---

## Faz H — Baglanti Sagligi

- YouTube token store ile auth durumu kontrol edilir
- Sync endpointi auth hatalarini yakalayip dondurur
- 403 (kota asimi), 404 (video bulunamadi) hatalari ayrı islenir
- Sync status endpointi video bazinda son basarili sync zamanini gosterir
- Baglanti kesik / scope yetersiz durumlari kullaniciya iletilir

---

## Degisen Dosyalar

### Yeni Dosyalar
| Dosya | Amac |
|---|---|
| `backend/app/comments/__init__.py` | Comments modulu |
| `backend/app/comments/schemas.py` | Pydantic schemas (6 model) |
| `backend/app/comments/service.py` | Sync, list, reply, sync-status servisleri |
| `backend/app/comments/router.py` | 5 endpoint (sync, list, sync-status, detail, reply) |
| `backend/alembic/versions/faz7_add_synced_comments.py` | synced_comments tablo migrasyonu |
| `backend/tests/test_faz7_comments.py` | 9 backend testi |
| `frontend/src/api/commentsApi.ts` | Comments API client |
| `frontend/src/hooks/useComments.ts` | React Query hooks (5 hook) |
| `frontend/src/components/engagement/AssistedComposer.tsx` | Reusable metin composer |
| `frontend/src/pages/user/UserCommentsPage.tsx` | User yorum yonetimi sayfasi |
| `frontend/src/pages/admin/AdminCommentMonitoringPage.tsx` | Admin yorum izleme sayfasi |
| `docs_drafts/faz7_comment_management_report_tr.md` | Bu rapor |

### Degisen Dosyalar
| Dosya | Degisiklik |
|---|---|
| `backend/app/db/models.py` | +SyncedComment model |
| `backend/app/api/router.py` | +comments_router kaydı |
| `frontend/src/app/router.tsx` | +UserCommentsPage, +AdminCommentMonitoringPage lazy import + route |
| `frontend/src/app/layouts/useLayoutNavigation.ts` | +Yorumlar (user nav), +Yorum Izleme (admin nav), +Horizon nav gruplari |

---

## Test Sonuclari

### Backend
- **9/9 passed** (Faz 7 testleri)
  1. `test_sync_endpoint_reachable` — PASSED
  2. `test_comment_list_returns_array` — PASSED
  3. `test_comment_list_with_filters` — PASSED
  4. `test_comment_detail_404` — PASSED
  5. `test_sync_status_returns_array` — PASSED
  6. `test_reply_404_on_nonexistent` — PASSED
  7. `test_synced_comment_model_creation` — PASSED
  8. `test_duplicate_comment_protection` — PASSED
  9. `test_engagement_task_comment_reply_type` — PASSED

### Frontend
- TypeScript: 0 hata
- Vite build: basarili (2.42s)

---

## Kalan Limitasyonlar

1. **AI onerisi henuz aktif degil** — AssistedComposer'da `onAiSuggest` slot'u hazir ama backend'de AI suggestion endpointi yok. Gelecek fazda eklenebilir.

2. **Sync otomasyonu yok** — Yorumlar sadece manuel tetikleme ile sync ediliyor. Cron/scheduler ile otomatik sync ileri fazda eklenebilir.

3. **User scope backend-side enforce edilmiyor** — UserCommentsPage frontend'de channel_profile_id ile filtreler ama backend tum yorumlari dondurur. User scope enforce'u ileri fazda eklenebilir.

4. **Reply sadece YouTube** — Diger platformlar icin reply adapter'i henuz yok. Platform genisletme icin service katmaninda adapter pattern hazir.

5. **Comment pagination** — Frontend limit=100 ile calisiyor. Buyuk yorum setlerinde infinite scroll veya sayfalama eklenebilir.

6. **Admin reply yetenegi yok** — Admin monitoring sayfasi sadece izleme amacli. Admin'den direkt reply gondermek icin ek UI eklenebilir.

7. **Sync quota korumasi basit** — MAX_COMMENTS_PER_SYNC=500 sabit limit. Daha akilli kota yonetimi (gunluk limit, rate limiting) ileri fazda eklenebilir.
