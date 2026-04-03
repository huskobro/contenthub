# Test Report — Phase 237: Onboarding Setup Requirements Screen

**Tarih:** 2026-04-03
**Faz:** 237 (Ana Faz 1 / Alt Faz 1.2)
**Baslik:** Wizard / Onboarding — Zorunlu Kurulum Gereksinimleri Ekrani

---

## Amac

Onboarding akisinda welcome screen'den sonra gelen, sistemin calisabilmesi icin zorunlu kurulum basliklarini gosteren ve eksik olanlari gorulur kilan bir "setup requirements" ekrani olusturmak.

---

## Eklenen Requirements Ekrani ve Akis

### Akis
1. `/` → AppEntryGate → onboarding gerekli ise `/onboarding`
2. `/onboarding` → OnboardingPage (step state yonetimi)
3. Welcome screen → "Kurulumu Baslat" → Requirements screen
4. Requirements screen → "Kurulumu Tamamla" (tum gereksinimler tamam ise) → `/user`
5. Requirements screen → "Geri Don" → Welcome screen'e donus

### Welcome Screen Degisikligi
- "Kurulumu Baslat" artik dogrudan onboarding'i tamamlamak yerine requirements ekranina geciyor
- "Simdilik Atla" hala dogrudan onboarding'i tamamlayip `/user`'a yonlendiriyor
- `onNext` prop eklendi — OnboardingPage tarafindan step gecisi icin kullaniliyor

---

## Requirement Maddeleri ve Nasil Hesaplandiklari

### Backend: `GET /api/v1/onboarding/requirements`

3 zorunlu kurulum maddesi gercek domain verisine dayanarak kontrol ediliyor:

| Madde | Kontrol | Tamamlanma Kriteri |
|---|---|---|
| **Haber Kaynagi Ekle** | `news_sources` tablosunda `status = 'active'` kayit sayisi | >= 1 aktif kaynak |
| **Sablon Olustur** | `templates` tablosunda `status = 'active'` kayit sayisi | >= 1 aktif sablon |
| **Sistem Ayarlari** | `settings` tablosunda `status = 'active'` ve `admin_value_json != 'null'` kayit sayisi | >= 1 yapilandirilmis ayar |

Her madde icin donus:
- `key`: benzersiz tanimlayici
- `title`: kullaniciya gosterilen baslik
- `description`: kisa aciklama
- `status`: `"completed"` veya `"missing"`
- `detail`: tamamlanmissa detay metni (orn. "3 aktif kaynak")

`all_completed`: tum maddeler `completed` ise `true`

### Frontend Davranisi
- Tamamlanmis maddeler: yesil arka plan, ✓ ikonu, detay metni
- Eksik maddeler: sari arka plan, ! ikonu
- Tum maddeler tamam: "Kurulumu Tamamla" butonu → onboarding tamamla + `/user`
- Eksik madde var: "Devam Et" butonu → `/user`'a gec (onboarding tamamlanmadan)

---

## Degistirilen / Eklenen Dosyalar

### Backend (guncellenen)
- `backend/app/onboarding/schemas.py` — `SetupRequirementItem`, `SetupRequirementsResponse` eklendi
- `backend/app/onboarding/service.py` — `get_setup_requirements()` fonksiyonu eklendi
- `backend/app/onboarding/router.py` — `GET /onboarding/requirements` endpoint eklendi

### Frontend (yeni)
- `frontend/src/components/onboarding/OnboardingRequirementsScreen.tsx` — requirements ekrani
- `frontend/src/hooks/useSetupRequirements.ts` — React Query hook

### Frontend (guncellenen)
- `frontend/src/api/onboardingApi.ts` — `SetupRequirementItem`, `SetupRequirementsResponse`, `fetchSetupRequirements` eklendi
- `frontend/src/components/onboarding/OnboardingWelcomeScreen.tsx` — `onNext` prop eklendi
- `frontend/src/pages/OnboardingPage.tsx` — step state yonetimi (welcome → requirements)
- `frontend/src/tests/onboarding.smoke.test.tsx` — 7 yeni test eklendi (toplam 14)

---

## Eklenen Testler

`frontend/src/tests/onboarding.smoke.test.tsx` — 14 test (7 mevcut + 7 yeni):

**OnboardingRequirementsScreen (5 yeni test):**
1. renders requirement items
2. shows completed count
3. shows detail for completed items
4. shows Kurulumu Tamamla when all done
5. shows Devam Et when not all done

**OnboardingPage step flow (2 yeni test):**
6. starts with welcome and transitions to requirements on CTA click
7. can go back from requirements to welcome

---

## Calistirilan Komutlar

- `tsc --noEmit` ✅ Temiz
- `vitest run` ✅ 128/128 suite, 1601/1601 test (+7 yeni)
- `vite build` ✅ Temiz (525.55 kB)

## Test Sonuclari

| Kategori | Sonuc |
|---|---|
| tsc --noEmit | ✅ Temiz |
| vitest run | ✅ 128/128 suite, 1601/1601 test |
| vite build | ✅ Temiz |

---

## Bilerek Yapilmayanlar

- Provider baglanti formu yapilmadi — sonraki alt fazin kapsami
- Klasor secici yapilmadi
- Wizard stepper / progress bar eklenmedi
- Admin onboarding yonetimi eklenmedi
- Backend testleri bu fazda eklenmedi
- Requirement maddeleri icin inline aksiyon butonu (orn. "Kaynak Ekle") eklenmedi — sonraki fazlarda baglanacak

## Kalan Riskler

- Test veritabaninda cok sayida test kaydi var (222 source, 18 template, 144 setting) — temiz bir veritabaninda tum maddeler "missing" gorunecek, bu beklenen davranis
- Backend down ise requirements ekrani hata mesaji gosteriyor ve "Uygulamaya Gec" fallback sunuyor

---

## Sonraki Alt Faz

Alt Faz 1.3 — Wizard sonraki adimi (beklenen: requirement maddelerine aksiyon baglama veya provider/kaynak konfigurasyonu)
