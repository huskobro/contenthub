# Test Report: Phase 86 — Used News Publication Linkage Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 86
**Scope:** Used News registry yayın bağı görünürlüğü — saf frontend türetimi, backend değişikliği yok

---

## Amaç

Admin Used News listesinde her kaydın yayın akışına nasıl bağlandığını tek bakışta göstermek. usage_type + target_entity_id üzerinden deterministik türetim.

---

## Çalıştırılan Komutlar

```
npx vitest run src/tests/used-news-publication-linkage-summary.smoke.test.tsx
npx vitest run
npx vite build
```

---

## Seçilen Yaklaşım

Saf frontend türetimi — backend değişikliği yapılmadı. Mevcut `usage_type` ve `target_entity_id` alanları kullanıldı.

Linkage logic (deterministik):
- `target_entity_id` boş → `Bağ eksik`
- `usage_type` boş + target var → `Belirsiz`
- `usage_type` "published" içeriyorsa → `Yayınlandı`
- `usage_type` "scheduled" içeriyorsa → `Planlandı`
- `usage_type` "draft" içeriyorsa → `Taslağa bağlı`
- diğer → `Belirsiz`

---

## Test Sonuçları

| # | Test | Sonuç |
|---|------|-------|
| 1 | target_entity_id null → Bağ eksik | ✅ |
| 2 | target_entity_id empty → Bağ eksik | ✅ |
| 3 | usage_type null + no target → Bağ eksik | ✅ |
| 4 | usage_type null + target var → Belirsiz | ✅ |
| 5 | draft + target → Taslağa bağlı | ✅ |
| 6 | draft_use + target → Taslağa bağlı | ✅ |
| 7 | scheduled + target → Planlandı | ✅ |
| 8 | published + target → Yayınlandı | ✅ |
| 9 | published_video + target → Yayınlandı | ✅ |
| 10 | bilinmeyen usage_type + target → Belirsiz | ✅ |

**Smoke:** 10/10 pass. **Full suite:** 623/623 pass. **Build:** temiz.

---

## Bilerek Yapılmayanlar

- Relation drawer
- Publish inspector
- Target entity preview
- Filter/search entegrasyonu
- Bulk actions
