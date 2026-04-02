# Test Report: Phase 92 — News Bulletin Selected-News Quality Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 92
**Scope:** News Bulletin registry seçilmiş haber seti kalite özeti — küçük backend genişletme + frontend türetimi

---

## Amaç

Admin News Bulletins listesinde her bültenin seçilmiş haber setinin içerik kalitesini (`Güçlü set` / `Kısmi set` / `Zayıf set` / `İçerik yok`) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/news-bulletin-selected-news-quality-summary.smoke.test.tsx
npx vitest run
npx vite build
.venv/bin/pytest tests/test_news_bulletin_api.py -q
```

---

## Seçilen Veri Yaklaşımı

Backend genişletme yapıldı. Mevcut `list_news_bulletins_with_artifacts`'daki news_item_ids batch fetch'i genişletildi:
- `title + url + summary` → `complete` (güçlü)
- `title + url` ama summary yok → `partial` (kısmi)
- `title` veya `url` yok → `weak` (zayıf)

3 yeni alan `NewsBulletinResponse`'a eklendi:
- `selected_news_quality_complete_count`
- `selected_news_quality_partial_count`
- `selected_news_quality_weak_count`

Frontend pure derivation: `computeNewsBulletinSelectedNewsQuality` dominant count bazlı sınıflama yapar.

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | selectedNewsCount null → Bilinmiyor | ✅ |
| 2 | selectedNewsCount undefined → Bilinmiyor | ✅ |
| 3 | selectedNewsCount 0 → İçerik yok | ✅ |
| 4 | complete dominant (3/1/0) → Güçlü set | ✅ |
| 5 | all complete (3/0/0) → Güçlü set | ✅ |
| 6 | weak dominant (0/1/3) → Zayıf set | ✅ |
| 7 | all weak (0/0/2) → Zayıf set | ✅ |
| 8 | partial dominant (1/3/1) → Kısmi set | ✅ |
| 9 | counts all null, count > 0 → Bilinmiyor | ✅ |
| 10 | selectedNewsCount 0, counts > 0 → İçerik yok | ✅ |

**Smoke:** 10/10 pass. **Frontend full suite:** 683/683 pass. **Backend:** 11/11 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Gerçek quality score motoru
- Recommendation UI
- Dedupe quality motoru
- Filter/search entegrasyonu
- Bulk actions
- Wizard entegrasyonu
- Publish blocking policy

---

## Riskler / Ertelenenler

- Mevcut `list_news_bulletins_with_artifacts` hâlâ per-bulletin döngü içinde sorgu yapıyor (script/metadata). Batch hale getirme ertelendi.
