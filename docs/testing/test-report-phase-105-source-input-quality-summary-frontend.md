# Test Report: Phase 105 — Source Input Quality Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 105
**Scope:** Sources registry source-input quality özeti — pure frontend türetimi

---

## Amaç

Admin Sources listesinde her source kaydının giriş yapılandırmasının kalitesini (`Güçlü giriş` / `Kısmi giriş` / `Zayıf giriş`) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-input-quality-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Consistency Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Source type'a göre gerekli config alanı:**
- `rss` → `feed_url`
- `manual_url` → `base_url`
- `api` → `api_endpoint`
- bilinmiyor → ilk dolu olan

**Kalite skorlama:**
- gerekli config alanı boş/null → `Zayıf giriş`
- config dolu ama `name` veya `language` eksik → `Kısmi giriş`
- config dolu + `name` + `language` → `Güçlü giriş`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | rss + feed_url null → Zayıf giriş | ✅ |
| 2 | manual_url + base_url empty → Zayıf giriş | ✅ |
| 3 | api + api_endpoint null → Zayıf giriş | ✅ |
| 4 | unknown type + all config null → Zayıf giriş | ✅ |
| 5 | rss + feed_url + no language → Kısmi giriş | ✅ |
| 6 | manual_url + base_url + no name → Kısmi giriş | ✅ |
| 7 | api + api_endpoint + no language → Kısmi giriş | ✅ |
| 8 | rss + feed_url + name + language → Güçlü giriş | ✅ |
| 9 | manual_url + base_url + name + language → Güçlü giriş | ✅ |
| 10 | api + all fields → Güçlü giriş | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 813/813 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Scan health entegrasyonu
- Category validasyonu
- Filter/search entegrasyonu
- Bulk actions

---

## Riskler

- `name` field her zaman non-null (required) ama whitespace guard eklendi.
- Unknown source_type için fallback ilk dolu config alanını kullanıyor.
