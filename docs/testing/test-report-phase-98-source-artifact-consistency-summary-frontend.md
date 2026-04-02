# Test Report: Phase 98 — Source Artifact Consistency Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 98
**Scope:** Sources registry artifact tutarlılık özeti — pure frontend türetimi

---

## Amaç

Admin Sources listesinde her source'un yapılandırma tarafı ile üretim tarafının tutarlılığını (`Dengeli` / `Tek taraflı` / `Tutarsız` / `Artifacts yok`) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-artifact-consistency-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Veri Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.
`source_type`, `base_url`, `feed_url`, `api_endpoint`, `linked_news_count` kullanıldı.

Config tespiti (source_type'a göre):
- `rss` → `feed_url` dolu olmalı
- `manual_url` → `base_url` dolu olmalı
- `api` → `api_endpoint` dolu olmalı
- bilinmeyen / null → herhangi bir URL alanı

Üretim tespiti: `linked_news_count > 0`

Logic (deterministik):
- config yok + üretim yok → `Artifacts yok`
- config var + üretim yok → `Tek taraflı`
- config yok + üretim var → `Tutarsız`
- config var + üretim var → `Dengeli`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | all null → Artifacts yok | ✅ |
| 2 | rss + no feed + 0 news → Artifacts yok | ✅ |
| 3 | rss + feed_url + 0 news → Tek taraflı | ✅ |
| 4 | manual_url + base_url + 0 news → Tek taraflı | ✅ |
| 5 | api + endpoint + 0 news → Tek taraflı | ✅ |
| 6 | no config + 5 news → Tutarsız | ✅ |
| 7 | rss + feed_url + 3 news → Dengeli | ✅ |
| 8 | manual_url + base_url + 10 news → Dengeli | ✅ |
| 9 | whitespace feed + 0 news → Artifacts yok | ✅ |
| 10 | null type + base_url + 2 news → Dengeli | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 743/743 pass. **Build:** temiz.

---

## Bileşenler

- `SourceArtifactConsistencyBadge.tsx` (yeni)
- `SourceArtifactConsistencySummary.tsx` + `computeSourceArtifactConsistency` (yeni)
- `SourcesTable.tsx`: "Artifact Tutarlılığı" kolonu eklendi

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Diagnostics / live validation
- Scheduler intelligence
- Filter/search entegrasyonu
- Bulk actions
