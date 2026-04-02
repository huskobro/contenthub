# Test Report: Phase 118 — Used News Input Specificity Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 118
**Scope:** Used News registry module — input specificity özeti — pure frontend türetimi

---

## Amaç

Admin Used News listesinde her kaydın girişinin ne kadar özgü olduğunu (Genel giriş / Kısmi özgüllük / Belirgin giriş) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/used-news-input-specificity-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Specificity Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Öncelik sırası:**
1. `news_item_id` veya `usage_type` yoksa → `Genel giriş`
2. İkisi de var ama `target_module` veya `target_entity_id` eksikse → `Kısmi özgüllük`
3. Dört alan tam ama `usage_context` ve `notes` yoksa → `Kısmi özgüllük`
4. Dört alan tam + (`usage_context` veya `notes`) → `Belirgin giriş`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Genel giriş | ✅ |
| 2 | news_item_id eksik → Genel giriş | ✅ |
| 3 | usage_type eksik → Genel giriş | ✅ |
| 4 | her ikisi boş string → Genel giriş | ✅ |
| 5 | temel alanlar var, target_module eksik → Kısmi özgüllük | ✅ |
| 6 | temel alanlar var, target_entity_id eksik → Kısmi özgüllük | ✅ |
| 7 | dört alan tam, helper yok → Kısmi özgüllük | ✅ |
| 8 | dört alan + usage_context → Belirgin giriş | ✅ |
| 9 | dört alan + notes → Belirgin giriş | ✅ |
| 10 | tüm alanlar dolu → Belirgin giriş | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 943/943 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Scoring motoru / repair action
- Filter/search entegrasyonu
- Bulk actions

---

## Riskler

- `usage_context` veya `notes` tek başına specificity'yi yükseltmiyor — temel bağlam olmadan etkisiz, intent korundu.
