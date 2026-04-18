# Test Report — Phase 57: Job Context Summary Frontend

## Amaç
Jobs registry listesinde her job için module-aware context summary göstermek.

## Çalıştırılan Komutlar
```
node ./node_modules/.bin/vitest run src/tests/job-context-summary.smoke.test.tsx
node ./node_modules/.bin/vitest run
node ./node_modules/.bin/vite build
```

## Seçilen Context Yaklaşımı
Backend değişikliği yapılmadı. Mevcut `module_type` ve `source_context_json` alanlarından frontend'de türetildi.

Context title çıkarım sırası:
1. `source_context_json` içinden `title` → `topic` → `name`
2. Bulunamazsa yalnızca module badge gösterilir

Module label mapping:
- `standard_video` → "Standard Video"
- `news_bulletin` → "News Bulletin"
- bilinmeyenler → raw module_type

## Test Sonuçları
- 10 yeni frontend test — tümü geçti
- 333 toplam frontend test — tümü geçti
- `vite build` — başarılı

## Değişiklikler
Frontend (yeni):
- `JobContextBadge.tsx` — module_type'tan okunabilir label
- `JobContextSummary.tsx` — badge + optional context title detail + `extractContextTitle()` helper

Frontend (güncellendi):
- `JobsTable.tsx` — "Context" sütunu eklendi

Test:
- `job-context-summary.smoke.test.tsx` (10 test)

## Bilerek Yapılmayanlar
- Backend enrichment / job-content join
- Polling/SSE entegrasyonu
- Action buttons
- Timeline iyileştirmesi
- User panel jobs
- Analytics/reporting

## Riskler
- `source_context_json` schema belirsiz; farklı modüller farklı key kullanıyor olabilir — `extractContextTitle` sadece title/topic/name'i dener, bilinmeyenleri sessizce yoksayar
- Auth/rol zorlama henüz yok (kasıtlı)
