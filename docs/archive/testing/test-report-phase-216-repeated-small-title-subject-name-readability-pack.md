# Test Report — Phase 216: Repeated Small title/subject/name Text Readability Pack

**Tarih:** 2026-04-03
**Faz:** 216
**Başlık:** Repeated Small title/subject/name Text Readability Pack

---

## Amaç

Bileşenlerde aynı dosya içinde 3+ kez tekrar eden `item.title`, `item.label`, `item.name`, `item.subject` gibi text accessor pattern'larını dosya-seviyesi const'lara çıkarmak.

---

## Audit Özeti

### Gözden Geçirilen Dosyalar

| Dosya | Pattern | Tekrar | Bağlam |
|---|---|---|---|
| `news-items/NewsItemsTable.tsx` | `item.title` | 7× | `.map()` callback içinde loop variable property access |
| `news-bulletin/NewsItemPickerTable.tsx` | `item.title` | 3× | `.map()` callback, tek satırda null-coalescing expression |
| `layout/AppSidebar.tsx` | `item.label` | 3× | `.map()` callback içinde key ve text content |

### Karar: Audit-Only

**Sebep:** `item.title` ve `item.label` gibi accessor'lar `.map()` callback'i içindeki loop iteration variable'ın property access'leridir. Bu pattern için const extraction:

1. **Teknik olarak mümkün** — `map(item => { const title = item.title; ... })` yazılabilir
2. **Okunabilirlik kazancı yok** — `item.title` zaten maksimum kısa ve açık; `title` const'u bağlamı azaltır
3. **Dosya-seviyesi const uygun değil** — loop variable, her iterasyonda farklı değer alır; dosya seviyesinde extract edilemez
4. **NewsItemPickerTable satır 33**: `(item.title ?? "")` 3× tek expression'da — `const title = item.title ?? DASH` extract edilebilir ama bu zaten standart bir JS idiom; okunabilirlik değişmez

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

- Loop variable property access'ler dosya-seviyesi const'a çıkarılmadı — semantik olarak uygunsuz
- `item.title ?? ""` inline pattern korundu — standart JS idiom, extraction değer katmaz
- Map callback içi yerel const eklenmedi — tek satırlık accessor için gereksiz

## Riskler

Yok.
