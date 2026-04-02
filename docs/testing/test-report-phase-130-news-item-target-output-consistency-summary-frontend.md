# Test Report: Phase 130 — News Item Target-Output Consistency Summary Frontend Foundation

**Date:** 2026-04-03
**Phase:** 130
**Scope:** News Items registry module — target-output consistency özeti — pure frontend türetimi

---

## Amaç

Admin News Items listesinde her haber kaydının girdi tarafı ile output/yayın tarafının tutarlılığını (Artifacts yok / Tek taraflı / Tutarsız / Dengeli) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/news-item-target-output-consistency-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Consistency Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Girdi tarafı:** aşağıdakilerden herhangi biri yeterli:
- `title` dolu
- `url` dolu
- `summary` dolu

**Output/yayın tarafı:** aşağıdakilerden biri yeterli:
- `usage_count > 0` (used_news_link_count olarak kullanıldı)
- `has_published_used_news_link === true`
- `has_scheduled_used_news_link === true` (mevcut API'de yok, null olarak geçildi)

**Öncelik sırası:**
1. Girdi yok + output yok → `Artifacts yok`
2. Girdi var + output yok → `Tek taraflı`
3. Girdi yok + output var → `Tutarsız`
4. Girdi var + output var → `Dengeli`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Artifacts yok | ✅ |
| 2 | tüm boş + output yok → Artifacts yok | ✅ |
| 3 | title var, output yok → Tek taraflı | ✅ |
| 4 | url var, output yok → Tek taraflı | ✅ |
| 5 | summary var, output yok → Tek taraflı | ✅ |
| 6 | title + url var, output yok → Tek taraflı | ✅ |
| 7 | girdi yok, usage_count > 0 → Tutarsız | ✅ |
| 8 | girdi boş, has_published true → Tutarsız | ✅ |
| 9 | title var + usage_count > 0 → Dengeli | ✅ |
| 10 | tüm girdi + has_published true → Dengeli | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 1063/1063 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- has_scheduled_used_news_link alanı mevcut API'de yok, null geçildi
- Output sayıları detay/tooltip gösterimi
- Filter/search entegrasyonu
