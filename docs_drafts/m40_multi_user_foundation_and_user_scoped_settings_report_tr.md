# M40 — Multi User Foundation & User-Scoped Settings Report

**Tarih:** 2026-04-07
**Durum:** Tamamlandi
**Kapsam:** Coklu kullanici temeli, kullanici bazli ayar override sistemi, admin yonetim yuzleri, sidebar kullanici degistirici, onboarding entegrasyonu

---

## 1. Ozet

M40, ContentHub'in coklu kullanici temelini kurar. Kullanici modeli (slug, rol, durum), ayar governance katmani (user_override_allowed, visible_to_user, read_only_for_user), kullanici bazli override mekanizmasi ve ilgili admin/user yuzlerini icerir.

**Temel tasarim kararlari:**
- Localhost-first: sifre/JWT/OAuth yok, header-based identity (`X-ContentHub-User-Id`)
- Ayar cozumleme zinciri: user_override → admin_value → default_value → env → builtin_default
- Ayri `UserSettingOverride` tablosu — Setting tablosuna dokunulmaz
- Zustand + localStorage ile aktif kullanici durumu (oturum ve sayfa yenilemeleri arasinda korunur)

---

## 2. Backend Degisiklikleri

### 2.1 Veritabani Modelleri (`backend/app/db/models.py`)
- **User modeline `slug` kolonu eklendi** — String(100), unique, indexed
- **`UserSettingOverride` modeli eklendi** — id, user_id (FK CASCADE), setting_key, value_json, timestamps
- UniqueConstraint: `(user_id, setting_key)` — ayni kullanici ayni ayari iki kez override edemez

### 2.2 Alembic Migration (`b3c4d5e6f7a8_m40_add_user_slug_and_setting_overrides.py`)
- Users tablosuna slug kolonu eklendi + unique index
- user_setting_overrides tablosu olusturuldu
- Mevcut kullanicilara slug backfill (slugify fonksiyonu ile)
- down_revision: `a2b3c4d5e6f7`

### 2.3 Kullanici Modulu (`backend/app/users/`)
- **slugify.py** — unicode normalize → ascii → lowercase → hyphen, benzersizlik garantisi
- **schemas.py** — UserCreate, UserUpdate, UserResponse (override_count ile), UserOverrideResponse, UserOverrideSetRequest
- **service.py** — list_users (override count subquery), create_user (auto slug), update_user (re-slug), delete_user (soft-delete), set_user_override (governance check + upsert), delete_user_override
- **router.py** — REST endpoints:
  - `GET/POST /users`, `GET/PATCH/DELETE /users/{user_id}`
  - `GET /users/{user_id}/overrides`
  - `PUT /users/{user_id}/settings/{setting_key:path}`
  - `DELETE /users/{user_id}/settings/{setting_key:path}`

### 2.4 Settings Resolver Genisletmesi (`settings_resolver.py`)
- `resolve()`, `explain()`, `list_effective()`, `resolve_group()`, `resolve_for_runtime()` fonksiyonlari `user_id` parametresi alir
- user_override_allowed=True olan ayarlar icin UserSettingOverride tablosu kontrol edilir
- explain() sonucunda M40 governance alanlari (has_user_override, user_override_value, user_override_allowed, visible_to_user, read_only_for_user, visible_in_wizard) doner

### 2.5 Settings Router Guncellemesi (`settings/router.py`)
- `EffectiveSettingResponse`'a M40 governance alanlari eklendi
- `/settings/effective` ve `/settings/effective/{key}` endpointleri `get_active_user_id` dependency ile user_id alir
- Kullanici header'i varsa resolver'a iletilir, yoksa None (admin/global gorunum)

### 2.6 Aktif Kullanici Dependency (`visibility/dependencies.py`)
- `get_active_user_id()` — `X-ContentHub-User-Id` header'indan okur, minimum 32 karakter UUID kontrolu

### 2.7 Kullanici-Scoped Workspace (`jobs/workspace.py`)
- `get_user_workspace_root(user_slug)` — `workspace/users/{slug}/`
- `create_user_workspace(user_slug)` — jobs + exports dizinleri olusturur
- `get_user_job_workspace_path(user_slug, job_id)` — `workspace/users/{slug}/jobs/{job_id}/`
- `create_user_job_workspace(user_slug, job_id)` — artifacts, preview, tmp alt-dizinleri

### 2.8 KNOWN_SETTINGS Genislemesi
- `system.active_user_id` eklendi (group: system, type: string)

---

## 3. Frontend Degisiklikleri

### 3.1 API Katmani
- **usersApi.ts** — fetchUsers, fetchUser, createUser, updateUser, deleteUser, fetchUserOverrides, setUserOverride, deleteUserOverride
- **effectiveSettingsApi.ts** — EffectiveSetting tipine M40 alanlari eklendi (has_user_override, user_override_value, user_override_allowed, visible_to_user, read_only_for_user, visible_in_wizard)
- **client.ts** — `getActiveUserHeaders()` localStorage'dan okur, tum isteklere `X-ContentHub-User-Id` header'i ekler

### 3.2 State Yonetimi
- **userStore.ts** (Zustand) — activeUserId, localStorage'a `contenthub:active-user-id` key ile persist

### 3.3 React Query Hooks (`hooks/useUsers.ts`)
- useUsers, useUser, useActiveUser (store + query birlesimi)
- useCreateUser, useUpdateUser, useDeleteUser
- useUserOverrides, useSetUserOverride, useDeleteUserOverride

### 3.4 UI Bilesenleri
- **UserSwitcher.tsx** — Sidebar'da kullanici degistirme dropdown'u, avatar, rol badge, aktif gosterge, auto-select (ilk kullanici)
- **AppSidebar.tsx** — UserSwitcher entegrasyonu (alt kisimda border-t icinde)

### 3.5 Sayfalar
- **UsersRegistryPage.tsx** (`/admin/users`) — Kullanici olusturma formu + tablo (avatar, isim, slug, rol, durum, override sayisi, islemler)
- **UserSettingsDetailPage.tsx** (`/admin/users/:userId/settings`) — Admin gorunumu: effective deger, kaynak badge, override degeri, governance badge'leri, sifirla butonu
- **UserSettingsPage.tsx** (`/user/settings`) — Kullanici gorunumu: visible_to_user ayarlar, inline editing (override_allowed && !read_only), ozellestirildi/varsayilan badge, sifirla butonu

### 3.6 Onboarding Entegrasyonu
- **OnboardingUserSetupScreen.tsx** — OS username'den pre-fill, admin kullanici olusturma, userStore'a set, mevcut kullanici varsa auto-skip
- **OnboardingWorkspaceSetupScreen.tsx** — activeUser.slug kullanarak varsayilan yollar
- **OnboardingPage.tsx** — user-setup adimi eklendi (provider-setup → user-setup → workspace-setup)

### 3.7 Navigasyon
- **router.tsx** — `/admin/users`, `/admin/users/:userId/settings`, `/user/settings` route'lari
- **useLayoutNavigation.ts** — Admin nav'da "Kullanicilar" seksiyonu, User nav'da "Ayarlarim"

---

## 4. Ayar Cozumleme Zinciri (Resolution Chain)

```
user_override (UserSettingOverride tablosu, user_override_allowed=True ise)
  → admin_value (Setting.admin_value_json)
    → default_value (Setting.default_value_json)
      → env (.env / ortam degiskeni)
        → builtin_default (KNOWN_SETTINGS tanimindaki varsayilan)
```

Her katmanda deger bulunamazsa bir sonraki katmana gecer. `explain()` fonksiyonu source alaninda hangi katmanin kazandigini raporlar.

---

## 5. Governance Alanlari

| Alan | Tip | Aciklama |
|------|-----|----------|
| user_override_allowed | bool | Kullanici bu ayari override edebilir mi |
| visible_to_user | bool | Kullanici panelinde gorunur mu |
| read_only_for_user | bool | Kullanici gorebilir ama degistiremez |
| visible_in_wizard | bool | Onboarding/wizard adimlannda gorunur mu |

Bu alanlar Setting tablosunda saklanir ve admin tarafindan yonetilir. Frontend bu alanlara gore edit/view/hide kararlari verir.

---

## 6. Test Sonuclari

### Backend
- **968 test passed**, 1 failed (pre-existing, M5 RSS scan engine — M40 ile ilgisiz)
- **114 settings/user testleri passed** (0 fail)

### Frontend
- TypeScript compile: **0 error**
- Sayfa render dogrulamasi (preview eval):
  - `/admin/users` — 2 kullanici satiri gorunuyor
  - `/user/settings` — "Ayarlarim" baslik, visible ayarlar listeleniyor
  - `/admin/users/:id/settings` — Kullanici ayar detayi, governance badge'leri gorunuyor
  - Sidebar UserSwitcher — aktif kullanici gorunuyor, localStorage persist calisiyor

### API Flow Dogrulamasi (curl)
- `PUT /users/{id}/settings/system.workspace_root` → 200, override kaydi olusturuldu
- `GET /settings/effective/system.workspace_root` + `X-ContentHub-User-Id` header → source=user_override, deger override'dan geliyor
- `GET /settings/effective/system.workspace_root` (header yok) → source=default, override uygulanmiyor
- `DELETE /users/{id}/settings/system.workspace_root` → 204, override silindi
- Override silindikten sonra → source=default, has_user_override=false

---

## 7. Bilinen Sinirlamalar ve Ertelenen Isler

1. **Job owner_id wire**: Job olusturma endpoint'ine `get_active_user_id` dependency henuz eklenmedi. Mevcut job'lar owner_id olmadan calismaya devam eder. Sonraki milestone'da tamamlanacak.
2. **system.output_dir**: Ayri bir KNOWN_SETTINGS key'i olarak tanimlanmadi. Workspace setup ekraninda goruntusel olarak var ama sadece workspace_root kaydediliyor.
3. **read_only_for_user icin admin toggle**: Admin panelinde governance flag'larini degistirmek icin ayri bir UI yok. DB'den veya bulk-update endpoint'inden yonetilebilir.
4. **Visibility enforcement server-side**: visible_to_user=false olan ayarlar effective endpoint'ten filtreleniyor (admin olmayan roller icin). Ancak user override endpoint'i bu kontrolu yapmaz — governance sadece user_override_allowed uzerinden.

---

## 8. Dosya Listesi

### Yeni Dosyalar
- `backend/app/users/__init__.py`
- `backend/app/users/slugify.py`
- `backend/app/users/schemas.py`
- `backend/app/users/service.py`
- `backend/app/users/router.py`
- `backend/alembic/versions/b3c4d5e6f7a8_m40_add_user_slug_and_setting_overrides.py`
- `frontend/src/api/usersApi.ts`
- `frontend/src/stores/userStore.ts`
- `frontend/src/hooks/useUsers.ts`
- `frontend/src/components/layout/UserSwitcher.tsx`
- `frontend/src/components/onboarding/OnboardingUserSetupScreen.tsx`
- `frontend/src/pages/admin/UsersRegistryPage.tsx`
- `frontend/src/pages/admin/UserSettingsDetailPage.tsx`
- `frontend/src/pages/UserSettingsPage.tsx`

### Degistirilen Dosyalar
- `backend/app/db/models.py` — User.slug + UserSettingOverride model
- `backend/app/api/router.py` — users_router registered
- `backend/app/settings/settings_resolver.py` — user_id parameter, UserSettingOverride import
- `backend/app/settings/router.py` — M40 response fields + user_id dependency
- `backend/app/visibility/dependencies.py` — get_active_user_id
- `backend/app/jobs/workspace.py` — user-scoped workspace functions
- `frontend/src/api/client.ts` — X-ContentHub-User-Id header injection
- `frontend/src/api/effectiveSettingsApi.ts` — M40 fields in EffectiveSetting type
- `frontend/src/app/router.tsx` — new routes
- `frontend/src/app/layouts/useLayoutNavigation.ts` — nav items
- `frontend/src/components/layout/AppSidebar.tsx` — UserSwitcher integration
- `frontend/src/components/onboarding/OnboardingWorkspaceSetupScreen.tsx` — user slug paths
- `frontend/src/pages/OnboardingPage.tsx` — user-setup step

---

## 9. Sonuc

M40, ContentHub'in coklu kullanici temelini basariyla kurar. Ayar governance mekanizmasi (override izni, gorunurluk, salt-okunur), kullanici-scoped workspace yapisi ve admin/user yuzleri tamamdir. Sistem localhost-first felsefesine sadik kalir — authentication olmadan header-based identity kullanir. Sonraki milestone'larda job owner_id wire'lama ve ek governance admin yuzleri eklenebilir.
