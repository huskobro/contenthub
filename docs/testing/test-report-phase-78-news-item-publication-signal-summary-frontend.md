# Test Report: Phase 78 — News Item Publication Signal Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 78
**Scope:** News Items publication signal visibility — pure frontend derivation, no backend changes

---

## Amaç

Admin News Items registry listesinde her haber kaydının yayın/dağıtım açısından ne kadar uygun göründüğünü tek bakışta göstermek. Publish scoring, moderation veya bulk actions yazmadan.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/news-item-publication-signal-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Publication Signal Yaklaşımı

Saf frontend türetimi — backend değişikliği yapılmadı. Mevcut `status`, `usage_count`, `title`, `summary`, `url` alanları kullanıldı.

Signal logic (deterministik):
- `status = ignored` → `Hariç`
- `status = used` veya `usage_count > 0` → `Kullanıldı`
- `status = reviewed` + title+summary+url dolu → `Yayına yakın`
- title+url dolu → `Aday`
- diğer → `Zayıf`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | status=ignored → Hariç | ✅ |
| 2 | status=used → Kullanıldı | ✅ |
| 3 | used_news_count>0 → Kullanıldı | ✅ |
| 4 | reviewed + tam içerik → Yayına yakın | ✅ |
| 5 | reviewed + summary eksik → Aday | ✅ |
| 6 | new + title+url dolu → Aday | ✅ |
| 7 | status null + title+url dolu → Aday | ✅ |
| 8 | title eksik → Zayıf | ✅ |
| 9 | url eksik → Zayıf | ✅ |
| 10 | title whitespace → Zayıf | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 543/543 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Publish scoring / kalite skoru
- Moderation
- Bulk actions
- Platform-specific mapping
- Analytics
- User panel

---

## Riskler

- `usage_count` alanı `NewsItemResponse`'dan alındı (phase 55'te eklenmişti).
