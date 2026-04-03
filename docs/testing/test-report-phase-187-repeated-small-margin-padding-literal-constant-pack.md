# Test Report — Phase 187: Repeated Small Margin/Padding Literal Constant Pack

**Tarih:** 2026-04-03
**Faz:** 187
**Başlık:** Repeated Small Margin/Padding Literal Constant Pack

---

## Amaç

Tüm frontend bileşen dosyalarında aynı dosya içinde 3+ kez tekrar eden margin/padding literal değerlerini dosya-seviyesi const'lara çıkarmak. Görünüm değişikliği yok — yalnızca okunabilirlik.

---

## Gözden Geçirilen Spacing Literal Yüzeyleri

Tüm `frontend/src/components/**/*.tsx` dosyaları tarandı. Aşağıdaki kriterler uygulandı:
- Aynı dosya içinde 3+ kez tekrar eden `padding`, `paddingBottom`, `margin`, `marginBottom` vb. değerler
- Dosya-içi const extraction okunabilirliği artırıyorsa extraction yapıldı
- Global token/theme sistemi kurulmadı
- Spread pattern (`{ ...TD_STYLE, color: "..." }`) bu fazın kapsamı dışında

---

## Yapılan Değişiklikler

### StandardVideoMetadataPanel.tsx

```tsx
const PAD_B_SM = "0.375rem";
```

- `LABEL_TD` const içindeki `paddingBottom: "0.375rem"` → `paddingBottom: PAD_B_SM`
- 9× inline td `paddingBottom: "0.375rem"` → `paddingBottom: PAD_B_SM`
- Toplam 10 değişim
- Ekleme yeri: `DASH` const'ından hemen sonra

### StandardVideoScriptPanel.tsx

```tsx
const PAD_B_XS = "0.25rem";
```

- `LABEL_TD` const içindeki `paddingBottom: "0.25rem"` → `paddingBottom: PAD_B_XS`
- 4× inline td `paddingBottom: "0.25rem"` → `paddingBottom: PAD_B_XS`
- Toplam 5 değişim
- Ekleme yeri: `DASH` const'ından hemen sonra (LABEL_TD'den önce — declaration sırası)

### TemplateStyleLinksTable.tsx

```tsx
const TD_PAD = "0.5rem 0.75rem";
```

- `TH_CELL` const içindeki `padding: "0.5rem 0.75rem"` → `padding: TD_PAD`
- 6× inline td `padding: "0.5rem 0.75rem"` → `padding: TD_PAD`
- Toplam 7 değişim
- Ekleme yeri: `TH_CELL` const'ından hemen önce

---

## Atlanılan Dosyalar ve Gerekçeler

- `UsedNewsTable.tsx`, `SourcesTable.tsx`, `TemplatesTable.tsx`, `StyleBlueprintsTable.tsx`, `NewsItemsTable.tsx`, `SourceScansTable.tsx`, `NewsBulletinsTable.tsx`, `JobsTable.tsx`, `StandardVideosTable.tsx`: `TD_STYLE` const'ları zaten mevcut; inline tekrarlar farklı ek özellikler içeren (`color`, `fontFamily` vb.) td'lerde — pure padding const extraction bu faz için uygun değil (spread pattern farklı faz)
- Diğer dosyalar: threshold altı (max 2× per dosya)

---

## Eklenen/Güncellenen Testler

- Yeni test eklenmedi — davranış değişmedi, mevcut guard testler yeterli

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

- Global spacing token sistemi kurulmadı
- Spread pattern (`{ ...TD_STYLE, extra }`) uygulanmadı
- Görünüm değiştirilmedi
- Davranış değiştirilmedi
- Badge stilleri değiştirilmedi
- Backend değişikliği yapılmadı

---

## Riskler

- Yok — pure string literal → const reference; runtime davranış aynı
