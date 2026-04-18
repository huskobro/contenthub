# Test Report: Phase 120 — Source Input Specificity Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 120
**Scope:** Sources registry module — input specificity özeti — pure frontend türetimi

---

## Amaç

Admin Sources listesinde her source kaydının girişinin ne kadar özgü olduğunu (Genel giriş / Kısmi özgüllük / Belirgin giriş) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-input-specificity-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Specificity Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**source_type'a göre gerekli config:**
- `rss` → `feed_url`
- `manual_url` → `base_url`
- `api` → `api_endpoint`
- Bilinmeyen → herhangi bir URL alanı

**Öncelik sırası:**
1. Gerekli config alanı yoksa → `Genel giriş`
2. Config var + name + language → `Belirgin giriş`
3. Config var ama name veya language eksik → `Kısmi özgüllük`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Genel giriş | ✅ |
| 2 | rss, feed_url yok → Genel giriş | ✅ |
| 3 | manual_url, base_url yok → Genel giriş | ✅ |
| 4 | api, api_endpoint yok → Genel giriş | ✅ |
| 5 | rss + feed_url, language yok → Kısmi özgüllük | ✅ |
| 6 | rss + feed_url, name yok → Kısmi özgüllük | ✅ |
| 7 | manual_url + base_url, language yok → Kısmi özgüllük | ✅ |
| 8 | rss + feed_url + name + language → Belirgin giriş | ✅ |
| 9 | api + api_endpoint + name + language → Belirgin giriş | ✅ |
| 10 | unknown type + URL + name, no language → Kısmi özgüllük | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 963/963 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Validation / live ping
- Filter/search entegrasyonu
- Bulk actions

---

## Riskler

- `status` alanı specificity'yi etkilemiyor — yalnızca readiness için anlamlı, intent korundu.
- Bilinmeyen source_type için herhangi bir URL alanı yeterli kabul edildi.
