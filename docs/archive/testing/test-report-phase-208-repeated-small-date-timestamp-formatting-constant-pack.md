# Test Report — Phase 208: Repeated Small Date/Timestamp Formatting Constant Pack

**Tarih:** 2026-04-03
**Faz:** 208
**Başlık:** Repeated Small Date/Timestamp Formatting Constant Pack

---

## Amaç

Tüm frontend bileşen dosyalarında aynı dosya içinde 3+ kez tekrar eden date/timestamp formatting pattern'larını dosya-seviyesi const'lara çıkarmak.

---

## Audit Özeti

### 3+ threshold karşılayan dosyalar

| Dosya | Pattern | Sayı | Değerlendirme |
|---|---|---|---|
| `SourceScanDetailPanel.tsx` | `formatDateTime(...)` | 4× | Farklı argümanlarla — extraction değer katmıyor |
| `NewsItemDetailPanel.tsx` | `formatDateTime(...)` | 3× | Farklı argümanlarla — extraction değer katmıyor |
| `JobOverviewPanel.tsx` | `formatDateISO(...)` | 3× | Farklı argümanlarla — extraction değer katmıyor |
| `JobDetailPanel.tsx` | `formatDateISO(...)` | 3× | Farklı argümanlarla — extraction değer katmıyor |

### Değerlendirme

`formatDateTime` ve `formatDateISO` helper fonksiyon çağrılarıdır — her çağrıda farklı prop/değişken argümanı var. Fonksiyon referansı zaten tek bir helper import'dan geliyor. `const FMT = formatDateTime` gibi bir alias extraction okunabilirliği artırmaz. Faz kuralı: "yalnızca okunabilirlik artıyorsa dokun" — bu durumda artmıyor.

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

- formatDateTime/formatDateISO farklı argümanlarla kullanıldığı için const extraction yapılmadı
- Global date format utility kurulmadı
- Badge dosyaları kapsam dışı bırakıldı

## Riskler

Yok.
