# Test Report — Phase 230: Repeated Small Label/Heading Text Readability Pack

**Tarih:** 2026-04-03
**Faz:** 230
**Başlık:** Repeated Small Label/Heading Text Readability Pack

---

## Amaç

Panel/form/detail/helper bileşenlerinde aynı dosya içinde 3+ kez tekrar eden label veya heading text string'lerini tespit etmek; okunabilirliği artıran küçük const extraction düzeltmeleri yapmak.

---

## Audit Özeti

### Gözden Geçirilen Dosyalar

`StandardVideoScriptPanel`, `NewsBulletinSelectedItemsPanel`, `StandardVideoMetadataPanel`, `SourceForm`, `NewsBulletinForm` ve diğerleri.

### Bulgular

| Dosya | String | Tekrar | Değerlendirme |
|---|---|---|---|
| `SourceForm.tsx` | "zorunludur" | 5× | 5 farklı hata mesajında ortak kelime — her mesaj benzersiz |
| `NewsBulletinForm.tsx` | `{DASH}` | 3× | Zaten extracted const — değişken referansı |
| Diğer dosyalar | — | max 2× | Threshold altı |

### "zorunludur" — Detay

`SourceForm.tsx` validasyon bloğunda 5 farklı mesaj:
- `"Name zorunludur ve boş olamaz."`
- `"Source type zorunludur."`
- `"RSS source için feed_url zorunludur."`
- `"manual_url source için base_url zorunludur."`
- `"API source için api_endpoint zorunludur."`

Her mesaj farklı — sadece "zorunludur" kelimesi ortak. Extraction: `const REQUIRED_MSG = "zorunludur"` yazmak anlamsız, çünkü mesajın tamamı her seferinde farklı.

### Karar: Audit-Only

**Sebep:** Aynı tam string literal 3+ kez tekrar eden dosya yok. DASH zaten const. "zorunludur" ortak kelime içeren 5 farklı mesajda — extraction değer katmaz.

**Sonuç:** Hiçbir dosyada değişiklik yapılmadı.

---

## Yapılan Değişiklikler

**Hiçbir dosyada değişiklik yapılmadı.**

---

## Çalıştırılan Komutlar

- `tsc --noEmit` ✅ Temiz
- `vitest run` ✅ 127/127, 1587/1587
- `vite build` ✅ Temiz

## Test Sonuçları

| Kategori | Sonuç |
|---|---|
| tsc --noEmit | ✅ Temiz |
| vitest run | ✅ 127/127, 1587/1587 |
| vite build | ✅ Temiz |

---

## Bilerek Yapılmayanlar

- "zorunludur" ortak kelime const'a çıkarılmadı — tüm mesajlar farklı, extraction değer katmaz
- "Kaydet"/"İptal" button label'ları const'a çıkarılmadı — 2× kullanım, threshold altı
- Shared text constant sistemi kurulmadı

## Riskler

Yok.
