# Test Report — Phase 239: Onboarding Template Setup Required Action

**Tarih:** 2026-04-03
**Faz:** 239 (Ana Faz 1 / Alt Faz 1.4)
**Baslik:** Wizard / Onboarding — Sablon Ekleme Aksiyonu

---

## Amac

Requirements ekranindaki "Sablon Olustur" maddesini gercek bir onboarding aksiyonuna baglamak. Kullanici, eksik olan "templates" gereksinimini dogrudan onboarding icinden tamamlayabilmeli.

---

## Eklenen Akis

### Akis
1. Requirements screen → eksik "Sablon Olustur" satiri → "Sablon Ekle" butonu
2. "Sablon Ekle" → OnboardingTemplateSetupScreen (sablon ekleme formu)
3. Form gonderimi → `POST /api/v1/templates` (mevcut backend API)
4. Basarili kayit → `setup-requirements` query invalidation → requirements ekranina donus
5. "Iptal" → requirements ekranina donus

### Tekrar Kullanim
- `TemplateForm` component'i dogrudan tekrar kullaniliyor (admin panel ile ayni form)
- `useCreateTemplate` hook'u tekrar kullaniliyor
- Backend'de yeni endpoint eklenmedi — mevcut `POST /api/v1/templates` kullaniliyor

### Onboarding-Spesifik Davranis
- Sablon status'u "draft" olarak secilirse otomatik olarak "active" yapiliyor (requirements'ta "active" sablon arandiginden)
- TemplateFormValues → TemplateCreatePayload donusumu TemplateCreatePage ile ayni pattern'i kullaniyor

---

## Degistirilen / Eklenen Dosyalar

### Frontend (yeni)
- `frontend/src/components/onboarding/OnboardingTemplateSetupScreen.tsx` — onboarding icinde sablon ekleme ekrani

### Frontend (guncellenen)
- `frontend/src/components/onboarding/OnboardingRequirementsScreen.tsx` — templates satiri icin "Sablon Ekle" aksiyon butonu, `onTemplateSetup` prop, requirement row action mapping refactor
- `frontend/src/pages/OnboardingPage.tsx` — `"template-setup"` step eklendi, OnboardingTemplateSetupScreen entegrasyonu
- `frontend/src/tests/onboarding.smoke.test.tsx` — 7 yeni test eklendi (toplam 28)

### Backend
- Degisiklik yok — mevcut API yeterli

---

## Eklenen Testler

`frontend/src/tests/onboarding.smoke.test.tsx` — 28 test (21 mevcut + 7 yeni):

**OnboardingRequirementsScreen template action buttons (2 yeni test):**
1. shows Sablon Ekle button for missing templates requirement
2. does not show Sablon Ekle when templates requirement is completed

**OnboardingTemplateSetupScreen (3 yeni test):**
3. renders template setup heading
4. renders template form with Sablonu Olustur submit button
5. calls onBack when cancel is clicked

**OnboardingPage template-setup flow (2 yeni test):**
6. transitions from requirements to template-setup on Sablon Ekle click
7. can go back from template-setup to requirements

---

## Calistirilan Komutlar

- `tsc --noEmit` ✅ Temiz
- `vitest run` ✅ 128/128 suite, 1615/1615 test (+7 yeni)
- `vite build` ✅ Temiz (528.85 kB)

## Test Sonuclari

| Kategori | Sonuc |
|---|---|
| tsc --noEmit | ✅ Temiz |
| vitest run | ✅ 128/128 suite, 1615/1615 test |
| vite build | ✅ Temiz |

---

## Bilerek Yapilmayanlar

- Ayarlar gereksinimlerine aksiyon butonu eklenmedi — sonraki alt fazin kapsami
- Style blueprint baglama yapilmadi
- Template-style linking yapilmadi
- Gelismis template wizard eklenmedi
- Template edit akisi eklenmedi
- Basari toast'u eklenmedi
- Backend testleri bu fazda eklenmedi (mevcut API kullanildi, yeni endpoint yok)

## Kalan Riskler

- Backend down ise form submit hatasi TemplateForm icerisinde gosteriliyor (mevcut davranis)
- "draft" status otomatik "active" yapiliyor — kullanici bunu gormuyor, ama onboarding baglaminda dogru davranis

---

## Sonraki Alt Faz

Alt Faz 1.5 — Son requirement maddesi (Sistem Ayarlari) icin aksiyon baglama veya onboarding wizard tamamlama akisi
