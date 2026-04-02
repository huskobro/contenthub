# Test Report: Phase 82 — Template Publication Signal Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 82
**Scope:** Templates publication signal visibility — pure frontend derivation, no backend changes

---

## Amaç

Admin Templates registry listesinde her template'in yayın akışında ne kadar kullanılabilir göründüğünü tek bakışta göstermek. Resolve preview, precedence motoru veya publish pipeline yazmadan.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/template-publication-signal-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Signal Yaklaşımı

Saf frontend türetimi — backend değişikliği yapılmadı. Template_type'a göre "ana JSON alan" seçimi yapıldı:
- `style` → `style_profile_json`
- `content` → `content_rules_json`
- `publish` → `publish_profile_json`

Signal logic (deterministik):
- JSON boş + active → `Kısmen hazır`
- JSON boş → `Başlangıç`
- JSON dolu + links=0 → `Taslak`
- JSON dolu + links > 0 + not active → `Bağlandı`
- JSON dolu + links > 0 + active → `Yayına yakın`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | style + no JSON → Başlangıç | ✅ |
| 2 | active + no JSON → Kısmen hazır | ✅ |
| 3 | style JSON + no links → Taslak | ✅ |
| 4 | style JSON + links + not active → Bağlandı | ✅ |
| 5 | style JSON + links + active → Yayına yakın | ✅ |
| 6 | content + no JSON → Başlangıç | ✅ |
| 7 | content JSON + no links → Taslak | ✅ |
| 8 | publish JSON + links + active → Yayına yakın | ✅ |
| 9 | unknown type + no JSON → Başlangıç | ✅ |
| 10 | style_link_count null → Taslak | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 583/583 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Resolve preview
- Precedence motoru
- Style merge logic
- Gerçek publish pipeline
- Analytics / wizard / user panel

---

## Riskler

- `unknown` template_type için `getMainJson` null döndürüyor → `Başlangıç` düşüyor. Kasıtlı.
