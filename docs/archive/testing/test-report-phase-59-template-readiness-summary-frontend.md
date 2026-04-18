# Test Report — Phase 59: Template Readiness Summary Frontend

## Amaç
Templates registry listesinde her template için sade üretim hazırlık özeti göstermek.

## Çalıştırılan Komutlar
```
node ./node_modules/.bin/vitest run src/tests/template-readiness-summary.smoke.test.tsx
node ./node_modules/.bin/vitest run
node ./node_modules/.bin/vite build
```

## Seçilen Yaklaşım
Backend değişikliği yapılmadı. Mevcut alanlardan (style_link_count, status, JSON alanları) frontend'de türetildi.

Template type'a göre "ana JSON alan":
- style → style_profile_json
- content → content_rules_json
- publish → publish_profile_json
- diğer → ilk dolu olan

Readiness mantığı:
- active + hasJson + hasLink → Hazır
- active + (!hasJson || !hasLink) → Kısmen hazır
- hasJson + hasLink → Bağlandı
- hasJson + no link → Taslak
- diğer → Başlangıç

## Test Sonuçları
- 10 yeni frontend test — tümü geçti
- 353 toplam frontend test — tümü geçti
- vite build — başarılı

## Değişiklikler
- `TemplateReadinessBadge.tsx` (yeni)
- `TemplateReadinessSummary.tsx` (yeni, computeTemplateReadiness helper dahil)
- `TemplatesTable.tsx` — Hazırlık sütunu eklendi
- `template-readiness-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Resolve preview UI, precedence motoru, style merge, publish readiness motoru

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
