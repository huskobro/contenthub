# Test Report — Phase 46: Admin News Items Create/Edit Frontend

## Summary
Phase 46 adds create and edit capabilities for news items in the admin frontend.

## Files Changed
- `frontend/src/api/newsItemsApi.ts` — added `NewsItemCreatePayload`, `NewsItemUpdatePayload`, `createNewsItem()`, `updateNewsItem()`
- `frontend/src/hooks/useCreateNewsItem.ts` — new
- `frontend/src/hooks/useUpdateNewsItem.ts` — new
- `frontend/src/components/news-items/NewsItemForm.tsx` — new form (title, url, status, source_id, language, category, published_at, summary, dedupe_key)
- `frontend/src/pages/admin/NewsItemCreatePage.tsx` — new create page
- `frontend/src/components/news-items/NewsItemDetailPanel.tsx` — added edit mode with Düzenle button
- `frontend/src/pages/admin/NewsItemsRegistryPage.tsx` — added Yeni button + location state selectedId
- `frontend/src/app/router.tsx` — added `/admin/news-items/new` route
- `frontend/src/tests/news-item-form.smoke.test.tsx` — 10 new smoke tests

## Test Results

### New Tests (news-item-form.smoke.test.tsx)
| # | Test | Result |
|---|------|--------|
| 1 | renders the create page heading | ✓ PASS |
| 2 | shows title required error on empty submit | ✓ PASS |
| 3 | shows url required error on empty submit | ✓ PASS |
| 4 | cancel button is present on create page | ✓ PASS |
| 5 | submit button is present on create page | ✓ PASS |
| 6 | registry page shows Yeni button | ✓ PASS |
| 7 | registry page shows item in list after load | ✓ PASS |
| 8 | detail panel shows Düzenle button when item selected | ✓ PASS |
| 9 | edit mode opens when Düzenle is clicked | ✓ PASS |
| 10 | cancel closes edit mode | ✓ PASS |

### Existing Tests
- news-items-registry.smoke.test.tsx: 8/8 still pass (detail panel heading intact)

### Full Suite
- **Test Files:** 28 passed
- **Total Tests:** 233 passed (223 previous + 10 new)
- **Build:** tsc --noEmit + vite build ✓
