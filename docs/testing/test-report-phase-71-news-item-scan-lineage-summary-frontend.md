# Test Report: Phase 71 — News Item Scan Lineage Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 71
**Scope:** News Items scan lineage visibility — minimal backend enrichment + frontend badge + summary + table column

---

## Amaç

Admin News Items registry listesinde her haberin bir source scan'den gelip gelmediğini tek bakışta göstermek. Lineage graph, rescan action veya bulk relink yazmamak.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/news-item-scan-lineage-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Veri Yaklaşımı

Minimal backend genişletme: `source_scan_status` alanı `NewsItemResponse`'a eklendi. `list_news_items_with_usage_summary()` artık her item için `SourceScan` tablosuna bakıyor ve `status` ya da `"not_found"` sentinel değerini döndürüyor. Per-row frontend fetch yapılmadı.

Lineage logic (frontend, deterministik):
- `source_scan_id` yok → `Manuel`
- `source_scan_id` var + `source_scan_status === "not_found"` → `Scan bulunamadı`
- `source_scan_id` var + `source_scan_status` dolu → `Scan bağlı`
- `source_scan_id` var + `source_scan_status` null/undefined → `Scan referansı`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | sourceScanId null → Manuel | ✅ |
| 2 | sourceScanId undefined → Manuel | ✅ |
| 3 | sourceScanId empty string → Manuel | ✅ |
| 4 | sourceScanId + status "completed" → Scan bağlı | ✅ |
| 5 | sourceScanId + status "queued" → Scan bağlı | ✅ |
| 6 | sourceScanId + status "failed" → Scan bağlı | ✅ |
| 7 | sourceScanId + status "not_found" → Scan bulunamadı | ✅ |
| 8 | sourceScanId + status null → Scan referansı | ✅ |
| 9 | sourceScanId + status undefined → Scan referansı | ✅ |
| 10 | both null → Manuel | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 473/473 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Scan detail drawer / popover
- Lineage graph
- Rescan action
- Bulk relink
- Filter/search entegrasyonu
- User panel

---

## Riskler

- N+1 sorgu pattern devam ediyor (source, source_scan her item için ayrı query). MVP için kabul edilebilir; JOIN ile optimize edilebilir.
- `"not_found"` sentinel string — DB'de asla bir scan'in status'u bu değer olmayacağı varsayımına dayanıyor.
