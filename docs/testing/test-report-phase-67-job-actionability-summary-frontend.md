# Test Report — Phase 67: Job Actionability Summary Frontend

## Amaç
Jobs registry listesinde her job için sade execution/actionability özeti göstermek.

## Çalıştırılan Komutlar
```
node ./node_modules/.bin/vitest run src/tests/job-actionability-summary.smoke.test.tsx
node ./node_modules/.bin/vitest run
node ./node_modules/.bin/vite build
```

## Seçilen Yaklaşım
Backend değişikliği yapılmadı. Mevcut `status`, `last_error`, `retry_count`, `current_step_key`, `estimated_remaining_seconds` alanlarından frontend türetildi.

Actionability mantığı:
- last_error dolu veya status = failed → Dikkat gerekli
- status = queued → Bekliyor
- status = running/processing/in_progress → Çalışıyor
- status = completed/done/finished → Tamamlandı
- null/bilinmeyen → Belirsiz

Secondary detail: current_step_key + retry count + ETA gösterimi.

## Test Sonuçları
- 10 yeni frontend test — tümü geçti
- 433 toplam frontend test — tümü geçti
- vite build — başarılı

## Değişiklikler
- `JobActionabilityBadge.tsx` (yeni)
- `JobActionabilitySummary.tsx` (yeni, computeJobActionability helper dahil)
- `JobsTable.tsx` — Aksiyon Özeti sütunu eklendi
- `job-actionability-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Retry/cancel action button, SSE/live progress, orchestration motoru, analytics

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
