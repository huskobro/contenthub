# Test Report: Phase 111 — Source Scan Target-Output Consistency Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 111
**Scope:** Source Scans registry target-output consistency özeti — pure frontend türetimi

---

## Amaç

Admin Source Scans listesinde her scan kaydının hedef (source/scan mode) ile çıktı (result_count, linked_news, used_news) arasındaki tutarlılığı tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-scan-target-output-consistency-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Consistency Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Hedef tarafı var sayılması için:** `source_id` dolu olması yeterli.

**Çıktı tarafı var sayılması için** aşağıdakilerden biri yeterli:
- `result_count > 0`
- `linked_news_count_from_scan > 0`
- `used_news_count_from_scan > 0`

**4 seviye:**
- hedef yok + çıktı yok → `Artifacts yok`
- hedef var + çıktı yok → `Tek taraflı`
- hedef yok + çıktı var → `Tutarsız`
- hedef var + çıktı var → `Dengeli`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | source_id null, çıktı yok → Artifacts yok | ✅ |
| 2 | source_id whitespace, çıktı yok → Artifacts yok | ✅ |
| 3 | source_id var, count 0 → Tek taraflı | ✅ |
| 4 | source_id var, count null → Tek taraflı | ✅ |
| 5 | source_id null, result_count > 0 → Tutarsız | ✅ |
| 6 | source_id null, linked_news > 0 → Tutarsız | ✅ |
| 7 | source_id var, result_count > 0 → Dengeli | ✅ |
| 8 | source_id var, linked_news > 0 → Dengeli | ✅ |
| 9 | source_id var, used_news > 0 → Dengeli | ✅ |
| 10 | tüm alanlar dolu → Dengeli | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 873/873 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Diagnostics drawer
- Rescan action
- Filter/search entegrasyonu
- Bulk actions
- Trend/funnel analizi

---

## Riskler

- `status = failed` durumu ana seviyeyi etkilemez — sadece yardımcı metin için kullanılabilir, korundu.
- `used_news_count_from_scan` API'de optional — null/undefined guard eklendi.
