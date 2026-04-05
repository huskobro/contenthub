# M21-F: Truth Audit Raporu

**Tarih:** 2026-04-05

---

## Tarama Kapsamı

Uretim kodunda (test dosyalari haric) asagidaki kaliplar tarandi:
- "mock", "fake", "placeholder", "lorem", "dummy"
- "TODO", "FIXME", "HACK"
- "ilerideki", "gelecek fazda", "henuz uygulanmadi", "coming soon", "not implemented"
- Fonksiyonsuz onClick handler'lari
- Sabit-kodlu API yanitlari
- Disabled kontroller

---

## Temiz Alanlar

| Alan | Sonuc |
|------|-------|
| Mock data uretim kodunda | Yok — sadece test dosyalarinda |
| Fake API yaniti | Yok |
| "Coming soon" ifadesi | Yok |
| "Not implemented" ifadesi | Yok |
| Fonksiyonsuz butonlar | Yok — tum butonlar baglanmis |
| Lorem/placeholder metin | Yok |
| Seed/demo DB kayitlari | Yok |

---

## Bilinen Kisitlamalar (Onceki Fazlardan Devir)

### 1. visibilityApi.ts — Permissive Fallback
- **Dosya:** `frontend/src/api/visibilityApi.ts`
- **Durum:** API hatasi durumunda `{ visible: true, read_only: false }` doner
- **Etki:** Gorunurluk API cokerse, varsayilan olarak her sey gorunur olur
- **Tavsiye:** Onceki faz raporlarinda belirtilmis, ayri milestone'da ele alinacak

### 2. publish/executor.py — Hardcoded Fallback Title
- **Dosya:** `backend/app/publish/executor.py`
- **Durum:** JSON parse hatasi durumunda `{"title": "ContentHub Video"}` doner
- **Etki:** Yayin meta verisi bozulursa sessizce varsayilan baslik kullanilir
- **Tavsiye:** Hata yayilimi eklenmeli

### 3. Settings/Visibility Service — Ertelenmis Ozellikler
- **Dosyalar:** `settings/service.py`, `visibility/service.py`
- **Durum:** delete, cache, bulk ops, runtime resolution dokumante edilmis sekilde ertelenmis
- **Etki:** Bu ozellikler gelecek fazlarda uygulanacak
- **Tavsiye:** Zaten dokumante, risk yok

### 4. Onboarding Service — Fallback Return
- **Dosya:** `backend/app/onboarding/service.py`
- **Durum:** DB hatasi durumunda `{"onboarding_required": True}` doner
- **Etki:** DB hatasi "onboarding gerekli" olarak yorumlanir

---

## Sonuc

M21 kapsaminda yeni sahte/placeholder/ertelenmis artifact eklenmedi.
Yukaridaki kisitlamalar onceki fazlardan devir olup raporlanmis durumdadir.
Uretim kodu gercek islemler yapmaktadir.
