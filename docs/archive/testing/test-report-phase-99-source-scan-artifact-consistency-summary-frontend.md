# Test Report: Phase 99 — Source Scan Artifact Consistency Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 99
**Scope:** Source Scans registry artifact tutarlılık özeti — pure frontend türetimi

---

## Amaç

Admin Source Scans listesinde her scan'in source tarafı ile sonuç üretim tarafının tutarlılığını (`Dengeli` / `Tek taraflı` / `Tutarsız` / `Artifacts yok`) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-scan-artifact-consistency-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Veri Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.
`source_id` dolu mu → "source var"
`linked_news_count_from_scan > 0` → "çıktı var"

Logic (deterministik):
- source yok + çıktı yok → `Artifacts yok`
- source var + çıktı yok → `Tek taraflı`
- source yok + çıktı var → `Tutarsız`
- source var + çıktı var → `Dengeli`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | null sourceId + 0 news → Artifacts yok | ✅ |
| 2 | undefined sourceId + null news → Artifacts yok | ✅ |
| 3 | empty string sourceId + 0 news → Artifacts yok | ✅ |
| 4 | sourceId + 0 news → Tek taraflı | ✅ |
| 5 | sourceId + null news → Tek taraflı | ✅ |
| 6 | null sourceId + 3 news → Tutarsız | ✅ |
| 7 | empty sourceId + 5 news → Tutarsız | ✅ |
| 8 | sourceId + 1 news → Dengeli | ✅ |
| 9 | sourceId + 42 news → Dengeli | ✅ |
| 10 | whitespace sourceId + 0 news → Artifacts yok | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 753/753 pass. **Build:** temiz.

---

## Bileşenler

- `SourceScanArtifactConsistencyBadge.tsx` (yeni)
- `SourceScanArtifactConsistencySummary.tsx` + `computeSourceScanArtifactConsistency` (yeni)
- `SourceScansTable.tsx`: "Artifact Tutarlılığı" kolonu eklendi

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Diagnostics drawer
- Rescan action
- Preview inspector
- Filter/search entegrasyonu
- Bulk actions
