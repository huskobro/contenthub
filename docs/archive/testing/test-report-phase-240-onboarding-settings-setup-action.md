# Test Report — Phase 240: Onboarding Settings Setup Required Action

**Tarih:** 2026-04-03
**Faz:** 240 (Ana Faz 1 / Alt Faz 1.5)
**Baslik:** Wizard / Onboarding — Sistem Ayari Ekleme Aksiyonu

---

## Amac

Requirements ekranindaki son eksik "Sistem Ayarlari" maddesini gercek bir onboarding aksiyonuna baglamak. Kullanici, eksik olan "settings" gereksinimini dogrudan onboarding icinden tamamlayabilmeli. Bu faz ile onboarding zincirindeki uc zorunlu requirement'in ucunde de aksiyon butonu calisiyor.

---

## Eklenen Akis

### Akis
1. Requirements screen → eksik "Sistem Ayarlari" satiri → "Ayar Ekle" butonu
2. "Ayar Ekle" → OnboardingSettingsSetupScreen (sistem ayari ekleme formu)
3. Form gonderimi → `POST /api/v1/settings` (mevcut backend API)
4. Basarili kayit → `setup-requirements` query invalidation → requirements ekranina donus
5. "Iptal" → requirements ekranina donus

### Tekrar Kullanim
- Backend'de yeni endpoint eklenmedi — mevcut `POST /api/v1/settings` kullaniliyor
- `useCreateSetting` hook'u bu fazda olusturuldu (mevcut pattern ile tutarli)
- `createSetting` fonksiyonu settingsApi.ts'ye eklendi
- Settings form tamamen yeni — mevcut admin panelinde settings create formu yoktu

### Onboarding-Spesifik Davranis
- Minimum gerekli alanlar: key (ayar anahtari), admin degeri
- Status otomatik "active" olarak gonderiliyor (requirements active setting ariyor)
- admin_value_json JSON.stringify ile sarilarak gonderiliyor (backend "null" kontrolu icin)
- Grup, tur, aciklama opsiyonel

---

## Degistirilen / Eklenen Dosyalar

### Frontend (yeni)
- `frontend/src/components/onboarding/OnboardingSettingsSetupScreen.tsx` — onboarding icinde minimal sistem ayari ekleme ekrani
- `frontend/src/hooks/useCreateSetting.ts` — React Query mutation hook

### Frontend (guncellenen)
- `frontend/src/api/settingsApi.ts` — `SettingCreatePayload` interface ve `createSetting` fonksiyonu eklendi
- `frontend/src/components/onboarding/OnboardingRequirementsScreen.tsx` — settings satiri icin "Ayar Ekle" aksiyon butonu, `onSettingsSetup` prop
- `frontend/src/pages/OnboardingPage.tsx` — `"settings-setup"` step eklendi, 5 adimli akis
- `frontend/src/tests/onboarding.smoke.test.tsx` — 7 yeni test eklendi (toplam 35)

### Backend
- Degisiklik yok — mevcut API yeterli

---

## Eklenen Testler

`frontend/src/tests/onboarding.smoke.test.tsx` — 35 test (28 mevcut + 7 yeni):

**OnboardingRequirementsScreen settings action buttons (2 yeni test):**
1. shows Ayar Ekle button for missing settings requirement
2. does not show Ayar Ekle when settings requirement is completed

**OnboardingSettingsSetupScreen (3 yeni test):**
3. renders settings setup heading
4. renders settings form with Ayari Kaydet submit button
5. calls onBack when cancel is clicked

**OnboardingPage settings-setup flow (2 yeni test):**
6. transitions from requirements to settings-setup on Ayar Ekle click
7. can go back from settings-setup to requirements

---

## Calistirilan Komutlar

- `tsc --noEmit` ✅ Temiz
- `vitest run` ✅ 128/128 suite, 1622/1622 test (+7 yeni)
- `vite build` ✅ Temiz (533.18 kB)

## Test Sonuclari

| Kategori | Sonuc |
|---|---|
| tsc --noEmit | ✅ Temiz |
| vitest run | ✅ 128/128 suite, 1622/1622 test |
| vite build | ✅ Temiz |

---

## Bilerek Yapilmayanlar

- Tum admin settings ekrani yeniden yazilmadi
- Gelismis governance/visibility kurulmadi
- Onboarding completion ekrani bu fazda eklenmedi
- Batch settings ekleme destegi eklenmedi
- Settings edit akisi eklenmedi
- Basari toast'u eklenmedi
- Backend testleri bu fazda eklenmedi (mevcut API kullanildi)

## Kalan Riskler

- Backend down ise form submit hatasi gosteriliyor
- Ayni key ile ikinci kez ekleme 409 Conflict dondurecek (backend duplicate key kontrolu var, hata mesaji kullaniciya gosteriliyor)
- admin_value_json JSON.stringify ile sariliyor — "null" string olarak gitmemesi icin

---

## Sonraki Faz

Onboarding zincirindeki uc zorunlu requirement'in ucunde de aksiyon butonu calisiyor. Sonraki faz: onboarding completion akisi veya kullanicinin belirlenmesi gereken bir sonraki urun ozelligi.
