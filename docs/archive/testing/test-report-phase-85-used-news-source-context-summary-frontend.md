# Test Report: Phase 85 — Used News Source Context Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 85
**Scope:** Used News registry kaynak bağlamı görünürlüğü — küçük backend genişletme + frontend türetimi

---

## Amaç

Admin Used News listesinde her kaydın hangi tür içerik kaynağından türediğini tek bakışta göstermek. Scan kökenli mi, kaynaklı mı, kaynak yok mu, news item çözümlenemediyse dürüst fallback göstermek.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/used-news-source-context-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Yaklaşım

- Backend: `UsedNewsResponse`'a `has_news_item_source` ve `has_news_item_scan_reference` eklendi. Service katmanında batch NewsItem JOIN yapıldı (N+1 yok).
- Frontend: `computeUsedNewsSourceContext` pure function olarak türetildi.

Richness logic (deterministik):
- `newsItemId` boş → `News item bulunamadı`
- `hasNewsItemScanReference` → `Scan kökenli` (scan, source'dan öncelikli)
- `hasNewsItemSource` → `Kaynaklı`
- her ikisi de `false` → `Kaynak yok`
- null/undefined → `Belirsiz`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | newsItemId null → News item bulunamadı | ✅ |
| 2 | newsItemId undefined → News item bulunamadı | ✅ |
| 3 | newsItemId boş string → News item bulunamadı | ✅ |
| 4 | scan referansı var → Scan kökenli | ✅ |
| 5 | source + scan ikisi de true → Scan kökenli (scan öncelikli) | ✅ |
| 6 | source var, scan yok → Kaynaklı | ✅ |
| 7 | source false, scan false → Kaynak yok | ✅ |
| 8 | source null, scan null → Belirsiz | ✅ |
| 9 | source undefined, scan undefined → Belirsiz | ✅ |
| 10 | source true, scan null → Kaynaklı | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 613/613 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Relation drawer
- Lineage graph
- Source picker/autocomplete
- Filter/search entegrasyonu
- Bulk cleanup
- User panel used news
- Analytics/reporting

---

## Riskler

- Batch JOIN eklendiği için service artık `UsedNewsResponse` Pydantic nesnesi döndürüyor (ORM değil). FastAPI bu durumu sorunsuz handle ediyor.
