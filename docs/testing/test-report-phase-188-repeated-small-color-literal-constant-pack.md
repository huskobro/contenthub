# Test Report — Phase 188: Repeated Small Color Literal Constant Pack

**Tarih:** 2026-04-03
**Faz:** 188
**Başlık:** Repeated Small Color Literal Constant Pack

---

## Amaç

Tüm frontend bileşen dosyalarında aynı dosya içinde 3+ kez tekrar eden renk hex literal değerlerini dosya-seviyesi const'lara çıkarmak. Badge surface'leri hariç. Görünüm değişikliği yok — yalnızca okunabilirlik.

---

## Gözden Geçirilen Color Literal Yüzeyleri

Tarama yapılan değerler: `#475569`, `#64748b`, `#94a3b8`, `#dc2626`, `#1e293b`, `#3b82f6`, `#f8fafc`, `#e2e8f0` ve diğerleri.

---

## Yapılan Değişiklikler

### `#1e293b` → `COLOR_DARK` (5 dosya)

| Dosya | Tekrar | Const |
|---|---|---|
| `TemplateStyleLinkDetailPanel.tsx` | 3× | `COLOR_DARK = "#1e293b"` |
| `StyleBlueprintDetailPanel.tsx` | 3× | `COLOR_DARK = "#1e293b"` |
| `TemplateDetailPanel.tsx` | 3× | `COLOR_DARK = "#1e293b"` |
| `SourceScanDetailPanel.tsx` | 3× | `COLOR_DARK = "#1e293b"` |
| `SourceDetailPanel.tsx` | 3× | `COLOR_DARK = "#1e293b"` |

### `#dc2626` → `COLOR_ERR` (10 dosya)

| Dosya | Tekrar | Const |
|---|---|---|
| `StyleBlueprintForm.tsx` | 5× | `COLOR_ERR = "#dc2626"` |
| `TemplateForm.tsx` | 8× | `COLOR_ERR = "#dc2626"` |
| `UsedNewsForm.tsx` | 6× | `COLOR_ERR = "#dc2626"` |
| `NewsItemForm.tsx` | 6× | `COLOR_ERR = "#dc2626"` |
| `TemplateStyleLinkForm.tsx` | 6× | `COLOR_ERR = "#dc2626"` |
| `StandardVideoForm.tsx` | 4× | `COLOR_ERR = "#dc2626"` |
| `StandardVideoMetadataForm.tsx` | 3× | `COLOR_ERR = "#dc2626"` |
| `StandardVideoScriptForm.tsx` | 3× | `COLOR_ERR = "#dc2626"` |
| `SourceScanForm.tsx` | 7× | `COLOR_ERR = "#dc2626"` |
| `SourceScanDetailPanel.tsx` | 3× | `COLOR_ERR = "#dc2626"` |

### `#94a3b8` → `COLOR_FAINT` (1 dosya)

| Dosya | Tekrar | Const |
|---|---|---|
| `SourceDetailPanel.tsx` | 3× | `COLOR_FAINT = "#94a3b8"` |

### `#3b82f6` → `COLOR_BLUE` (1 dosya)

| Dosya | Tekrar | Const |
|---|---|---|
| `StandardVideoScriptPanel.tsx` | 3× | `COLOR_BLUE = "#3b82f6"` |

---

## Atlanılan Dosyalar ve Gerekçeler

- `JobTimelinePanel.tsx`: `#64748b` 4× ama 1'i `STATUS_COLORS` map içinde fallback — saf inline sayısı threshold altı
- `StandardVideoArtifactsPanel.tsx`: `#64748b` 4× — zaten `FONT_SM` const var; color const eklenmedi (2 farklı context)
- `NewsItemPickerTable.tsx`, `SourcesTable.tsx`, `JobsTable.tsx`, `StandardVideosTable.tsx`: `#64748b` 3-4× ama td style nesnelerinde TH_STYLE/TD_STYLE ile karışık — threshold sınırında, bu faz için atlandı
- Badge surface'leri: talimat gereği dokunulmadı
- Global color token sistemi kurulmadı

---

## Eklenen/Güncellenen Testler

- Yeni test eklenmedi — davranış değişmedi

---

## Çalıştırılan Komutlar

```
npx tsc --noEmit
npx vitest run
npx vite build
```

---

## Test Sonuçları

| Kategori | Sonuç |
|---|---|
| tsc --noEmit | ✅ Temiz (0 hata) |
| vitest run | ✅ 127/127 test dosyası, 1587/1587 test geçti |
| vite build | ✅ Temiz |

---

## Bilerek Yapılmayanlar

- Global color token sistemi kurulmadı
- Badge surface'leri değiştirilmedi
- Görünüm değiştirilmedi
- Davranış değiştirilmedi
- Backend değişikliği yapılmadı

---

## Riskler

- Yok — pure string literal → const reference; runtime davranış aynı
