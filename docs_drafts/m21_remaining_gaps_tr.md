# M21 Kalan Bosluklar ve Bilinen Kisitlamalar

**Tarih:** 2026-04-05

---

## M21 Kapsaminda Kapatilan Bosluklar

| Bosluk | Durum |
|--------|-------|
| Asset upload endpoint yok | KAPATILDI — POST /assets/upload calisiyor |
| Asset upload frontend yok | KAPATILDI — dosya secici + yukleme butonu |
| Clone endpoint yok | KAPATILDI — SV ve NB clone endpoint'leri |
| Clone frontend yok | KAPATILDI — "Klonla" butonu her satira eklendi |
| Icerik kutuphanesi dual-hook | KAPATILDI — birlesik backend endpoint |
| ContentLibraryPage eski mimari | KAPATILDI — tamamen yeniden yazildi |

---

## Devam Eden Kisitlamalar (Onceki Fazlardan)

### Gorunurluk Motoru
- Runtime resolution (merge rules with context) henuz uygulanmadi
- Settings + visibility merge logic ertelenmis
- Frontend'de `visibilityApi.ts` permissive fallback donuyor

### Settings Servisi
- Delete, cache, bulk ops ertelenmis
- User override resolution ertelenmis
- Audit log zenginlestirmesi ertelenmis

### Yayin Executor
- JSON parse hatasi durumunda sabit-kodlu baslik fallback'i var
- Gelecek fazda hata yayilimi eklenmeli

### Content Library Performans
- Python-side sayfalama kullaniliyor (iki modul ayri sorgulanip birlestirilior)
- Cok buyuk kayit sayilarinda SQL UNION ALL'a gecis dusunulebilir
- Mevcut MVP olceginde sorun yok

---

## Gelecek Faz Onerileri

1. **Upload endpoint'ine status_code=201 eklenmesi** — Mevcut 200 donuyor, REST convention 201 tercih eder
2. **Drag-and-drop upload** — Mevcut dosya secici calisiyor, UX iyilestirmesi olarak DnD eklenebilir
3. **Clone sonrasi navigasyon** — Klonlanan kayda otomatik yonlendirme
4. **Content library'de has_script/has_metadata goruntusu** — Backend donuyor, frontend henuz gostermiyor
5. **Bulk clone/delete** — Toplu islem desteği
