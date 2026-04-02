# Test Report: Phase 91 — News Item Publication Lineage Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 91
**Scope:** News Items registry yayın zinciri görünürlüğü — pure frontend türetimi

---

## Amaç

Admin News Items listesinde her haberin yayın zincirine dahil olup olmadığını tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/news-item-publication-lineage-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Yaklaşım

Pure frontend türetimi. Backend değişikliği yapılmadı.
Mevcut `usage_count` ve `has_published_used_news_link` alanları kullanıldı.

Linkage logic (deterministik):
- `usageCount == null` → `Belirsiz`
- `usageCount <= 0` → `Zincir yok`
- `hasPublishedUsedNewsLink == true` → `Yayın zincirinde`
- `hasPublishedUsedNewsLink == false` → `İçerik zincirinde`
- `usageCount > 0` + `hasPublishedUsedNewsLink == null/undefined` → `Kısmi zincir`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | usageCount null → Belirsiz | ✅ |
| 2 | usageCount undefined → Belirsiz | ✅ |
| 3 | usageCount 0 → Zincir yok | ✅ |
| 4 | usageCount 0 + hasPublished true → Zincir yok | ✅ |
| 5 | usageCount 1 + hasPublished true → Yayın zincirinde | ✅ |
| 6 | usageCount 3 + hasPublished true → Yayın zincirinde | ✅ |
| 7 | usageCount 1 + hasPublished false → İçerik zincirinde | ✅ |
| 8 | usageCount 4 + hasPublished false → İçerik zincirinde | ✅ |
| 9 | usageCount 2 + hasPublished null → Kısmi zincir | ✅ |
| 10 | usageCount 1 + hasPublished undefined → Kısmi zincir | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 673/673 pass. **Build:** temiz.

---

## Bileşenler

- `NewsItemPublicationLineageBadge.tsx` (yeni)
- `NewsItemPublicationLineageSummary.tsx` + `computeNewsItemPublicationLineage` (yeni)
- `NewsItemsTable.tsx`: "Yayın Zinciri" kolonu eklendi

---

## Bilerek Yapılmayanlar

- Backend değişikliği (mevcut alanlar yeterli)
- Lineage drill-down drawer
- Zincir filtresi
- Bulk zincir görünümü
