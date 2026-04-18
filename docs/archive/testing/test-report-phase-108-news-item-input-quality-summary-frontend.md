# Test Report: Phase 108 — News Item Input Quality Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 108
**Scope:** News Items registry source-input quality özeti — pure frontend türetimi

---

## Amaç

Admin News Items listesinde her haber kaydının giriş içeriğinin kalitesini (`Güçlü giriş` / `Kısmi giriş` / `Zayıf giriş`) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/news-item-input-quality-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Consistency Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Kalite skorlama:**
- `title` veya `url` boş → `Zayıf giriş`
- `title` + `url` var, `summary` yok → `Kısmi giriş`
- `title` + `url` + `summary` var, extra yok → `Kısmi giriş`
- `title` + `url` + `summary` + herhangi extra (source_id|source_scan_id|language|category|published_at) → `Güçlü giriş`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | title null → Zayıf giriş | ✅ |
| 2 | url null → Zayıf giriş | ✅ |
| 3 | title whitespace → Zayıf giriş | ✅ |
| 4 | title + url + no summary → Kısmi giriş | ✅ |
| 5 | title + url + summary + no extras → Kısmi giriş | ✅ |
| 6 | + source_id → Güçlü giriş | ✅ |
| 7 | + language → Güçlü giriş | ✅ |
| 8 | + category → Güçlü giriş | ✅ |
| 9 | + published_at → Güçlü giriş | ✅ |
| 10 | all fields → Güçlü giriş | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 843/843 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Content depth analizi
- NLP/semantic kalite skoru
- Filter/search entegrasyonu
- Bulk actions

---

## Riskler

- `status` alanı ana quality state'ini belirlemiyor — intentional.
- `published_at` string null check ile kontrol ediliyor.
