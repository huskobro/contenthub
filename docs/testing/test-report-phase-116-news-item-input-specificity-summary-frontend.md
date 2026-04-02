# Test Report: Phase 116 — News Item Input Specificity Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 116
**Scope:** News Items registry module — input specificity özeti — pure frontend türetimi

---

## Amaç

Admin News Items listesinde her haber kaydının girişinin ne kadar özgü ve somut olduğunu (Genel giriş / Kısmi özgüllük / Belirgin giriş) tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/news-item-input-specificity-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Specificity Yaklaşımı

Pure frontend türetimi. Backend değişikliği yapılmadı.

**Öncelik sırası:**
1. title/url yok → `Genel giriş`
2. title/url + summary + (sourceId veya sourceScanId) → `Belirgin giriş`
3. Diğer tüm durumlar → `Kısmi özgüllük`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | tüm null → Genel giriş | ✅ |
| 2 | title ve url boş string → Genel giriş | ✅ |
| 3 | title ve url whitespace, diğerleri dolu → Genel giriş | ✅ |
| 4 | yalnızca title → Kısmi özgüllük | ✅ |
| 5 | yalnızca url → Kısmi özgüllük | ✅ |
| 6 | title+url ama summary yok → Kısmi özgüllük | ✅ |
| 7 | title+url+summary ama source refs yok → Kısmi özgüllük | ✅ |
| 8 | title+url+summary+sourceId → Belirgin giriş | ✅ |
| 9 | title+url+summary+sourceScanId → Belirgin giriş | ✅ |
| 10 | tüm alanlar dolu → Belirgin giriş | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 923/923 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Backend değişikliği
- Semantic similarity / NLP tabanlı summary kalitesi değerlendirmesi
- Filter/search entegrasyonu
- language/category/publishedAt specificity skorunu etkilemiyor (yalnızca yardımcı alanlar)

---

## Riskler

- language, category, publishedAt alanları specificity hesabına dahil edilmedi — bunlar içerik kalitesini değil giriş özgüllüğünü etkiliyor ancak mevcut tasarımda kapsam dışı bırakıldı.
- summary alanı dolu ama anlamsız string içeriyorsa (ör. "n/a") Belirgin giriş olarak değerlendirilebilir — şimdilik kabul edilebilir risk.
