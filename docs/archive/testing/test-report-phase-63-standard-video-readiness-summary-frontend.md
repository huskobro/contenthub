# Test Report — Phase 63: Standard Video Readiness Summary Frontend

## Amaç
Standard Video registry listesinde her kayıt için sade readiness özeti göstermek.

## Çalıştırılan Komutlar
```
node ./node_modules/.bin/vitest run src/tests/standard-video-readiness-summary.smoke.test.tsx
node ./node_modules/.bin/vitest run
node ./node_modules/.bin/vite build
```

## Seçilen Yaklaşım
Backend değişikliği yapılmadı. Mevcut `topic` ve `status` alanlarından frontend türetildi.

Readiness mantığı:
- topic null/boş → Başlangıç
- topic var + draft → Taslak
- topic var + script_ready → Script hazır
- topic var + metadata_ready veya ready → Hazır
- metadata_only (edge case) → Kısmen hazır

## Test Sonuçları
- 10 yeni frontend test — tümü geçti
- 393 toplam frontend test — tümü geçti
- vite build — başarılı

## Değişiklikler
- `StandardVideoReadinessBadge.tsx` (yeni)
- `StandardVideoReadinessSummary.tsx` (yeni, computeStandardVideoReadiness helper dahil)
- `StandardVideosTable.tsx` — Hazırlık sütunu eklendi
- `standard-video-readiness-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Publish readiness skoru, generate action, bulk action, preview-first UI, wizard

## Riskler
- has_script / has_metadata backend alanları yok; status alanından çıkarım yapılıyor
- Auth/rol zorlama henüz yok (kasıtlı)
