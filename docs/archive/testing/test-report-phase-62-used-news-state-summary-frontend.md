# Test Report — Phase 62: Used News State Summary Frontend

## Amaç
Used News registry listesinde her kayıt için sade state özeti göstermek.

## Çalıştırılan Komutlar
```
node ./node_modules/.bin/vitest run src/tests/used-news-state-summary.smoke.test.tsx
node ./node_modules/.bin/vitest run
node ./node_modules/.bin/vite build
```

## Seçilen Yaklaşım
Backend değişikliği yapılmadı. Mevcut usage_type, target_module, target_entity_id alanlarından frontend türetildi.

State mantığı:
- reserved → Rezerve
- scheduled → Planlandı
- draft → Taslakta
- published → Yayınlandı
- bilinmeyen + target_module var → Kayıtlı
- null/eksik → Belirsiz

## Test Sonuçları
- 10 yeni frontend test — tümü geçti
- 383 toplam frontend test — tümü geçti
- vite build — başarılı

## Değişiklikler
- `UsedNewsStateBadge.tsx` (yeni)
- `UsedNewsStateSummary.tsx` (yeni, computeUsedNewsState helper dahil)
- `UsedNewsTable.tsx` — Durum sütunu eklendi
- `used-news-state-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Duplicate prevention UI, reservation expiry, analytics, bulk cleanup

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
