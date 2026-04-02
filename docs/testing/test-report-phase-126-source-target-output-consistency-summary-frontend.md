# Test Report: Phase 126 — Source Target-Output Consistency Summary Frontend Foundation

**Date:** 2026-04-03
**Phase:** 126
**Scope:** Sources registry module — target-output consistency özeti — pure frontend türetimi

---

## Amaç

Admin Sources listesinde her kaynak kaydının konfigürasyon/girdi tarafı ile üretim/çıktı tarafının tutarlılığını (Artifacts yok / Tek taraflı / Tutarsız / Dengeli) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/source-target-output-consistency-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Consistency Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Konfigürasyon/girdi tarafı (source_type'a göre):**
- `rss` → `feed_url` dolu
- `manual_url` → `base_url` dolu
- `api` → `api_endpoint` dolu
- Bilinmeyen tür → config yok kabul edilir

**Üretim/çıktı tarafı:** aşağıdakilerden herhangi biri:
- `linked_news_count > 0`
- `reviewed_news_count > 0`
- `used_news_count_from_source > 0`

**Öncelik sırası:**
1. Config yok + üretim yok → `Artifacts yok`
2. Config var + üretim yok → `Tek taraflı`
3. Config yok + üretim var → `Tutarsız`
4. Config var + üretim var → `Dengeli`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Artifacts yok | ✅ |
| 2 | rss, feed_url yok, output yok → Artifacts yok | ✅ |
| 3 | rss, feed_url var, output yok → Tek taraflı | ✅ |
| 4 | manual_url, base_url var, output yok → Tek taraflı | ✅ |
| 5 | api, api_endpoint var, output yok → Tek taraflı | ✅ |
| 6 | unknown type, linked_news > 0 → Tutarsız | ✅ |
| 7 | rss, boş feed_url, reviewed_news > 0 → Tutarsız | ✅ |
| 8 | rss, feed_url var + linked_news > 0 → Dengeli | ✅ |
| 9 | manual_url, base_url var + used_news > 0 → Dengeli | ✅ |
| 10 | api, endpoint var + tüm output > 0 → Dengeli | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 1023/1023 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Output sayıları için detay/tooltip gösterimi
- Filter/search entegrasyonu
