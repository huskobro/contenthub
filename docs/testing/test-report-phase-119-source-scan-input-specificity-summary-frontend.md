# Test Report: Phase 119 — Source Scan Input Specificity Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 119
**Scope:** Source Scans registry module — input specificity özeti — pure frontend türetimi

---

## Amaç

Admin Source Scans listesinde her scan kaydının girişinin ne kadar özgü olduğunu (Genel giriş / Kısmi özgüllük / Belirgin giriş) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-scan-input-specificity-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Specificity Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Öncelik sırası:**
1. `source_id` yoksa → `Genel giriş`
2. `source_id` var ama `scan_mode` veya `requested_by` eksikse → `Kısmi özgüllük`
3. Üç alan tam + `notes` dolu → `Belirgin giriş`
4. Üç alan tam ama `notes` yoksa → `Kısmi özgüllük`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Genel giriş | ✅ |
| 2 | source_id boş string → Genel giriş | ✅ |
| 3 | source_id whitespace → Genel giriş | ✅ |
| 4 | source_id var, scan_mode eksik → Kısmi özgüllük | ✅ |
| 5 | source_id var, requested_by eksik → Kısmi özgüllük | ✅ |
| 6 | üç alan tam, notes null → Kısmi özgüllük | ✅ |
| 7 | üç alan tam, notes boş → Kısmi özgüllük | ✅ |
| 8 | tüm alanlar dolu (manual) → Belirgin giriş | ✅ |
| 9 | tüm alanlar dolu (auto) → Belirgin giriş | ✅ |
| 10 | source + scan_mode, requested_by yok → Kısmi özgüllük | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 953/953 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Diagnostics / rescan intelligence
- Filter/search entegrasyonu
- Bulk actions

---

## Riskler

- `status` alanı specificity'yi etkilemiyor — yalnızca yardımcı metinde kullanılabilir, intent korundu.
- `source_name` yalnızca yardımcı sinyal, ana state'i belirlemiyor.
