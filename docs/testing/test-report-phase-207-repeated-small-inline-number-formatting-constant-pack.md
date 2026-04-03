# Test Report — Phase 207: Repeated Small Inline Number Formatting Constant Pack

**Tarih:** 2026-04-03
**Faz:** 207
**Başlık:** Repeated Small Inline Number Formatting Constant Pack

---

## Amaç

Tüm frontend bileşen dosyalarında aynı dosya içinde 3+ kez tekrar eden inline number formatting pattern'larını (`?? 0`, `Number()`, `toFixed()`, `toLocaleString()` vb.) dosya-seviyesi const'lara çıkarmak.

---

## Audit Özeti

### 3+ threshold karşılayan dosyalar

| Dosya | Pattern | Sayı | Değerlendirme |
|---|---|---|---|
| `NewsBulletinForm.tsx` | `Number(` | 3× | Farklı argümanlarla — extraction değer katmıyor |
| `NewsBulletinSelectedItemsPanel.tsx` | `?? 0` | 3× | Farklı değişken fallback'leri — extraction değer katmıyor |
| `NewsBulletinSelectedNewsQualitySummary.tsx` | `Number(` | 3× | Farklı argümanlarla — extraction değer katmıyor |
| `NewsBulletinSelectedNewsQualitySummary.tsx` | `?? 0` | 3× | `safeNumber(x, 0)` ile birlikte — zaten düzenli |
| `SourcePublicationOutcomeSummary.tsx` | `?? 0` | 3× | Farklı prop fallback'leri — extraction değer katmıyor |
| `SourcePublicationSupplySummary.tsx` | `?? 0` | 4× | Farklı prop fallback'leri — extraction değer katmıyor |
| `SourceTargetOutputConsistencySummary.tsx` | `?? 0` | 3× | Farklı prop fallback'leri — extraction değer katmıyor |

### Değerlendirme

`?? 0` ve `Number(x)` pattern'ları sayısal literal tekrarı değil — her biri farklı değişken/argümanla kullanılıyor. `const ZERO = 0` gibi bir extraction okunabilirliği artırmaz, aksine kodu daha az açık hale getirir. `safeNumber` helper zaten mevcut ve daha uygun bir soyutlama. Faz kuralı gereği "yalnızca okunabilirlik artıyorsa dokun" — bu durumda artmıyor.

---

## Yapılan Değişiklikler

**Hiçbir dosyada değişiklik yapılmadı.**

---

## Çalıştırılan Komutlar

- `tsc --noEmit` (değişiklik yok, temiz)
- `vitest run` (127/127, 1587/1587)
- `vite build` (temiz)

## Test Sonuçları

| Kategori | Sonuç |
|---|---|
| tsc --noEmit | ✅ Temiz |
| vitest run | ✅ 127/127, 1587/1587 |
| vite build | ✅ Temiz |

---

## Bilerek Yapılmayanlar

- `?? 0` ve `Number()` farklı argümanlarla kullanıldığı için const extraction yapılmadı
- `safeNumber` helper mevcut ve bu pattern için zaten doğru soyutlama
- Global numeric utility kurulmadı

## Riskler

Yok.
