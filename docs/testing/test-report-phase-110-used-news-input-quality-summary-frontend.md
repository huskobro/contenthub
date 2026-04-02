# Test Report: Phase 110 — Used News Input Quality Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 110
**Scope:** Used News registry source-input quality özeti — pure frontend türetimi

---

## Amaç

Admin Used News listesinde her kaydın giriş içeriğinin kalitesini (`Güçlü giriş` / `Kısmi giriş` / `Zayıf giriş`) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/used-news-input-quality-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Consistency Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Kalite skorlama:**
- `news_item_id` boş/null veya `usage_type` boş/null → `Zayıf giriş`
- `news_item_id` + `usage_type` var ama `target_module` veya `target_entity_id` eksikse → `Kısmi giriş`
- `news_item_id` + `usage_type` + `target_module` + `target_entity_id` var ama yardımcı alan yok → `Kısmi giriş`
- Temel alanlar + target + `usage_context` veya `notes` → `Güçlü giriş`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | news_item_id null → Zayıf giriş | ✅ |
| 2 | usage_type null → Zayıf giriş | ✅ |
| 3 | news_item_id whitespace → Zayıf giriş | ✅ |
| 4 | usage_type whitespace → Zayıf giriş | ✅ |
| 5 | base var, target_module null → Kısmi giriş | ✅ |
| 6 | base var, target_entity_id null → Kısmi giriş | ✅ |
| 7 | base + target var, helper yok → Kısmi giriş | ✅ |
| 8 | base + target + usage_context → Güçlü giriş | ✅ |
| 9 | base + target + notes → Güçlü giriş | ✅ |
| 10 | tüm alanlar dolu → Güçlü giriş | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 863/863 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Scoring motoru
- Repair actions
- Filter/search entegrasyonu
- Bulk actions
- Otomatik öneriler

---

## Riskler

- `usage_context` ve `notes` nullable — null/undefined guard eklendi.
- `target_entity_id` optional alanda — null guard korundu.
