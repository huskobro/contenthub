# Test Report: Phase 113 — Source Scan Publication Outcome Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 113
**Scope:** Source Scans registry publication outcome özeti — pure frontend türetimi

---

## Amaç

Admin Source Scans listesinde her scan kaydının yayın zincirine katkısını (Sorunlu/Hazırlanıyor/Ham çıktı/Aday çıktı/Yayına yakın çıktı/Belirsiz) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-scan-publication-outcome-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Publication Outcome Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Öncelik sırası:**
1. `status = failed` veya `error_summary` dolu → `Sorunlu`
2. `used_news_count_from_scan > 0` → `Yayına yakın çıktı`
3. `reviewed_news_count_from_scan > 0` (used=0) → `Aday çıktı`
4. `linked_news_count_from_scan > 0` veya `result_count > 0` (reviewed/used=0) → `Ham çıktı`
5. status ∈ {queued, running, processing, in_progress} ve çıktı yok → `Hazırlanıyor`
6. Diğer → `Belirsiz`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | status failed → Sorunlu | ✅ |
| 2 | error_summary dolu → Sorunlu | ✅ |
| 3 | used > 0 → Yayına yakın çıktı | ✅ |
| 4 | reviewed > 0, used = 0 → Aday çıktı | ✅ |
| 5 | linked > 0, reviewed/used = 0 → Ham çıktı | ✅ |
| 6 | result_count > 0, linked/reviewed/used = 0 → Ham çıktı | ✅ |
| 7 | status queued, çıktı yok → Hazırlanıyor | ✅ |
| 8 | status running, null → Hazırlanıyor | ✅ |
| 9 | status completed, tüm sayılar 0 → Belirsiz | ✅ |
| 10 | tüm null → Belirsiz | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 893/893 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Analytics/reporting
- Trend/funnel analizi
- Rescan action
- Filter/search entegrasyonu
- Bulk actions

---

## Riskler

- `reviewed_news_count_from_scan` API'de optional → null guard eklendi.
- `status = completed` ama çıktı yok → `Belirsiz` — bu beklenen davranış, korundu.
