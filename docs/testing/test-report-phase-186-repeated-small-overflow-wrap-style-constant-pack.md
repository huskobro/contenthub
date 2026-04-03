# Test Report — Phase 186: Repeated Small Overflow/Wrap Style Constant Pack

**Tarih:** 2026-04-03
**Faz:** 186
**Başlık:** Repeated Small Overflow/Wrap Style Constant Pack

---

## Audit Özeti

Tüm frontend bileşen dosyaları tekrar eden `{ wordBreak: "break-word", overflowWrap: "anywhere" }` inline style object'leri açısından tarandı.

### Gerçek Extraction Fırsatları

| Dosya | Literal | Tekrar | Const | Durum |
|---|---|---|---|---|
| `NewsBulletinMetadataPanel.tsx` | `{ wordBreak: "break-word", overflowWrap: "anywhere" }` | 3× inline td style | `WRAP_WORD` | ✅ Extraction yapıldı |

---

## Yapılan Değişiklikler

### NewsBulletinMetadataPanel.tsx

```tsx
const WRAP_WORD: React.CSSProperties = { wordBreak: "break-word", overflowWrap: "anywhere" };
```

- 3× `<td style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>` → `<td style={WRAP_WORD}>`
- Ekleme yeri: `DASH` const'ından hemen sonra (zaten mevcut `WRAP_WORD` satırı orada bulunuyordu — önceki session'dan gelen değişiklik)

### text-overflow-safety.smoke.test.tsx

- `NewsBulletinMetadataPanel title td has overflow protection` testi güncellendi
- Assertion: `line!.includes("WRAP_WORD")` eklendi — const-based extraction'ı da geçerli sayar
- Gerekçe: Structural guard test, inline stil stringlerini arıyordu; `WRAP_WORD` const extraction sonrası td satırında artık inline string yoktu

---

## Atlanılan Dosyalar ve Gerekçeler

- Diğer tüm dosyalar: `{ wordBreak: "break-word", overflowWrap: "anywhere" }` kombinasyonu 3'ün altında — threshold altı

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
