# Test Report: Phase 117 — News Bulletin Input Specificity Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 117
**Scope:** News Bulletin registry module — input specificity özeti — pure frontend türetimi

---

## Amaç

Admin News Bulletin listesinde her bülten kaydının girişinin ne kadar özgü olduğunu (Genel giriş / Kısmi özgüllük / Belirgin giriş) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/news-bulletin-input-specificity-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Specificity Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Öncelik sırası:**
1. title/topic yok → `Genel giriş`
2. title/topic var ama selected news yoksa → `Kısmi özgüllük`
3. title/topic + selected news + (source coverage veya language veya bulletin_style) → `Belirgin giriş`
4. title/topic + selected news ama hiçbir yardımcı sinyal yok → `Kısmi özgüllük`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Genel giriş | ✅ |
| 2 | title ve topic boş string → Genel giriş | ✅ |
| 3 | yalnızca title, selected news yok → Kısmi özgüllük | ✅ |
| 4 | yalnızca topic, selected news yok → Kısmi özgüllük | ✅ |
| 5 | title+topic ama selected news sıfır → Kısmi özgüllük | ✅ |
| 6 | title+selected news ama coverage/helper yok → Kısmi özgüllük | ✅ |
| 7 | title+selected news+source coverage → Belirgin giriş | ✅ |
| 8 | topic+selected news+language → Belirgin giriş | ✅ |
| 9 | title+selected news+bulletin_style → Belirgin giriş | ✅ |
| 10 | tüm alanlar dolu → Belirgin giriş | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 933/933 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Scoring motoru / recommendation
- Filter/search entegrasyonu
- Bulk actions

---

## Riskler

- selected_news_source_count backend'den 0 geliyorsa (count sorgusu dönmemişse) yanlış Kısmi özgüllük üretebilir — mevcut tasarımda kabul edilebilir.
