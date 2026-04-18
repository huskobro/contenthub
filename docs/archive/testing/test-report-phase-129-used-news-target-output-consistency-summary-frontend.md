# Test Report: Phase 129 — Used News Target-Output Consistency Summary Frontend Foundation

**Date:** 2026-04-03
**Phase:** 129
**Scope:** Used News registry module — target-output consistency özeti — pure frontend türetimi

---

## Amaç

Admin Used News listesinde her kullanım kaydının girdi tarafı ile hedef/çıktı tarafının tutarlılığını (Artifacts yok / Tek taraflı / Tutarsız / Dengeli) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/used-news-target-output-consistency-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Consistency Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Girdi tarafı:** aşağıdakilerden herhangi biri yeterli:
- `news_item_id` dolu
- `usage_type` dolu
- `usage_context` dolu
- `notes` dolu

**Hedef/çıktı tarafı:** aşağıdakilerden biri yeterli:
- `has_target_resolved === true`
- `target_module` VE `target_entity_id` ikisi de dolu

**Öncelik sırası:**
1. Girdi yok + hedef yok → `Artifacts yok`
2. Girdi var + hedef yok → `Tek taraflı`
3. Girdi yok + hedef var → `Tutarsız`
4. Girdi var + hedef var → `Dengeli`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Artifacts yok | ✅ |
| 2 | tüm boş + target resolved false → Artifacts yok | ✅ |
| 3 | news_item_id var, hedef yok → Tek taraflı | ✅ |
| 4 | usage_type var, hedef yok → Tek taraflı | ✅ |
| 5 | usage_context var, hedef yok → Tek taraflı | ✅ |
| 6 | notes var, hedef yok → Tek taraflı | ✅ |
| 7 | girdi yok, has_target_resolved true → Tutarsız | ✅ |
| 8 | girdi yok, target_module + target_entity_id dolu → Tutarsız | ✅ |
| 9 | news_item_id var + has_target_resolved true → Dengeli | ✅ |
| 10 | tüm girdi + target_module + target_entity_id → Dengeli | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 1053/1053 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Hedef çözüm detay/tooltip gösterimi
- Filter/search entegrasyonu
