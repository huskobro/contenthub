# M21 Teslimat Raporu

**Tarih:** 2026-04-05
**Kapsam:** M21-A / M21-B / M21-C / M21-D / M21-E / M21-F / M21-G

---

## Ozet

M21, ContentHub icerik ve varlik kutuphanelerini uretim kalitesine tasidi:

- **M21-A: Asset Upload Runtime** — Gercek dosya yukleme endpoint'i calisiyor
- **M21-B: Asset Upload Frontend** — Dosya secici + yukleme butonu + feedback
- **M21-C: Content Clone Runtime** — SV ve NB klonlama endpoint'leri ve frontend butonlari
- **M21-D: Unified Content Library** — Birlesik backend endpoint + frontend'in bu endpoint'i kullanmasi
- **M21-E: Seed Temizligi** — Test/demo veri tarandi, uretim kodunda temiz
- **M21-F: Truth Audit** — Sahte/placeholder/ertelenmis taramasi yapildi
- **M21-G: Test + Dogrulama** — Backend 1167, frontend 2174 test gecti

---

## M21-A: Asset Upload Runtime

### Endpoint
- `POST /api/v1/assets/upload` — multipart/form-data
- Opsiyonel `asset_type` form field'i

### Guvenlik
- Dosya adi sanitizasyonu (regex, uzunluk, gizli dosya engelleme)
- Engellenen uzantilar: .exe, .bat, .cmd, .sh, .ps1, .msi, .dll, .so, .com, .scr, .pif, .vbs, .js, .wsh, .wsf
- Path traversal koruması (5 katmanli dogrulama)
- 100 MB boyut siniri (413 hata kodu)
- Conflict handling: ayni isimde dosya varsa `name_1.ext` seklinde benzersiz isim uretir (sessiz uzerine yazma yok)

### Hedef Dizin
- `workspace/_uploads/artifacts/{dosya_adi}`

### Audit Log
- Her basarili yukleme `asset.upload` aksiyonu ile loglanir

---

## M21-B: Asset Upload Frontend

### Degisiklikler
- `AssetLibraryPage.tsx` — "Dosya Yukle" bolumu eklendi
- File input + "Yukle" butonu
- Yukleme sirasinda loading state
- Basari/hata geri bildirimi (actionFeedback)
- Basarili yuklemeden sonra assets listesi otomatik yenilenir
- data-testid: `asset-upload-area`, `asset-upload-input`, `asset-upload-btn`

---

## M21-C: Content Clone Runtime

### Backend
- `POST /api/v1/modules/standard-video/{id}/clone` — 201 doner
- `POST /api/v1/modules/news-bulletin/{id}/clone` — 201 doner
- Klonlanan kayit: bagimsiz draft, yeni UUID, job_id=None
- Baslik sonuna "(kopya)" eklenir
- Script/metadata klonlanmaz — temiz draft

### Frontend
- `ContentLibraryPage.tsx` — Her satira "Klonla" butonu eklendi
- Tiklama oncesi onay dialog'u
- Yukleme state'i (cloningId)
- Basari/hata geri bildirimi
- Basarili klonlama sonrasi content-library listesi yenilenir
- data-testid: `library-clone-{id}`

---

## M21-D: Unified Content Library

### Backend
- `GET /api/v1/content-library` — SV + NB birlesik endpoint
- Query params: content_type, status, search, limit, offset
- Backend-side filtreleme, arama (ilike), sayfalama
- has_script / has_metadata zenginlestirmesi
- Siralama: created_at DESC

### Frontend
- `ContentLibraryPage.tsx` tamamen yeniden yazildi
- Eski dual-hook (useStandardVideosList + useNewsBulletinsList) kaldirildi
- Yeni `useContentLibrary` hook'u kullaniliyor
- Backend sayfalama destegi (Onceki/Sonraki)
- Toplam kayit gosterimi

---

## M21-E: Seed/Test Kayit Temizligi

Uretim kodunda test/demo/seed veri tarandi:
- Migration'larda INSERT yok (sadece DDL)
- settings_seed.py yalnizca sistem ayar tanimlarini yukler (test verisi degil)
- Model/service dosyalarinda sabit-kodlanmis demo kayit yok
- workspace/_uploads/ dizini temiz
- Sonuc: **Temiz — islem gerektirmez**

---

## M21-F: Truth Audit

### Temiz Alanlar
- Sahte API yaniti yok (uretim kodunda)
- Mock data uretim kodunda yok (yalnizca test dosyalarinda)
- "Coming soon" / "not implemented" ifadesi yok

### Bilinen Kisitlamalar (onceki fazlardan devir)
- `visibilityApi.ts`: API hatasi durumunda permissive fallback donuyor (visible=true)
- `publish/executor.py`: JSON parse hatasi durumunda sabit-kodlu baslik donuyor
- Settings/Visibility service: delete, cache, bulk ops ertelenmis (dokumante)
- Bu kisitlamalar onceki faz raporlarinda dokumante edilmis durumdadir

---

## M21-G: Test Sonuclari

### Backend
- **1167 test gecti, 0 basarisiz**
- M21 yeni testler: 17 (upload, clone, unified library)
- `test_m21_upload_clone_library.py`

### Frontend
- **2174 test gecti, 0 basarisiz** (164 test dosyasi)
- M21 yeni testler: 16
- `m21-upload-clone-library.smoke.test.tsx`
- Guncellenen testler: 4 test dosyasi (M20→M21 uyum)

### TypeScript
- `tsc --noEmit` — hata yok

---

## Dosya Degisiklikleri

### Backend (mevcut dosyalar guncellendi)
- `app/assets/router.py` — upload endpoint (onceki fazda eklenmisti)
- `app/assets/service.py` — upload fonksiyonlari (onceki fazda eklenmisti)
- `app/assets/schemas.py` — AssetUploadResponse (onceki fazda eklenmisti)
- `app/modules/standard_video/service.py` — clone_standard_video()
- `app/modules/standard_video/router.py` — POST /{id}/clone
- `app/modules/news_bulletin/service.py` — clone_news_bulletin()
- `app/modules/news_bulletin/router.py` — POST /{id}/clone
- `app/content_library/schemas.py` — Python 3.9 uyum (List[] düzeltmesi)

### Backend (yeni dosyalar)
- `app/content_library/__init__.py`
- `app/content_library/service.py`
- `app/content_library/router.py`
- `app/content_library/schemas.py`
- `tests/test_m21_upload_clone_library.py`

### Frontend (guncellenen)
- `pages/admin/AssetLibraryPage.tsx` — upload UI
- `pages/admin/ContentLibraryPage.tsx` — tamamen yeniden yazildi
- `pages/AdminOverviewPage.tsx` — M21 aktif durumu
- 4 test dosyasi guncellendi (M20→M21 uyum)

### Frontend (yeni)
- `api/contentLibraryApi.ts`
- `hooks/useContentLibrary.ts`
- `tests/m21-upload-clone-library.smoke.test.tsx`
