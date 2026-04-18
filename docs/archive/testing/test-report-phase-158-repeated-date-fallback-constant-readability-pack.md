# Test Report — Phase 158: Repeated Date Fallback Constant & Readability Pack

## Amaç
Date render yüzeylerinde kalan inline `"—"` fallback tekrarlarını DASH const'a dönüştürme. Ayrıca Phase 157'de kaçan birkaç inline `"—"` kalıntısını temizleme.

## Gözden Geçirilen Date Fallback Yüzeyleri
- Tüm tablo, detail panel, overview panel ve script panel dosyaları tarandı
- Çoğu date rendering zaten Field component veya format helper fallback parametresi ile güvenli
- Inline date ternary pattern (`date ? format(date) : "—"`) yok — tüm date rendering helper'lar üzerinden
- 4 dosyada kalan inline `"—"` tespit edildi

## Yapılan Küçük Readability İyileştirmeleri
1. **StandardVideoOverviewPanel.tsx**: `const DASH = "—"` eklendi, 3 inline `"—"` → `DASH` (Row helper + 2 formatDateTime fallback)
2. **StandardVideosTable.tsx**: `formatDateTime(v.created_at, "—")` → `formatDateTime(v.created_at, DASH)` (zaten DASH const mevcut)
3. **NewsBulletinScriptPanel.tsx**: content block ternary `? "—"` → `? DASH` (zaten DASH const mevcut, Phase 157'de kaçmış)
4. **StandardVideoScriptPanel.tsx**: content block ternary `? "—"` → `? DASH` (zaten DASH const mevcut, Phase 157'de kaçmış)

## Eklenen/Güncellenen Testler
- Test güncellemesi gerekmedi (davranış değişmedi, mevcut testler geçiyor)

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
- 2 tekrarlı dosyalara dokunulmadı (NewsItemsTable, TemplateStyleLinksTable vb.)
- Date helper mimarisi değiştirilmedi
- Locale davranışı değiştirilmedi
- Relative time eklenmedi
- Badge stilleri korundu
- Backend değişikliği yok

## Riskler
- Yok. Tüm değişiklikler saf string constant extraction, davranış aynı kaldı.
