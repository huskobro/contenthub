# Test Report: Phase 73 — Source Scan Source Context Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 73
**Scope:** Source Scans source context visibility — minimal backend enrichment + frontend badge + summary + table column update

---

## Amaç

Admin Source Scans registry listesinde her scan kaydının hangi source'a bağlı olduğunu okunabilir bir özet ile göstermek. Source picker, bulk relink veya analytics yazmamak.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-scan-source-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Veri Yaklaşımı

Minimal backend genişletme: `source_name` ve `source_status` alanları `ScanResponse`'a eklendi. `list_scans_with_source_summary()` service fonksiyonu eklendi — her scan için `NewsSource` tablosuna bakıyor. Router list endpoint bu fonksiyonu kullanıyor. Per-row frontend fetch yapılmadı.

Status logic (frontend, deterministik):
- `sourceId` yok → `Kaynak yok`
- `sourceId` var + `sourceName` dolu → `Bağlı`
- `sourceId` var ama `sourceName` yok → `Kaynak bulunamadı`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | sourceId null → Kaynak yok | ✅ |
| 2 | sourceId undefined → Kaynak yok | ✅ |
| 3 | sourceId empty string → Kaynak yok | ✅ |
| 4 | sourceId + sourceName → Bağlı | ✅ |
| 5 | UUID + name → Bağlı | ✅ |
| 6 | sourceId + sourceName null → Kaynak bulunamadı | ✅ |
| 7 | sourceId + sourceName undefined → Kaynak bulunamadı | ✅ |
| 8 | sourceId + sourceName empty → Kaynak bulunamadı | ✅ |
| 9 | UUID + Al Jazeera → Bağlı | ✅ |
| 10 | all null → Kaynak yok | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 493/493 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Source picker / autocomplete
- Source edit inline flow
- Bulk source relink
- Filter/search entegrasyonu
- Advanced popover

---

## Riskler

- N+1 sorgu pattern: her scan için bir NewsSource sorgusu. MVP için kabul edilebilir.
- `"Bilinmiyor"` badge seviyesi tanımlı ama `computeSourceScanSourceStatus` tarafından üretilmiyor; yalnızca standalone kullanım için var.
