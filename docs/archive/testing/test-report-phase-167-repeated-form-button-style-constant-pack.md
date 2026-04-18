# Test Report — Phase 167: Repeated Form Button Style Constant Pack

**Tarih:** 2026-04-03
**Faz:** 167
**Başlık:** Repeated Form Button Style Constant Pack

---

## Amaç

Form bileşenlerindeki save/cancel button inline style bloklarını dosya-seviyesi const'lara (`BTN_PRIMARY`, `BTN_CANCEL`) çıkararak kod tekrarını azalt. Görünüm ve davranış değişmemeli.

---

## Gözden Geçirilen Form Button Style Yüzeyleri

### Pattern A — Küçük buton (0.375rem padding, `#f1f5f9` cancel)
| Dosya | Önceki | Sonraki |
|---|---|---|
| `NewsItemForm.tsx` | 2 × inline 7-satır style bloğu | `BTN_PRIMARY` + `BTN_CANCEL` const + spread |
| `UsedNewsForm.tsx` | 2 × inline 7-satır style bloğu | `BTN_PRIMARY` + `BTN_CANCEL` const + spread |
| `TemplateStyleLinkForm.tsx` | 2 × inline 7-satır style bloğu | `BTN_PRIMARY` + `BTN_CANCEL` const + spread |
| `TemplateForm.tsx` | 2 × inline style bloğu (zaten BORDER_COLOR kullanıyor) | `BTN_PRIMARY` + `BTN_CANCEL` (BTN_CANCEL border `${BORDER_COLOR}`) |
| `SourceScanForm.tsx` | 2 × inline style bloğu | `BTN_PRIMARY` + `BTN_CANCEL` |
| `StyleBlueprintForm.tsx` | 2 × inline style bloğu | `BTN_PRIMARY` + `BTN_CANCEL` |

### Pattern B — Büyük buton (0.5rem padding, transparent cancel)
| Dosya | Önceki | Sonraki |
|---|---|---|
| `StandardVideoForm.tsx` | 2 × inline 8-satır style bloğu | `BTN_PRIMARY` + `BTN_CANCEL` const |
| `StandardVideoMetadataForm.tsx` | 2 × inline style bloğu | `BTN_PRIMARY` + `BTN_CANCEL` |
| `StandardVideoScriptForm.tsx` | 2 × inline style bloğu | `BTN_PRIMARY` + `BTN_CANCEL` |

### Atlananlar (style yok veya farklı pattern)
- `NewsBulletinSelectedItemForm.tsx` — button style yok (default browser)
- `NewsBulletinMetadataForm.tsx` — button style yok
- `NewsBulletinScriptForm.tsx` — button style yok
- `SourceForm.tsx` — farklı renk palette (`#1e40af`, `transparent` cancel), Phase kapsamı dışı

---

## Yapılan Küçük Style-Constant/Readability İyileştirmeleri

**Pattern A const'ları:**
```tsx
const BTN_PRIMARY: React.CSSProperties = {
  padding: "0.375rem 1rem",
  fontSize: "0.875rem",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
};
const BTN_CANCEL: React.CSSProperties = {
  padding: "0.375rem 1rem",
  fontSize: "0.875rem",
  background: "#f1f5f9",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: "4px",
};
```

**Pattern B const'ları:**
```tsx
const BTN_PRIMARY: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  fontSize: "0.875rem",
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
};
const BTN_CANCEL: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  fontSize: "0.875rem",
  background: "transparent",
  color: "#64748b",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  cursor: "pointer",
};
```

Dynamic overrides spread ile korundu: `{ ...BTN_PRIMARY, background: isSubmitting ? "..." : "...", cursor: ... }`

---

## Eklenen/Güncellenen Testler

Pattern değişimi davranışı etkilemiyor — yeni test eklenmedi. Tüm mevcut testler geçiyor.

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

- `SourceForm.tsx` — Farklı renk palette (`#1e40af` submit, transparent cancel `#cbd5e1`). Bu formdaki stil farklı bir aileden — bu Phase'e dahil edilmedi.
- `NewsBulletinForm.tsx`, `NewsBulletinMetadataForm.tsx`, `NewsBulletinScriptForm.tsx`, `NewsBulletinSelectedItemForm.tsx` — inline button style yok, default browser düğmeleri.
- Global button utility oluşturulmadı — Phase kapsamı yalnızca dosya-seviyesi const.

---

## Riskler

Yok. Spread pattern (`{ ...BTN_PRIMARY, ... }`) React/TypeScript'te standard kullanım. Dinamik `background` ve `cursor` override'ları korundu.
