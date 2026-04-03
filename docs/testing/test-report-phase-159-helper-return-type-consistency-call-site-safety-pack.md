# Test Report — Phase 159: Helper Return-Type Consistency & Call-Site Safety Pack

## Amaç
Helper fonksiyonlarının dönüş tipleri ile call-site beklentileri arasındaki tutarsızlıkları giderme.

## Gözden Geçirilen Helper/Call-Site Yüzeyleri
- `formatDate.ts`: formatDateTime, formatDateShort, formatDateISO, normalizeDateForInput
- `safeNumber.ts`: safeNumber
- `safeJson.ts`: safeJsonPretty, validateJson
- `formatDuration.ts`: formatDuration
- `isBlank.ts`: isBlank
- 22+ call-site (detail panel, overview panel, table bileşenleri)

## Yapılan Consistency İyileştirmeleri

### formatDateTime default fallback tutarlılığı
- **Önce:** `formatDateTime(value, fallback: string | null = null): string | null` — default `null`, dönüş `string | null`
- **Sonra:** `formatDateTime(value, fallback: string = "—"): string` — default `"—"`, dönüş `string`
- **Neden:** `formatDateShort` zaten `default "—"` ve `string` döndürüyordu. `formatDateTime` tutarsız şekilde `null` döndürüyordu. Field bileşenleri `null`'ı `isBlank` ile zaten `"—"` olarak render ediyordu, dolayısıyla görsel sonuç aynı.
- **Etki:** 22 call-site artık guaranteed `string` alıyor, `null` check gereksizliği ortadan kalktı.

### Gözden geçirilip dokunulmayan helper'lar
- `formatDateISO`: ReactNode dönüş tipi gerekli (Job panellerinde JSX em-dash fallback)
- `formatDateShort`: Zaten tutarlı (string, default "—")
- `safeNumber`: Zaten tutarlı (number, default 0)
- `safeJsonPretty`: Zaten tutarlı (string, default "—")
- `formatDuration`: Hardcoded "—" yeterli (parametrize etmek over-engineering)
- `isBlank`: Zaten tutarlı (boolean)
- Call-site'larda redundant `??` veya defensive pattern tespit edilmedi

## Eklenen/Güncellenen Testler
- `date-formatting-safety.smoke.test.tsx`: 1 assertion güncellendi (`toBeNull()` → `toBe("—")`)

## Çalıştırılan Komutlar
```
npx vitest run
npx tsc --noEmit
npx vite build
```

## Test Sonuçları
- Vitest: 1587 test, 127 dosya — TAMAMI GEÇER
- tsc --noEmit: HATA YOK
- vite build: BAŞARILI

## Bilerek Yapılmayanlar
- Helper mimarisi yeniden yazılmadı
- formatDateISO ReactNode dönüş tipi korundu (gerekli)
- formatDuration parametrize edilmedi (over-engineering)
- Yeni helper eklenmedi
- Badge stilleri korundu
- Backend değişikliği yok

## Riskler
- Yok. formatDateTime artık null yerine "—" döndürüyor, call-site'lar zaten bu değeri kullanıyordu (Field → isBlank → "—").
