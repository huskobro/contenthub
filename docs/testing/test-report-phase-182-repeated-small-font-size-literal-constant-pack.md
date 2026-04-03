# Test Report — Phase 182: Repeated Small Font Size Literal Constant Pack

**Tarih:** 2026-04-03
**Faz:** 182
**Başlık:** Repeated Small Font Size Literal Constant Pack

---

## Audit Özeti

Tüm frontend bileşen dosyaları tekrar eden `fontSize` literal'ları açısından tarandı.

### Gerçek Extraction Fırsatları

| Dosya | Literal | Tekrar | Const | Durum |
|---|---|---|---|---|
| `StandardVideoArtifactsPanel.tsx` | `"0.875rem"` | 8× inline | `FONT_SM` | ✅ Extraction yapıldı |
| `SourceScanDetailPanel.tsx` | `"0.875rem"` | 3× inline | `FONT_SM` | ✅ Extraction yapıldı |
| `SourceDetailPanel.tsx` | `"0.875rem"` | 3× inline | `FONT_SM` | ✅ Extraction yapıldı |

---

## Yapılan Değişiklikler

### StandardVideoArtifactsPanel.tsx

```tsx
const FONT_SM = "0.875rem";
```

- 8× `fontSize: "0.875rem"` → `fontSize: FONT_SM,`
- Ekleme yeri: `interface Props` tanımından önce

### SourceScanDetailPanel.tsx

```tsx
const FONT_SM = "0.875rem";
```

- 3× `fontSize: "0.875rem"` → `fontSize: FONT_SM,`
- Ekleme yeri: `LABEL_SPAN` const'tan önce

### SourceDetailPanel.tsx

```tsx
const FONT_SM = "0.875rem";
```

- 3× `fontSize: "0.875rem"` → `fontSize: FONT_SM,`
- Ekleme yeri: `LABEL_SPAN` const'tan önce

---

## Atlanılan Dosyalar ve Gerekçeler

- Form dosyaları: `fontSize` zaten `inputStyle`/`labelStyle`/`BTN_PRIMARY` const tanımlarında — inline kullanım değil
- `JobTimelinePanel.tsx`, `StandardVideoMetadataPanel.tsx`: 2× `"0.875rem"` — threshold altı
- Diğer dosyalar: max 2× threshold altı

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
