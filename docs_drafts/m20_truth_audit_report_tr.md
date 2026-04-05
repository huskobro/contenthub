# M20-D: Truth Audit Raporu

## Ozet
Production kodunda fake/mock/placeholder/deferred/bekliyor taramasi yapildi. Temiz.

## Frontend Production Kodu Tarama Sonuclari

### "fake" / "mock" / "dummy" / "lorem" / "TODO" / "FIXME"
- `frontend/src/pages/` — **YOK**
- `frontend/src/api/` — **YOK**
- `frontend/src/hooks/` — **YOK**

### "placeholder"
- `AssetLibraryPage.tsx` — HTML input placeholder attribute: `placeholder="Dosya adi ara..."` → normal form elementi
- `ContentLibraryPage.tsx` — HTML input placeholder: `placeholder="Baslik/konu ara..."` → normal form elementi
- `AuditLogPage.tsx` — HTML input placeholder: `placeholder="Aksiyon filtresi..."` → normal form elementi
- **Sonuc:** Hepsi gercek form input'lari, fake veri degil.

### "ilerideki fazlarda" / "deferred" / "bekliyor" / "yakında" / "desteklenmiyor"
- `AdminOverviewPage.tsx` — testId olarak `release-readiness-deferred-note`: Bu bir test identifier, kullaniciya gosterilen metin degil.
- Production kodunda islevsiz/sahte deferred metin: **YOK**

## Backend Production Kodu Tarama Sonuclari

### "fake" / "mock" / "dummy" / "lorem" / "TODO" / "FIXME"
- `backend/app/` — **YOK**

### "deferred" / "placeholder" / "sample"
- `app/db/models.py:564` — `dedupe_key: placeholder for future dedupe` → docstring, runtime davranisi yok
- `app/db/models.py:428` — `linkage to Templates deferred to a later phase` → docstring, mimari karar notu
- `app/visibility/service.py:12` — `Intentionally deferred:` → docstring, mimari karar notu
- `app/settings/service.py:13` — `Intentionally deferred:` → docstring, mimari karar notu
- `app/modules/standard_video/executors/render_still.py` — `sample_text`, `preview_sample_text` → subtitle preview icin gercek teknik parametre, fake veri degil
- **Sonuc:** Hepsi mimari docstring veya gercek teknik isimler. Production davranisini etkileyen sahte ifade yok.

## Test Kodundan Production'a Sizinti Kontrolu
- Test dosyalari mock veri iceriyor (MOCK_ASSETS_RESPONSE, MOCK_VIDEOS vb.) → test dosyalarinda kaliyor
- Production import'larinda test mock'u: **YOK**
- Production kodunda hardcoded test verisi: **YOK**

## Islevsiz Yuzey Kontrolu
- AssetLibraryPage: Refresh butonu → gercek POST /refresh endpoint'ini cagirir → **GERCEK**
- AssetLibraryPage: Sil butonu → gercek DELETE endpoint'ini cagirir → **GERCEK**
- AssetLibraryPage: Konum butonu → gercek POST /reveal endpoint'ini cagirir → **GERCEK**
- ContentLibraryPage: Detay Goruntule → navigate ile detay sayfasina gider → **GERCEK**
- ContentLibraryPage: Filtre temizle → state sifirlar, query yenilenir → **GERCEK**
- ContentLibraryPage: Klonlama karti → aciklama metni (backend aksiyonu henuz yok) → **DURUSTCE BELIRTILDI**

## Sonuc
Production kodunda fake/mock/placeholder artigi: **YOK**
Islevsiz dekoratif yuzey: **YOK**
Deferred ifade: **KALDIRILDI** (klonlama karti metni guncellendi)
