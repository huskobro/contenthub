# Test Report: Phase 101 — News Item Artifact Consistency Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 101
**Scope:** News Items registry artifact tutarlılık özeti — pure frontend türetimi

---

## Amaç

Admin News Items listesinde her haber kaydının kaynak/ingest tarafı ile yayın/used-news tarafının tutarlılığını (`Dengeli` / `Tek taraflı` / `Tutarsız` / `Artifacts yok`) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/news-item-artifact-consistency-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Consistency Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**"Kaynak/ingest tarafı var"** = `source_id` dolu VEYA `source_scan_id` dolu

**"Yayın tarafı var"** = `usage_count > 0` VEYA `has_published_used_news_link === true`

Logic (deterministik):
- kaynak yok + yayın yok → `Artifacts yok`
- kaynak var + yayın yok → `Tek taraflı`
- kaynak yok + yayın var → `Tutarsız`
- kaynak var + yayın var → `Dengeli`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | sourceId null + usage 0 + published false → Artifacts yok | ✅ |
| 2 | all undefined/null → Artifacts yok | ✅ |
| 3 | whitespace sourceId + usage 0 → Artifacts yok | ✅ |
| 4 | sourceId var + no publication → Tek taraflı | ✅ |
| 5 | sourceScanId var + no publication → Tek taraflı | ✅ |
| 6 | no source + usageCount 3 → Tutarsız | ✅ |
| 7 | no source + hasPublishedUsedNewsLink true → Tutarsız | ✅ |
| 8 | sourceId + usageCount 2 → Dengeli | ✅ |
| 9 | sourceId + hasPublishedUsedNewsLink true → Dengeli | ✅ |
| 10 | sourceScanId + usageCount + published all → Dengeli | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 773/773 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Relation drawer
- Publish graph
- Repair action
- Filter/search entegrasyonu
- Bulk actions
- User panel news items

---

## Riskler

- `usage_count` mevcut API response'da `optional` (`usage_count?: number`) — null case handle edildi.
- `has_published_used_news_link` da optional — null/undefined false olarak işleniyor.
- Whitespace source_id/source_scan_id `isNonEmpty` guard ile yakalanıyor.
