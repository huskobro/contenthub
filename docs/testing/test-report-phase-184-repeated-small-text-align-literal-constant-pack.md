# Test Report — Phase 184: Repeated Small Text Align Literal Constant Pack

**Tarih:** 2026-04-03
**Faz:** 184
**Başlık:** Repeated Small Text Align Literal Constant Pack

---

## Audit Özeti

Tüm frontend bileşen dosyaları tekrar eden `textAlign` literal'ları açısından tarandı.

### Tespit Edilen Pattern'ler

Tüm dosyalarda `textAlign:` değeri 1× per dosya. Çok sayıda tabloda `textAlign: "left"` var ama her birinde yalnızca tek bir `<tr>` header satırında.

| Dosya | Tekrar | Karar |
|---|---|---|
| `TemplateStyleLinksTable.tsx` | 0× (TH_CELL içinde Phase 183'te çıkarıldı) | ✅ Zaten extraction yapılmış |
| Diğer tüm table/panel dosyaları | 1× | ❌ Threshold altı |

---

## Sonuç

Aynı dosya içinde 3+ tekrar eden `textAlign` literal bulunamadı. Her dosyada max 1× görülüyor.

Phase 184 audit-only olarak kapatılıyor.

---

## Test Sonuçları

| Kategori | Sonuç |
|---|---|
| tsc --noEmit | ✅ Temiz (0 hata) |
| vitest run | ✅ 127/127 test dosyası, 1587/1587 test geçti |

---

## Dokunulmayanlar

- Hiçbir dosya değiştirilmedi
- Görünüm değiştirilmedi
- Davranış değiştirilmedi
- Backend değişikliği yapılmadı
