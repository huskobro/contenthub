# Test Report — Phase 60: Source Readiness Summary Frontend

## Amaç
Sources registry listesinde her kaynak için sade operasyonel hazırlık özeti göstermek.

## Çalıştırılan Komutlar
```
node ./node_modules/.bin/vitest run src/tests/source-readiness-summary.smoke.test.tsx
node ./node_modules/.bin/vitest run
node ./node_modules/.bin/vite build
```

## Seçilen Yaklaşım
Backend değişikliği yapılmadı. Mevcut alanlardan frontend'de türetildi.

Readiness mantığı:
- Gerekli URL eksik → Başlangıç
- last_scan_status=failed → Dikkat gerekli
- active + last_scan=completed → Hazır
- active + scan=0 → Kısmen hazır
- URL var + scan=0 → Yapılandı

## Test Sonuçları
- 10 yeni frontend test — tümü geçti
- 363 toplam frontend test — tümü geçti
- vite build — başarılı

## Değişiklikler
- `SourceReadinessBadge.tsx` (yeni)
- `SourceReadinessSummary.tsx` (yeni, computeSourceReadiness helper dahil)
- `SourcesTable.tsx` — Hazırlık sütunu eklendi
- `source-readiness-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Health score, diagnostics drawer, auto scan policy, scheduler readiness

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
