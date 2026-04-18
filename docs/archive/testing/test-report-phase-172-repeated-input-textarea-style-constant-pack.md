# Test Report — Phase 172: Repeated Input/Textarea Style Constant Pack

**Tarih:** 2026-04-03
**Faz:** 172
**Başlık:** Repeated Input/Textarea Style Constant Pack

---

## Audit Özeti

Tüm frontend form bileşen dosyaları tekrar eden input/textarea style bloğu açısından tarandı.

### Gerçek Extraction Fırsatları

| Dosya | Style | Tekrar | Const | Durum |
|---|---|---|---|---|
| `TemplateForm.tsx` | `{ ...inputStyle, minHeight: "70px", resize: "vertical", fontFamily: "monospace", fontSize: "0.8rem" }` | 3 kez | `JSON_TEXTAREA` | ✅ Extraction yapıldı |
| `StyleBlueprintForm.tsx` | aynı (6 JSON field'ı map ile) | map içinde 1 tanım, 6 render | `JSON_TEXTAREA` | ✅ Extraction yapıldı |
| `SourceScanForm.tsx` | `{ ...inputStyle, minHeight: "50px", resize: "vertical" }` | 2 kez | `TEXTAREA` | ✅ Extraction yapıldı |

---

## Yapılan Değişiklikler

### TemplateForm.tsx

```tsx
const JSON_TEXTAREA: React.CSSProperties = {
  ...inputStyle,
  minHeight: "70px",
  resize: "vertical",
  fontFamily: "monospace",
  fontSize: "0.8rem",
};
```

- 3 × JSON textarea inline style → `style={{ ...JSON_TEXTAREA, borderColor: errors.X ? "#dc2626" : BORDER_COLOR }}`

### StyleBlueprintForm.tsx

```tsx
const JSON_TEXTAREA: React.CSSProperties = {
  ...inputStyle,
  minHeight: "70px",
  resize: "vertical",
  fontFamily: "monospace",
  fontSize: "0.8rem",
};
```

- Map içindeki tek textarea style inline → `style={{ ...JSON_TEXTAREA, borderColor: errors[field] ? "#dc2626" : BORDER_COLOR }}`

### SourceScanForm.tsx

```tsx
const TEXTAREA: React.CSSProperties = {
  ...inputStyle,
  minHeight: "50px",
  resize: "vertical",
};
```

- 2 × `style={{ ...inputStyle, minHeight: "50px", resize: "vertical" }}` → `style={TEXTAREA}`

---

## Atlanılan Dosyalar ve Gerekçeler

- `NewsItemForm.tsx`, `UsedNewsForm.tsx`, `SourceForm.tsx`: textarea 1× per dosya — threshold altı
- `NewsBulletinScriptForm.tsx`: monospace textarea 1× + 3× plain (Phase 171'de FIELD extraction zaten yapıldı)

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
