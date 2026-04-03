# Test Report — Phase 232: Repeated Small Table Cell Content Readability Pack

**Tarih:** 2026-04-03
**Faz:** 232
**Başlık:** Repeated Small Table Cell Content Readability Pack

---

## Amaç

Table bileşenlerinde aynı dosya içinde 3+ kez tekrar eden küçük tablo hücre içerik pattern'larını tespit etmek; okunabilirliği artıran küçük extraction düzeltmeleri yapmak.

---

## Audit Özeti

### Gözden Geçirilen Table Dosyaları

13 tablo dosyası: `StandardVideosTable`, `JobsTable`, `SettingsTable`, `VisibilityRulesTable`, `SourcesTable`, `SourceScansTable`, `StyleBlueprintsTable`, `NewsItemsTable`, `NewsItemPickerTable`, `UsedNewsTable`, `TemplatesTable`, `NewsBulletinsTable`, `TemplateStyleLinksTable`

### Bulgular

| Pattern | Durum |
|---|---|
| `TH_STYLE` const kullanımı | Tüm tablolarda zaten extracted (Phase 195 ve önceki faz) |
| `TD_STYLE` const kullanımı | Tüm tablolarda zaten extracted |
| `DASH` const kullanımı | 8 tabloda zaten extracted |
| `{ padding, wordBreak, overflowWrap }` inline style | Max 2× per dosya (genişletilmiş metin sütunları) |
| Aynı `<td>` içerik bloğu 3+ kez | **Yok** |

### Karar: Audit-Only

**Sebep:** Tüm tablo dosyalarında `TH_STYLE`, `TD_STYLE`, `DASH` zaten extracted. Kalan inline style varyantı (`wordBreak: "break-word"`) en fazla 2× per dosya — threshold karşılanmıyor. Hücre içerikleri her sütun için farklı field (b.title, b.topic, b.status, ...) — aynı pattern değil.

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

- `{ wordBreak: "break-word", overflowWrap: "anywhere" }` TD varyantı const'a çıkarılmadı — 2× per dosya, threshold karşılanmıyor
- Table cell render helper kurulmadı
- Hücre içerikleri per-column, farklı field referansları

## Riskler

Yok.
