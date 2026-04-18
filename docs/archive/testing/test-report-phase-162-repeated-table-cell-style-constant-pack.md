# Test Report — Phase 162: Repeated Table Cell Style Constant Pack

**Tarih:** 2026-04-03
**Faz:** 162
**Başlık:** Repeated Table Cell Style Constant Pack

---

## Yapılan Değişiklikler

Registry tablo bileşenlerinde tekrar eden `th`/`td` inline style nesneleri dosya başı `const` ile extraction yapıldı. Görünüm ve davranış değişmedi.

### Değişen Dosyalar

| Dosya | TH Const | TD Const | Extraction |
|---|---|---|---|
| SourcesTable.tsx | TH_STYLE | TD_STYLE | 16+16 hücre |
| SourceScansTable.tsx | TH_STYLE | TD_STYLE | 13+13 hücre |
| NewsItemsTable.tsx | TH_STYLE | TD_STYLE | 17+17 hücre |
| NewsBulletinsTable.tsx | TH_STYLE | TD_STYLE | 18+18 hücre |
| UsedNewsTable.tsx | TH_STYLE | TD_STYLE | 13+13 hücre |
| JobsTable.tsx | TH_STYLE | TD_STYLE | 15+15 hücre |
| TemplatesTable.tsx | TH_STYLE | TD_STYLE | 14+14 hücre |
| StyleBlueprintsTable.tsx | TH_STYLE | TD_STYLE | 12+12 hücre |
| StandardVideosTable.tsx | TH_STYLE | TD_STYLE | 13+13 hücre |
| SettingsTable.tsx | TD_STYLE | TD_STYLE | 5+5 hücre |
| VisibilityRulesTable.tsx | TD_STYLE | TD_STYLE | 6+6 hücre |
| NewsItemPickerTable.tsx | TH_STYLE | — | 5 th hücre |

### Extraction Pattern'leri

**Büyük tablolar (10 dosya):**
```tsx
const TH_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem" };
```

**SettingsTable + VisibilityRulesTable:**
```tsx
const TD_STYLE: React.CSSProperties = { padding: "0.5rem" };
```

**NewsItemPickerTable:**
```tsx
const TH_STYLE: React.CSSProperties = { textAlign: "left", padding: "0.375rem 0.5rem", color: "#64748b", fontWeight: 500 };
```

---

## Notlar

- `SettingsTable` ve `VisibilityRulesTable`'da TH ve TD aynı padding değerine sahip olduğundan `TD_STYLE` her ikisine de uygulandı
- `NewsItemPickerTable`'da TD'ler farklı ek style'lar içerdiğinden yalnızca TH extraction yapıldı
- Ek style içeren TD hücrelerine (fontFamily, maxWidth, color vb.) dokunulmadı

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
- Ek style property'li TD'lere dokunulmadı
- Backend değişikliği yapılmadı
