# Test Report — Phase 185: Repeated Small Cursor/Pointer Style Constant Pack

**Tarih:** 2026-04-03
**Faz:** 185
**Başlık:** Repeated Small Cursor/Pointer Style Constant Pack

---

## Audit Özeti

Tüm frontend bileşen dosyaları tekrar eden `cursor: "pointer"` literal'ları açısından tarandı.

### Gerçek Extraction Fırsatları

| Dosya | Literal | Tekrar | Const | Durum |
|---|---|---|---|---|
| `StandardVideoScriptPanel.tsx` | `cursor: "pointer"` | 3× inline (2 action button + 1 toggle button) | `CURSOR_PTR` | ✅ Extraction yapıldı |

---

## Yapılan Değişiklikler

### StandardVideoScriptPanel.tsx

```tsx
const CURSOR_PTR = "pointer";
```

- 3× `cursor: "pointer"` → `cursor: CURSOR_PTR,`
- Ekleme yeri: `RADIUS_XS` const'ından hemen sonra

---

## Atlanılan Dosyalar ve Gerekçeler

- Tüm form dosyaları (UsedNewsForm, TemplateStyleLinkForm, TemplateForm, StyleBlueprintForm, StandardVideoScriptForm, StandardVideoMetadataForm, StandardVideoForm, SourceScanForm, SourceForm, NewsItemForm): 2× her biri `isSubmitting ? "not-allowed" : "pointer"` ternary içinde — threshold altı
- `StandardVideoMetadataPanel.tsx`: 2× — threshold altı
- Diğer dosyalar: 1× threshold altı

---

## Test Sonuçları

| Kategori | Sonuç |
|---|---|
| tsc --noEmit | ✅ Temiz (0 hata) |
| vitest run | ✅ 127/127 test dosyası, 1587/1587 test geçti |
| vite build | ✅ Temiz |

---

## Dokunulmayanlar

- Görünüm değiştirilmedi
- Davranış değiştirilmedi
- Badge stilleri değiştirilmedi
- Backend değişikliği yapılmadı
