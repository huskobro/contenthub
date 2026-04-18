# Test Report — Phase 66: Template Style Link Readiness Summary Frontend

## Amaç
Template Style Links registry listesinde her link kaydı için sade readiness/role özeti göstermek.

## Çalıştırılan Komutlar
```
node ./node_modules/.bin/vitest run src/tests/template-style-link-readiness-summary.smoke.test.tsx
node ./node_modules/.bin/vitest run
node ./node_modules/.bin/vite build
```

## Seçilen Readiness Yaklaşımı
Backend değişikliği yapılmadı. Mevcut `status`, `link_role`, `template_id`, `style_blueprint_id` alanlarından frontend türetildi.

Readiness mantığı:
- template_id veya style_blueprint_id eksik → Belirsiz
- status = archived → Arşiv
- status = inactive → Pasif
- status = active + link_role = primary → Ana bağ
- status = active + link_role = fallback → Yedek bağ
- status = active + link_role = experimental → Deneysel
- status = active + bilinmeyen role → Aktif bağ

## Test Sonuçları
- 10 yeni frontend test — tümü geçti
- 423 toplam frontend test — tümü geçti
- vite build — başarılı

## Değişiklikler
- `TemplateStyleLinkReadinessBadge.tsx` (yeni)
- `TemplateStyleLinkReadinessSummary.tsx` (yeni, computeTemplateStyleLinkReadiness helper dahil)
- `TemplateStyleLinksTable.tsx` — Bağ Durumu sütunu eklendi
- `template-style-link-readiness-summary.smoke.test.tsx` (yeni, 10 test)

## Bilerek Yapılmayanlar
- Resolve precedence motoru, preview, style merge logic, clone/version compare, user override

## Riskler
- Auth/rol zorlama henüz yok (kasıtlı)
