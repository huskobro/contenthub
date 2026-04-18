# Test Report — Phase 183: Repeated Small Font Weight Constant Pack

**Tarih:** 2026-04-03
**Faz:** 183
**Başlık:** Repeated Small Font Weight Constant Pack

---

## Audit Özeti

Tüm frontend bileşen dosyaları tekrar eden `fontWeight` literal'ları ve bunları içeren tam style object'ler açısından tarandı.

### Gerçek Extraction Fırsatları

| Dosya | Style | Tekrar | Const | Durum |
|---|---|---|---|---|
| `TemplateStyleLinksTable.tsx` | `{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600, color: "#475569" }` | 6× | `TH_CELL` | ✅ Extraction yapıldı |
| `NewsBulletinSelectedItemsPanel.tsx` | `{ textAlign: "left", padding: "0.25rem 0.5rem", color: MUTED_TEXT, fontWeight: 500 }` | 5× | `TH_CELL` | ✅ Extraction yapıldı |

---

## Yapılan Değişiklikler

### TemplateStyleLinksTable.tsx

```tsx
const TH_CELL: React.CSSProperties = { textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600, color: "#475569" };
```

- 6× `<th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600, color: "#475569" }}>` → `<th style={TH_CELL}>`
- Ekleme yeri: `STATUS_COLORS` const'ından önce

### NewsBulletinSelectedItemsPanel.tsx

```tsx
const TH_CELL: React.CSSProperties = { textAlign: "left", padding: "0.25rem 0.5rem", color: MUTED_TEXT, fontWeight: 500 };
```

- 5× `<th style={{ textAlign: "left", padding: "0.25rem 0.5rem", color: MUTED_TEXT, fontWeight: 500 }}>` → `<th style={TH_CELL}>`
- Ekleme yeri: `MUTED_TEXT` const'ından sonra

---

## Atlanılan Dosyalar ve Gerekçeler

- `StandardVideoArtifactsPanel.tsx`: `fontWeight: 600` (1×) ve `fontWeight: 500` (2×) — farklı nesnelerde, threshold altı
- `StandardVideoMetadataPanel.tsx`: 2× `fontWeight: 600` — farklı nesnelerde, threshold altı
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
