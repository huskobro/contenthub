# Test Report — Phase 176: Repeated Small Form Help Text Style Constant Pack

**Tarih:** 2026-04-03
**Faz:** 176
**Başlık:** Repeated Small Form Help Text Style Constant Pack

---

## Audit Özeti

Tüm frontend form ve panel bileşen dosyaları tekrar eden help text / muted text style bloğu açısından tarandı.

### Tespit Edilen Pattern'ler

#### Pattern A: `{ color: "#dc2626", fontSize: "0.8rem", margin: "0.25rem 0 0" }` — validation hint

| Dosya | Tekrar |
|---|---|
| `StandardVideoForm.tsx` | 2× |
| `StandardVideoMetadataForm.tsx` | 1× |
| `StandardVideoScriptForm.tsx` | 1× |

**Karar:** Threshold 3+ sağlanamadı. Max 2× per dosya. Atlandı.

#### Pattern B: `{ color: "#dc2626", fontSize: "0.875rem", marginBottom: "0.75rem", wordBreak: "break-word", overflowWrap: "anywhere" }` — submitError

| Dosya | Tekrar |
|---|---|
| `TemplateForm.tsx`, `UsedNewsForm.tsx`, `NewsItemForm.tsx`, `StyleBlueprintForm.tsx`, `TemplateStyleLinkForm.tsx`, `SourceScanForm.tsx` | 1× per dosya |

**Karar:** Her dosyada 1×, threshold altı. Atlandı.

#### Pattern C: `{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }` — label helper

| Dosya | Tekrar |
|---|---|
| `JsonPreviewField.tsx` | 2× |

**Karar:** 2×, threshold 3+ altı. Atlandı.

#### Pattern D: `{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 400 }` — muted span

| Dosya | Tekrar |
|---|---|
| `StandardVideoMetadataForm.tsx` | 1× |

**Karar:** 1×, threshold altı. Atlandı.

---

## Sonuç

Aynı dosya içinde 3+ tekrar eden help text / muted text inline style pattern bulunamadı.
Her dosyada max 2× görülüyor. Dosya değişikliği yapılmadı.

Phase 176 audit-only olarak kapatılıyor.

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
