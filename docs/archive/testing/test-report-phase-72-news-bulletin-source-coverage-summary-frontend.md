# Test Report: Phase 72 — News Bulletin Source Coverage Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 72
**Scope:** News Bulletin source coverage visibility — minimal backend enrichment + frontend badge + summary + table column

---

## Amaç

Admin News Bulletin registry listesinde her bültenin seçilmiş haberlerinin kaynak çeşitliliğini tek bakışta göstermek. Source diversity score, recommendation veya bulk attach yazmamak.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/news-bulletin-source-coverage-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Veri Yaklaşımı

Minimal backend genişletme: `selected_news_source_count` ve `has_selected_news_missing_source` alanları `NewsBulletinResponse`'a eklendi. `list_news_bulletins_with_artifacts()` zaten `news_item_ids` listesini alıyordu; bu listeden `NewsItem.source_id` değerleri sorgulanarak distinct source count ve missing source flag hesaplandı. Per-row frontend fetch yapılmadı.

Coverage logic (frontend, deterministik):
- `selectedNewsCount <= 0` → `Kaynak yok`
- `selectedNewsSourceCount <= 0` ama news var → `Kaynak bilgisi eksik`
- `selectedNewsSourceCount === 1` → `Tek kaynak`
- `selectedNewsSourceCount >= 2` → `Çoklu kaynak`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | selectedNewsCount 0 → Kaynak yok | ✅ |
| 2 | selectedNewsCount undefined → Kaynak yok | ✅ |
| 3 | selectedNewsCount 0 bile sourceCount>0 → Kaynak yok | ✅ |
| 4 | news var ama sourceCount 0 → Kaynak bilgisi eksik | ✅ |
| 5 | news var ama sourceCount undefined → Kaynak bilgisi eksik | ✅ |
| 6 | sourceCount 1 → Tek kaynak | ✅ |
| 7 | sourceCount 1 + missing flag → Tek kaynak | ✅ |
| 8 | sourceCount 2 → Çoklu kaynak | ✅ |
| 9 | sourceCount 5 → Çoklu kaynak | ✅ |
| 10 | sourceCount 3 + missing flag → Çoklu kaynak | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 483/483 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Source diversity score / recommendation
- Source balancing logic
- Bulk attach / bulk relink
- Filter/search entegrasyonu
- Wizard entegrasyonu
- Publish readiness motoru

---

## Riskler

- N+1 sorgu pattern devam ediyor. MVP için kabul edilebilir.
- `has_selected_news_missing_source` flag şu an secondary text için kullanılıyor; badge logic'e dahil edilmedi (spec dışı).
