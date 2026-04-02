# Test Report: Phase 87 — Source Scan Publication Yield Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 87
**Scope:** Source Scans registry yayın verimi görünürlüğü — küçük backend genişletme + frontend türetimi

---

## Amaç

Admin Source Scans listesinde her scan kaydının yayın akışına ne kadar katkı sağladığını tek bakışta göstermek. Scan'den türeyen linked/reviewed/used news item sayıları üzerinden deterministik türetim.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-scan-publication-yield-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Yaklaşım

- Backend: `ScanResponse`'a `linked_news_count_from_scan`, `reviewed_news_count_from_scan`, `used_news_count_from_scan` eklendi. Batch GROUP BY COUNT sorguları kullanıldı (N+1 yok).
- Frontend: `computeSourceScanPublicationYield` pure function olarak türetildi.

Yield logic (deterministik):
- `linkedCount` null/undefined → `Bilinmiyor`
- `linkedCount <= 0` → `İçerik yok`
- `usedCount > 0` → `Kullanılmış çıktı`
- `reviewedCount > 0` → `Aday çıktı`
- `linkedCount > 0` ama reviewed/used yok → `Ham çıktı`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | linkedCount null → Bilinmiyor | ✅ |
| 2 | linkedCount undefined → Bilinmiyor | ✅ |
| 3 | linkedCount 0 → İçerik yok | ✅ |
| 4 | linkedCount negatif → İçerik yok | ✅ |
| 5 | linked > 0, reviewed 0, used 0 → Ham çıktı | ✅ |
| 6 | linked > 0, reviewed null, used null → Ham çıktı | ✅ |
| 7 | linked > 0, reviewed > 0, used 0 → Aday çıktı | ✅ |
| 8 | linked > 0, reviewed > 0, used null → Aday çıktı | ✅ |
| 9 | used > 0 → Kullanılmış çıktı | ✅ |
| 10 | used > 0, reviewed 0 → Kullanılmış çıktı | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 633/633 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Funnel raporu
- Trend analizi
- Rescan actions
- Import pipeline inspector
- Scheduler entegrasyonu
- User panel
