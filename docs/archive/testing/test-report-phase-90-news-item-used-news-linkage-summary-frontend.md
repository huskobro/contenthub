# Test Report: Phase 90 — News Item Used News Linkage Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 90
**Scope:** News Items registry used-news bağı görünürlüğü — küçük backend genişletme + frontend türetimi

---

## Amaç

Admin News Items listesinde her haberin Used News katmanına bağlanıp bağlanmadığını tek bakışta göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/news-item-used-news-linkage-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Yaklaşım

- Backend: `NewsItemResponse`'a `has_published_used_news_link` eklendi. `list_news_items_with_usage_summary`'de batch DISTINCT sorgusu ile "published" veya "scheduled" içeren usage_type'a sahip UsedNewsRegistry kayıtları bulundu.
- Frontend: `computeNewsItemUsedNewsLinkage` pure function olarak türetildi.

Linkage logic (deterministik):
- `usageCount == null` → `Bilinmiyor`
- `usageCount <= 0` → `Bağ yok`
- `hasPublishedUsedNewsLink == true` → `Yayın bağı var`
- `usageCount > 0` → `Bağlı`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | usageCount null → Bilinmiyor | ✅ |
| 2 | usageCount undefined → Bilinmiyor | ✅ |
| 3 | usageCount 0 → Bağ yok | ✅ |
| 4 | usageCount 0 + hasPublished true → Bağ yok | ✅ |
| 5 | usageCount 1 + hasPublished true → Yayın bağı var | ✅ |
| 6 | usageCount 3 + hasPublished true → Yayın bağı var | ✅ |
| 7 | usageCount 1 + hasPublished false → Bağlı | ✅ |
| 8 | usageCount 2 + hasPublished null → Bağlı | ✅ |
| 9 | usageCount 1 + hasPublished undefined → Bağlı | ✅ |
| 10 | usageCount null + hasPublished true → Bilinmiyor | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 663/663 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Used-news detail drawer
- Active link preview
- Cleanup action
- Filter/search entegrasyonu
- Bulk actions
