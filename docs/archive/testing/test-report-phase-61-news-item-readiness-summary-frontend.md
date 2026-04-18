# Test Report — Phase 61: News Item Readiness Summary Frontend

## Amaç
News Items registry listesinde her haber için sade operasyonel hazırlık özeti göstermek.

## Çalıştırılan Komutlar
```
node ./node_modules/.bin/vitest run src/tests/news-item-readiness-summary.smoke.test.tsx
node ./node_modules/.bin/vitest run
node ./node_modules/.bin/vite build
```

## Seçilen Yaklaşım
Backend değişikliği yapılmadı. Mevcut title, url, status alanlarından frontend türetildi.

Readiness mantığı:
- title veya url eksik → Başlangıç
- status=ignored → Hariç
- status=used → Kullanıldı
- status=reviewed → Gözden geçirildi
- status=new → Ham kayıt
- diğer → Kısmen hazır

## Test Sonuçları
- 10 yeni frontend test — tümü geçti
- 373 toplam frontend test — tümü geçti
- vite build — başarılı

## Değişiklikler
- `NewsItemReadinessBadge.tsx` (yeni)
- `NewsItemReadinessSummary.tsx` (yeni, computeNewsItemReadiness helper dahil)
- `NewsItemsTable.tsx` — Hazırlık sütunu eklendi
- `news-item-readiness-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Dedupe UI, semantic kalite skoru, moderation, bulk cleanup, analytics

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
