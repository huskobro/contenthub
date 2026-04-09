# Faz 5a — Project/Channel Wiring Closure Report

## Tarih
2026-04-09

## Executive Summary

Faz 5'in domain wiring tarafindaki 2 kritik gap kapatildi:
1. **StandardVideo ↔ ContentProject** gercek FK wiring tamamlandi (DB kolon + schema + service + frontend)
2. **NewsBulletinWizardPage** artik `channelProfileId` ve `contentProjectId` query param'larini gercekten okuyor ve bulletin create payload'ina yaziyor

Ek olarak:
- Job response artik `channel_profile_id`, `content_project_id`, `trigger_source` dönüyor
- Bulletin start-production artik Job'a channel/project baglamini aktariyor
- Bulletin start-production artik ContentProject.active_job_id'yi güncelliyor
- Proje detay sayfasi (ProjectDetailPage) placeholder'dan gercek sayfaya donustu
- 6 yeni backend wiring testi yazildi ve gecti

---

## Root Causes

### Gap 1: StandardVideo ↔ ContentProject
- `standard_videos` tablosunda `content_project_id` kolonu yoktu
- `StandardVideoCreate` schema'si bu alani kabul etmiyordu
- Frontend `CreateVideoWizardPage` bu degeri topluyordu ama backend'e gondermiyordu
- `list_standard_videos_with_artifact_summary` fonksiyonu manuel response olusturuyordu ve yeni alani icermiyordu

### Gap 2: NewsBulletin Query Param Consumption
- `NewsBulletinWizardPage` sadece `bulletinId` query param'ini okuyordu
- `channelProfileId` ve `contentProjectId` params'i tamamen ignore ediliyordu
- `NewsBulletinCreate` schema'si bu alanlari kabul etmiyordu
- `news_bulletins` tablosunda bu kolonlar yoktu
- `create_news_bulletin` fonksiyonu bu alanlari ORM nesnesine aktarmiyordu
- Bulletin list response constructor bu alanlari icermiyordu

---

## Standard Video Tarafinda Ne Baglandi

### DB
- `standard_videos` tablosuna `content_project_id VARCHAR(36)` nullable kolon eklendi
- `ix_standard_videos_content_project_id` index olusturuldu
- Alembic migration: `9841ba491fcb`

### Backend
- `StandardVideoCreate` schema'sina `content_project_id: Optional[str] = None` eklendi
- `StandardVideoResponse` schema'sina `content_project_id: Optional[str] = None` eklendi
- `list_standard_videos_with_artifact_summary` fonksiyonunda response constructor'a `content_project_id=v.content_project_id` eklendi
- `create_standard_video` zaten `**payload.model_dump()` kullandigi icin otomatik calisti

### Frontend
- `CreateVideoWizardPage` artik `content_project_id: values.contentProjectId` gonderir
- Submit sonrasi `contentProjectId` varsa `/user/projects/{id}` sayfasina yonlendirir

---

## News Bulletin Tarafinda Ne Baglandi

### DB
- `news_bulletins` tablosuna `content_project_id VARCHAR(36)` ve `channel_profile_id VARCHAR(36)` nullable kolonlar eklendi
- Her ikisi icin index olusturuldu

### Backend
- `NewsBulletinCreate` schema'sina her iki alan eklendi
- `NewsBulletinUpdate` schema'sina her iki alan eklendi
- `NewsBulletinResponse` schema'sina her iki alan eklendi
- `create_news_bulletin` fonksiyonuna `content_project_id=payload.content_project_id, channel_profile_id=payload.channel_profile_id` eklendi
- Bulletin list response constructor'a her iki alan eklendi
- `start_bulletin_production` fonksiyonunda:
  - `JobCreate` payload'ina `channel_profile_id` ve `content_project_id` aktariliyor (bulletin'den)
  - Eger `content_project_id` varsa, ilgili `ContentProject.active_job_id` ve `current_stage` guncelleniyor

### Frontend
- `NewsBulletinWizardPage` artik `searchParams.get("channelProfileId")` ve `searchParams.get("contentProjectId")` okuyor
- `createBulletinMut` payload'ina bu degerler spread ediliyor
- Production basarili olunca `contextContentProjectId` varsa `/user/projects/{id}` sayfasina yonlendiriliyor

---

## Job Tarafinda Ne Baglandi

### Backend
- `JobCreate` schema'sina `channel_profile_id: Optional[str] = None` ve `content_project_id: Optional[str] = None` eklendi
- `JobResponse` schema'sina `channel_profile_id`, `content_project_id`, `trigger_source` eklendi
- Bu degerler Job model'de zaten mevcuttu (Faz 2), ama create ve response tarafinda eksikti

### Frontend
- `JobResponse` interface'ine `channel_profile_id?`, `content_project_id?`, `trigger_source?` eklendi (optional — backward compat)

---

## Project-First Landing

- `ProjectDetailPage` (`pages/user/ProjectDetailPage.tsx`) olusturuldu
- Placeholder `div` kaldirildi, gercek sayfa router'a baglandi
- Sayfa sunlari gosteriyor:
  - Proje genel bilgileri (modul, durum, oncelik, tarih)
  - Aktif job linki
  - Projeye bagli tum job'larin listesi
  - Aksiyonlar (projelere don)
- Video wizard submit sonrasi `contentProjectId` varsa bu sayfaya yonlendiriyor
- Bulletin wizard production sonrasi `contextContentProjectId` varsa bu sayfaya yonlendiriyor

---

## Degisen Dosyalar

### Yeni Dosyalar
| Dosya | Amac |
|---|---|
| `backend/alembic/versions/9841ba491fcb_...py` | DB migration: 3 yeni kolon + 3 index |
| `backend/tests/test_faz5a_project_channel_wiring.py` | 6 wiring testi |
| `frontend/src/pages/user/ProjectDetailPage.tsx` | Proje detay sayfasi |

### Degisen Backend Dosyalar
| Dosya | Degisiklik |
|---|---|
| `backend/app/db/models.py` | StandardVideo +content_project_id, NewsBulletin +content_project_id +channel_profile_id |
| `backend/app/modules/standard_video/schemas.py` | Create + Response'a content_project_id |
| `backend/app/modules/standard_video/service.py` | List response constructor'a content_project_id |
| `backend/app/modules/news_bulletin/schemas.py` | Create + Update + Response'a content_project_id + channel_profile_id |
| `backend/app/modules/news_bulletin/service.py` | create_news_bulletin'e alanlar, list response'a alanlar, start_production'da Job ve ContentProject linkage |
| `backend/app/jobs/schemas.py` | JobCreate'e channel/project, JobResponse'a channel/project/trigger |

### Degisen Frontend Dosyalar
| Dosya | Degisiklik |
|---|---|
| `frontend/src/api/jobsApi.ts` | JobResponse interface'e 3 optional field |
| `frontend/src/pages/user/CreateVideoWizardPage.tsx` | content_project_id payload'a eklendi, submit sonrasi proje detaya yonlendirme |
| `frontend/src/pages/admin/NewsBulletinWizardPage.tsx` | Query param consumption, bulletin create payload'ina channel/project, production sonrasi proje detaya yonlendirme |
| `frontend/src/app/router.tsx` | ProjectDetailPage lazy import + route degisikligi |

---

## Test Sonuclari

### Backend
- **1507 passed** (onceki: 1501 — +6 yeni wiring testi)
- Bilinen onceden mevcut hatalar: test_m7 (alembic path), test_sources_api (schema uyumsuzlugu)

### Yeni Wiring Testleri (6/6 passed)
1. `test_standard_video_create_with_content_project_id` — PASSED
2. `test_standard_video_create_without_content_project_id` — PASSED (backward compat)
3. `test_news_bulletin_create_with_project_and_channel` — PASSED
4. `test_news_bulletin_create_without_linkage` — PASSED (backward compat)
5. `test_job_response_includes_linkage_fields` — PASSED
6. `test_standard_video_list_includes_content_project_id` — PASSED

### Frontend
- TypeScript: 0 hata
- Vite build: basarili (2.54s)

---

## Kalan Limitasyonlar

1. **StandardVideo tablosunda channel_profile_id yok** — ContentProject zaten channel_profile_id tutuyor, dolayisiyla StandardVideo icin gereksiz duplikasyon. Gerekirse ContentProject uzerinden join yapilabilir.

2. **Admin wizard'larinda channel/project yok** — Admin video wizard (`StandardVideoWizardPage`) hala eski akisi kullaniyor (channel/project olmadan). Bu bilerek korundu — admin debug icin.

3. **ContentProject.active_job_id sadece bulletin'de guncelleniyor** — StandardVideo akisinda job olusturma henuz yok (sadece record olusturuyor), dolayisiyla active_job_id guncellenmiyor. StandardVideo pipeline calistiginda bu wiring de eklenecek.

4. **ProjectDetailPage'de linked content entity gosterilmiyor** — Proje detayinda hangi StandardVideo veya NewsBulletin bagli oldugu gosterilmiyor. Bunun icin bir ters query gerekiyor (content_project_id'ye gore StandardVideo/NewsBulletin arama). Ileride eklenebilir.

5. **CreateBulletinWizardPage → NewsBulletinWizardPage redirect'inde context kaybi riski** — Query param'lar URL'de acik sekilde duruyor. Zustand store ile tasimak daha temiz olabilir ama simdilik calisir durumda.
