# Faz 11 — Publish Flow V2 + Multi-Platform Hazirlik Raporu

## Executive Summary

Faz 11, mevcut publish altyapisini V2'ye tasir. Kullanici panelinde gercek bir project-first publish sayfasi olusturuldu, PlatformConnection publish akisina baglandi, publish_intent_json ve publish_result_json alanlari doldurulmaya baslandi. Multi-platform future-safe contract hazirlandi.

## Backend Degisiklikleri

### Degisen Dosyalar

| Dosya | Degisiklik |
|-------|-----------|
| `app/publish/schemas.py` | +V2 alanlari: `content_project_id`, `platform_connection_id`, `publish_intent_json`, `publish_result_json` Create/Read/Summary semalarina eklendi. +`ConnectionForPublish`, `PublishIntentData` yeni semalar. |
| `app/publish/service.py` | +`get_connections_for_publish()` — kanal icin uygun baglantilari listeler (can_publish flag ile). +`list_publish_records_v2()` — content_project_id/platform_connection_id ile filtreleme. +`update_publish_intent()` — draft'ta intent guncelleme. `create_publish_record()` V2 alanlarini kabul eder. `mark_published()` publish_result_json otomatik doldurur. `create_publish_record_from_job()` V2 alanlarini ve publish_intent_json olusturur. |
| `app/publish/router.py` | +`GET /connections-for-channel/{channel_profile_id}` — publish icin uygun baglantilari dondurur. +`GET /by-project/{content_project_id}` — projeye ait publish kayitlarini listeler. +`PATCH /{record_id}/intent` — publish intent guncelleme. Mevcut `POST /from-job/{job_id}` V2 parametreleri kabul eder. |

### Yeni Endpoint'ler

| Endpoint | Aciklama |
|----------|----------|
| `GET /publish/connections-for-channel/{id}` | Kanal profili icin publish-uygun baglantilari listeler |
| `GET /publish/by-project/{id}` | Content project'e ait publish kayitlarini listeler |
| `PATCH /publish/{id}/intent` | Draft'ta publish intent (title/desc/tags/privacy) gunceller |

### Publish Intent / Result Yapisi

**publish_intent_json** — planlanan yayin bilgileri:
- title, description, tags, privacy_status
- scheduled_at, category_id, playlist_ids
- thumbnail_path, notify_subscribers

**publish_result_json** — gerceklesen yayin sonucu:
- platform_video_id, platform_url
- published_at, attempt_count

### Connection Matching

`get_connections_for_publish()` fonksiyonu:
- channel_profile_id'ye gore PlatformConnection sorgular
- Her baglanti icin `can_publish` flag hesaplar: `connection_status == "connected" AND token_state == "valid"`
- is_primary oncelikli siralama

## Frontend Degisiklikleri

### Yeni Dosyalar

| Dosya | Aciklama |
|-------|----------|
| `src/api/platformConnectionsApi.ts` | PlatformConnection + ConnectionForPublish tipleri, `fetchPlatformConnections()` ve `fetchConnectionsForPublish()` |
| `src/pages/user/UserPublishPage.tsx` | Gercek project-first publish sayfasi |

### Degisen Dosyalar

| Dosya | Degisiklik |
|-------|-----------|
| `src/api/publishApi.ts` | +V2 alanlari (content_project_id, platform_connection_id, publish_intent_json, publish_result_json) tum tiplere eklendi. +`fetchPublishRecordsByProject()`, `updatePublishIntent()`, `PublishIntentData` tipi |
| `src/app/router.tsx` | +UserPublishPage lazy import, `/user/publish` route'u UserPublishPage'e yonlendirildi |

### UserPublishPage Akisi

1. **Proje Secimi**: Completed/in_production projeleri listeler
2. **Proje Ozeti**: Baslik, modul, kanal, durum KPI kartlari
3. **Mevcut Yayin Kayitlari**: Bu projeye ait onceki publish kayitlari tablosu
4. **Platform Baglantisi Secimi**: Kanalin baglantilari radio-button ile, can_publish kontrolu
5. **Yayin Bilgileri Formu**: AssistedComposer ile baslik/aciklama, etiketler, gizlilik
6. **Olustur ve Onaya Gonder**: Publish record olusturur + intent gunceller + submit_for_review cagrir

### AssistedComposer Yeniden Kullanimi

Publish baslik ve aciklama alanlari `AssistedComposer` component'ini kullanir:
- Gelecekte AI oneri hook'u eklenebilir
- maxLength ile karakter siniri
- Ctrl+Enter klavye kisayolu

## Test Sonuclari

| Dosya | Test Sayisi | Sonuc |
|-------|-------------|-------|
| `tests/test_faz11_publish_v2.py` | 10 | 10/10 PASSED |

Test listesi:
1. connections-for-channel endpoint reachable (200)
2. connections-for-channel empty for nonexistent channel
3. create publish record with v2 fields
4. publish intent update on draft
5. publish intent rejected on non-draft (PublishGateViolationError)
6. by-project listing filters correctly
7. publish_result_json populated on mark_published
8. create from job with v2 fields
9. list_publish_records_v2 filters by content_project_id
10. v2 schema fields present in service response

## TypeScript / Build

- `npx tsc --noEmit`: Hatasiz
- `npx vite build`: Basarili

## Kalan Limitasyonlar

1. **Gercek YouTube upload**: Executor ve adapter katmani mevcutta calisiyor, ancak UserPublishPage'den tetikleme sadece submit_for_review'a kadar gidiyor. trigger_publish admin tarafinda yapilir.
2. **PlatformConnection otomatik matching**: Simdilik kullanici elle secer; gelecekte platform + scope bazli otomatik oneri eklenebilir.
3. **Playlist/Post/Comment linkage**: publish_result_json uzerinden bag kurulabilir omurga hazir, ama otomatik linkage henuz yok.
4. **Multi-platform adapter**: YouTube disinda adapter yok, ama contract (platform field + platform_connection_id + intent/result JSON) future-safe.
5. **Best time to publish**: Veri altyapisi hazir (scheduled_at + intent), analiz fonksiyonu deferred.
6. **Subscriber/engagement post-publish tracking**: Platform API entegrasyonu gerekiyor.

## Onceki Bilinen Test Sorunlari

- `test_m7_c1_migration_fresh_db`: Alembic modul yolu (Python 3.9)
- `test_create_rss_source`: 422 sema uyumsuzlugu
