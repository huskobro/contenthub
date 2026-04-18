# Test Report — Phase 238: Onboarding Source Setup First Required Action

**Tarih:** 2026-04-03
**Faz:** 238 (Ana Faz 1 / Alt Faz 1.3)
**Baslik:** Wizard / Onboarding — Haber Kaynagi Ekleme Aksiyonu

---

## Amac

Requirements ekranindaki "Haber Kaynagi Ekle" maddesini gercek bir onboarding aksiyonuna baglamak. Kullanici, eksik olan "sources" gereksinimini dogrudan onboarding icinden tamamlayabilmeli.

---

## Eklenen Akis

### Akis
1. Requirements screen → eksik "Haber Kaynagi Ekle" satiri → "Kaynak Ekle" butonu
2. "Kaynak Ekle" → OnboardingSourceSetupScreen (kaynak ekleme formu)
3. Form gonderimi → `POST /api/v1/sources` (mevcut backend API)
4. Basarili kayit → `setup-requirements` query invalidation → requirements ekranina donus
5. "Iptal" → requirements ekranina donus

### Tekrar Kullanim
- `SourceForm` component'i dogrudan tekrar kullaniliyor (admin panel ile ayni form)
- `useCreateSource` hook'u tekrar kullaniliyor
- Backend'de yeni endpoint eklenmedi — mevcut `POST /api/v1/sources` kullaniliyor

---

## Degistirilen / Eklenen Dosyalar

### Frontend (yeni)
- `frontend/src/components/onboarding/OnboardingSourceSetupScreen.tsx` — onboarding icinde kaynak ekleme ekrani

### Frontend (guncellenen)
- `frontend/src/components/onboarding/OnboardingRequirementsScreen.tsx` — eksik maddelere aksiyon butonu eklendi (`onSourceSetup` prop, `RequirementRow`'a `onAction`/`actionLabel` prop)
- `frontend/src/pages/OnboardingPage.tsx` — `"source-setup"` step eklendi, step gecisleri guncellendi
- `frontend/src/tests/onboarding.smoke.test.tsx` — 7 yeni test eklendi (toplam 21)

### Backend
- Degisiklik yok — mevcut API yeterli

---

## Eklenen Testler

`frontend/src/tests/onboarding.smoke.test.tsx` — 21 test (14 mevcut + 7 yeni):

**OnboardingRequirementsScreen action buttons (2 yeni test):**
1. shows Kaynak Ekle button for missing sources requirement
2. does not show Kaynak Ekle when sources requirement is completed

**OnboardingSourceSetupScreen (3 yeni test):**
3. renders source setup heading
4. renders source form with Kaynagi Ekle submit button
5. calls onBack when cancel is clicked

**OnboardingPage source-setup flow (2 yeni test):**
6. transitions from requirements to source-setup on Kaynak Ekle click
7. can go back from source-setup to requirements

---

## Calistirilan Komutlar

- `tsc --noEmit` ✅ Temiz
- `vitest run` ✅ 128/128 suite, 1608/1608 test (+7 yeni)
- `vite build` ✅ Temiz (527.15 kB)

## Test Sonuclari

| Kategori | Sonuc |
|---|---|
| tsc --noEmit | ✅ Temiz |
| vitest run | ✅ 128/128 suite, 1608/1608 test |
| vite build | ✅ Temiz |

---

## Bilerek Yapilmayanlar

- Sablon ve Ayarlar gereksinimlerine aksiyon butonu eklenmedi — sonraki alt fazlarin kapsami
- Kaynak ekleme sonrasi basari bildirimi/toast eklenmedi
- Form validasyonu mevcut SourceForm'dan geliyor, onboarding-spesifik validasyon eklenmedi
- Backend testleri bu fazda eklenmedi (mevcut API kullanildi, yeni endpoint yok)
- Kaynak ekleme sonrasi otomatik onboarding tamamlama yapilmadi — kullanici requirements ekraninda durumu gorur

## Kalan Riskler

- Kaynak ekleme basarisiz olursa hata mesaji SourceForm icerisinde gosteriliyor (mevcut davranis)
- Backend down ise form submit hatasi kullaniciya yansir

---

## Sonraki Alt Faz

Alt Faz 1.4 — Diger requirement maddelerine (Sablon Olustur, Sistem Ayarlari) aksiyon baglama veya onboarding wizard tamamlama akisi
