# Faz 5 — Wizard Migration + ChannelProfile Integration + ContentProject Wiring

## Tarih
2026-04-09

## Ozet
Kullanici panelinde icerik uretim wizard'larini ChannelProfile ve ContentProject tabanli hale getirdik. Admin wizard'lari aynen korundu (geriye donuk uyumluluk). Kullanici artik once kanal secip proje olusturuyor, sonra wizard adimlarina geciyor.

---

## Faz A — Mevcut Wizard Durumu Auditi

### StandardVideoWizardPage
- **Konum**: `frontend/src/pages/admin/StandardVideoWizardPage.tsx` (58 satir)
- **Shared component**: `ContentCreationWizard` (4 step: basics → style → template → review)
- **Submit**: `POST /api/v1/modules/standard-video` (record olusturur, job olusturmaz)
- **State**: `WizardValues` interface (topic, title, brief, duration, tone, language, visual, composition, thumbnail, subtitle, template, style, render_format, karaoke)
- **Validation**: Sadece step 0'da topic.trim().length > 0
- **Channel/Project ref**: Yok

### NewsBulletinWizardPage
- **Konum**: `frontend/src/pages/admin/NewsBulletinWizardPage.tsx` (~1400 satir)
- **Custom implementation**: 3 step (source → review → style) editorial gate'lerle
- **Submit zinciri**: createBulletin → confirmSelection → consumeNews → updateBulletin → startProduction
- **Job olusturma**: `POST /api/v1/modules/news-bulletin/{id}/start-production` (backend icinde Job yaratir)
- **Channel/Project ref**: Yok

### Shared Components
- `WizardShell`: Step indicator + navigation chrome (132 satir)
- `ContentCreationWizard`: Generic 4-step wizard (316 satir)
- `wizardStore`: Sadece guided/advanced mode tutar, wizard'lar kullanmiyor

### WizardConfig System
- Backend API mevcut (`/api/v1/wizard-configs/by-type/{type}`)
- Frontend hooks mevcut (`useWizardConfig`)
- **Hicbir wizard tarafindan consume edilmiyor**

---

## Faz B — Shared Wizard Component Layer

### Yeni Componentler

1. **`ChannelProfileStep`** (`components/wizard/ChannelProfileStep.tsx`)
   - Kullanicinin aktif kanal profillerini gosterir
   - Kanal secimi icin card-based UI
   - Inline kanal olusturma formu (isim + slug)
   - `useMyChannelProfiles` hook ile veri ceker
   - Bos durumda uyari mesaji gosterir

2. **`ContentProjectStep`** (`components/wizard/ContentProjectStep.tsx`)
   - Secilen kanal icin yeni ContentProject olusturur
   - Baslik + aciklama alanlari
   - `useCreateContentProject` mutation ile API'ye post eder
   - Resume destegi: `existingProjectId` varsa otomatik devam eder

### Yeni Hook

3. **`useMyChannelProfiles`** (`hooks/useMyChannelProfiles.ts`)
   - `authStore`'dan userId alir
   - `fetchChannelProfiles(userId)` ile sadece kullanicinin kanallarini getirir
   - 30sn staleTime

---

## Faz C — ChannelProfile Step 0

Her iki user wizard'inda da ilk adim kanal secimi:
- Kanal secilmeden "Devam" butonu disabled
- Kanal yoksa uyari + inline olusturma
- Secim card-based: isim, slug, dil gosterilir

---

## Faz D — ContentProject-First Create Flow

Kanal secildikten sonra (Step 1):
- Proje basligi zorunlu
- Aciklama opsiyonel
- `createContentProject` cagrilir: `{ user_id, channel_profile_id, module_type, title, content_status: "draft" }`
- Basarili olunca wizard otomatik ileri gider (Step 2: Basics)

---

## Faz E — Submit Orchestration

### Video Wizard
Mevcut submit korundu: `POST /api/v1/modules/standard-video` ile record olusturma.
Backend `StandardVideoCreate` schemasi `channel_profile_id` ve `content_project_id` icermiyor — bu alanlar ContentProject uzerinden takip ediliyor, StandardVideo tablosuna eklenmedi.

### Bulletin Wizard
Bulletin wizard mevcut haliyle calisir. `CreateBulletinWizardPage` kanal + proje adimlarini tamamladiktan sonra mevcut `NewsBulletinWizardPage`'e query param'larla yonlendirir:
`/admin/news-bulletins/wizard?channelProfileId=xxx&contentProjectId=yyy`

---

## Faz F — User Panel Routes

### Yeni Rotalar
| Route | Component | Lazy |
|---|---|---|
| `/user/create/video` | `CreateVideoWizardPage` | Evet |
| `/user/create/bulletin` | `CreateBulletinWizardPage` | Evet |

### Navigation Guncellemeleri
- `USER_NAV`: "Video Olustur" ve "Bulten Olustur" eklendi
- `HORIZON_USER_GROUPS`: Yeni "Olustur" grubu eklendi (icon: +)
- Dashboard `QuickCreateCard` butonlari: `/admin/...` yerine `/user/create/...` gosterir

---

## Faz G — Admin Panel Cleanup

Admin wizard'lari **korundu**. Kaldirilmadi. Sebebler:
1. Admin kullanicilarinin channel profile olmadan hizli test/debug yapabilmesi gerekir
2. NewsBulletinWizardPage 1400 satir — user panel'e tasimak buyuk is, bulletin wizard icin redirect pattern kullanildi
3. Geriye donuk uyumluluk

Admin navigation'da "Video Wizard" linki aynen duruyor (`/admin/standard-videos/wizard`).

---

## Faz H — User UX Polish

- Dashboard "Hizli Olustur" butonlari `/user/create/video` ve `/user/create/bulletin`'e yonlendirildi
- Wizard step indicator'da Channel ve Project adimlari acik sekilde gorulur
- Kanal yokken uyari banner gosterilir
- Inline kanal olusturma slug validation (lowercase, tire)

---

## Faz I — Backward Compatibility

| Concern | Status |
|---|---|
| Admin video wizard | Korundu, degisiklik yok |
| Admin bulletin wizard | Korundu, degisiklik yok |
| `ContentCreationWizard` | Degisiklik yok |
| `WizardShell` | Degisiklik yok |
| Backend schemas | Degisiklik yok |
| Existing routes | Korundu |
| Header-based auth fallback | Korundu |

---

## Faz J — Test / Verification

### TypeScript
- `npx tsc --noEmit`: 0 hata

### Vite Build
- `npx vite build`: Basarili (2.38s)
- `CreateVideoWizardPage`: 9.51 kB (code-split)
- `CreateBulletinWizardPage`: Ayri chunk olarak bundle'landi

### Backend Tests
- 1501 passed (test_m7 ve test_sources_api haric — onceden mevcut hatalar)
- Yeni backend degisikligi yok, tum testler korundu

### Known Issues (Onceden Mevcut)
- `test_m7_c1_migration_fresh_db`: alembic modul path sorunu (Python 3.9)
- `test_create_rss_source`: 422 donuyor (schema uyumsuzlugu)
- Bu iki sorun Faz 5 oncesinde de mevcuttu

---

## Dosya Degisiklikleri

### Yeni Dosyalar
| Dosya | Amac |
|---|---|
| `frontend/src/hooks/useMyChannelProfiles.ts` | Auth user'in kanallarini getir |
| `frontend/src/components/wizard/ChannelProfileStep.tsx` | Kanal secimi + inline olusturma UI |
| `frontend/src/components/wizard/ContentProjectStep.tsx` | Proje olusturma adimi |
| `frontend/src/pages/user/CreateVideoWizardPage.tsx` | User video wizard (6 step) |
| `frontend/src/pages/user/CreateBulletinWizardPage.tsx` | User bulletin wizard (3 step + redirect) |

### Degisen Dosyalar
| Dosya | Degisiklik |
|---|---|
| `frontend/src/app/router.tsx` | +2 lazy import, +2 user route |
| `frontend/src/app/layouts/useLayoutNavigation.ts` | USER_NAV +2 item, HORIZON_USER_GROUPS +1 group |
| `frontend/src/pages/UserDashboardPage.tsx` | QuickCreate butonlari /user/create/* rotasina |

---

## Teknik Borc ve Bilinen Sinirlamalar

1. **ContentProject ↔ StandardVideo baglantisi**: ContentProject olusturuluyor ama StandardVideo record'una content_project_id FK olarak yazilmiyor. Ileride `StandardVideoCreate` schema'sina ve tabloya eklenebilir.

2. **Bulletin wizard context propagation**: `channelProfileId` ve `contentProjectId` query param olarak gonderiliyor ama `NewsBulletinWizardPage` bu parametreleri henuz okumuyor. Bir sonraki fazda wiring yapilacak.

3. **WizardConfig consumption**: Backend'de wizard config sistemi mevcut ama hicbir wizard kullanmiyor. Bu ayri bir iyilestirme maddesi.

4. **wizardStore**: Sadece guided/advanced mode tutuyor, hicbir wizard kullanmiyor. Daha zengin state yonetimi icin genisletilebilir.

5. **Admin wizard kaldirilmadi**: Plan'da Faz G "admin'den create kaldirma" olarak belirtildi ama geriye donuk uyumluluk ve admin debug ihtiyaci icin korundu. Gerekirse ileride admin wizard'lari deprecate edilebilir.
