# Test Report: Phase 102 — Used News Artifact Consistency Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 102
**Scope:** Used News registry artifact tutarlılık özeti — pure frontend türetimi

---

## Amaç

Admin Used News listesinde her kaydın kaynak tarafı ile hedef/yayın tarafının tutarlılığını (`Dengeli` / `Tek taraflı` / `Tutarsız` / `Artifacts yok`) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/used-news-artifact-consistency-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Consistency Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**"Kaynak tarafı var"** = `has_news_item_source === true` VEYA `has_news_item_scan_reference === true`

**"Hedef/yayın tarafı var"** = `has_target_resolved === true` VEYA (`target_module` + `target_entity_id` ikisi de dolu)

Logic (deterministik):
- kaynak yok + hedef yok → `Artifacts yok`
- kaynak var + hedef yok → `Tek taraflı`
- kaynak yok + hedef var → `Tutarsız`
- kaynak var + hedef var → `Dengeli`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | all false/null → Artifacts yok | ✅ |
| 2 | all undefined → Artifacts yok | ✅ |
| 3 | source false + whitespace target → Artifacts yok | ✅ |
| 4 | hasNewsItemSource true + no target → Tek taraflı | ✅ |
| 5 | hasNewsItemScanReference true + no target → Tek taraflı | ✅ |
| 6 | no source + hasTargetResolved true → Tutarsız | ✅ |
| 7 | no source + targetModule+entityId present → Tutarsız | ✅ |
| 8 | source + hasTargetResolved true → Dengeli | ✅ |
| 9 | source + target module+entity present → Dengeli | ✅ |
| 10 | all source+target fields present → Dengeli | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 783/783 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Relation drawer
- Repair action
- Filter/search entegrasyonu
- Bulk actions
- Target preview

---

## Riskler

- `usage_type` yalnızca yardımcı context için kullanılabilir, ana consistency state'ini belirlemiyor.
- `target_module` non-null zorunlu alan, ancak whitespace guard eklendi.
