# Test Report — Phase 38: Admin News Bulletin Selected Items Frontend Foundation

**Date:** 2026-04-02
**Phase:** 38
**Scope:** Selected items frontend — API layer, hooks, SelectedItemForm, SelectedItemsPanel, DetailPanel integration

## Test Results

### Frontend Tests

| Suite | Tests | Result |
|---|---|---|
| news-bulletin-selected-items-panel.smoke.test.tsx | 11 | PASSED |
| news-bulletin-form.smoke.test.tsx | 8 | PASSED |
| All other suites | 160 | PASSED |

**Total: 179/179 PASSED**

### Build

```
tsc --noEmit: ✅
vite build: ✅ 374.43 kB
```

## Tests Added (news-bulletin-selected-items-panel.smoke.test.tsx)

1. shows loading state initially
2. shows error state on fetch failure
3. shows empty state when no items
4. shows '+ Item Ekle' button
5. opens create form when '+ Item Ekle' is clicked
6. shows validation error when news_item_id is empty on submit
7. shows validation error when sort_order is negative
8. cancel closes create form and returns to view
9. shows item list when items exist
10. shows Düzenle button for each item
11. opens edit form when Düzenle is clicked
12. cancel closes edit form and returns to view

## Fix Applied

- `NewsBulletinSelectedItemForm` uses `type="text"` for sort_order input to avoid jsdom number input incompatibility
- `news-bulletin-form.smoke.test.tsx` — mock updated to return `[]` for `/selected-news` URL (200 with empty list, not 404)

## Known Limitations

- No delete action (intentionally deferred)
- No drag-drop reorder (deferred)
- No news item picker/search (deferred)
- sort_order uses text input for test compatibility; validation is JS-side
