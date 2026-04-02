# Test Report: Phase 70 — News Item Source Summary Frontend Foundation

**Date:** 2026-04-02
**Phase:** 70
**Scope:** News Items source connection visibility — backend enrichment + frontend badge + summary + table column

---

## What Was Built

### Backend
- `backend/app/news_items/schemas.py`: Added `source_name: Optional[str] = None` and `source_status: Optional[str] = None` to `NewsItemResponse`
- `backend/app/news_items/service.py`: `list_news_items_with_usage_summary()` now looks up `NewsSource` by `source_id` and populates `source_name` and `source_status` per item

### Frontend
- `frontend/src/api/newsItemsApi.ts`: Added `source_name?: string | null` and `source_status?: string | null` to `NewsItemResponse`
- `frontend/src/components/news-items/NewsItemSourceStatusBadge.tsx`: Badge with four levels — Bağlı / Kaynak yok / Bulunamadı / Bilinmiyor
- `frontend/src/components/news-items/NewsItemSourceSummary.tsx`: Summary component with `computeNewsItemSourceStatus(sourceId, sourceName)` helper
- `frontend/src/components/news-items/NewsItemsTable.tsx`: "Kaynak Özeti" column now renders `<NewsItemSourceSummary>` instead of raw source_id slice

---

## Smoke Tests

**File:** `frontend/src/tests/news-item-source-summary.smoke.test.tsx`

| # | Test | Result |
|---|------|--------|
| 1 | Returns 'Kaynak yok' when sourceId is null | ✅ Pass |
| 2 | Returns 'Kaynak yok' when sourceId is undefined | ✅ Pass |
| 3 | Returns 'Kaynak yok' when sourceId is empty string | ✅ Pass |
| 4 | Returns 'Bağlı' when sourceId and sourceName present | ✅ Pass |
| 5 | Returns 'Bağlı' for non-empty sourceName | ✅ Pass |
| 6 | Returns 'Bulunamadı' when sourceId exists but sourceName null | ✅ Pass |
| 7 | Returns 'Bulunamadı' when sourceId exists but sourceName undefined | ✅ Pass |
| 8 | Returns 'Bulunamadı' when sourceId exists but sourceName empty string | ✅ Pass |
| 9 | Returns 'Bağlı' for UUID source with name | ✅ Pass |
| 10 | Returns 'Kaynak yok' for all-null inputs | ✅ Pass |

**Smoke result:** 10/10 passed

---

## Full Suite

- **Total test files:** 51
- **Total tests:** 463
- **All passing:** ✅

---

## Build

- `npx vite build` completed successfully
- 269 modules transformed, no warnings or errors

---

## Risks and Limitations

- Source lookup in `list_news_items_with_usage_summary` is per-item (N+1 queries). Acceptable for MVP; can be optimized with JOIN later.
- `sourceStatus` is passed through to `NewsItemSourceSummary` but not currently used in badge logic — reserved for future display detail.
- `"Bilinmiyor"` badge level is defined but not reachable via `computeNewsItemSourceStatus`; exists for defensive rendering if badge is used standalone elsewhere.
