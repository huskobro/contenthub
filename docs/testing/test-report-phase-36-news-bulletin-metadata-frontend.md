# Test Report — Phase 36: Admin News Bulletin Metadata Frontend Foundation

**Date:** 2026-04-02
**Phase:** 36
**Scope:** News bulletin metadata frontend — API layer, hooks, MetadataForm, MetadataPanel, DetailPanel integration

## Test Results

### Frontend Tests

| Suite | Tests | Result |
|---|---|---|
| news-bulletin-metadata-panel.smoke.test.tsx | 11 | PASSED |
| news-bulletin-form.smoke.test.tsx | 8 | PASSED |
| news-bulletin-script-panel.smoke.test.tsx | 9 | PASSED |
| news-bulletin-registry.smoke.test.tsx | 9 | PASSED |
| All other suites | 130 | PASSED |

**Total: 167/167 PASSED**

### Build

```
tsc --noEmit: ✅
vite build: ✅ 368.37 kB
```

## Tests Added (news-bulletin-metadata-panel.smoke.test.tsx)

1. shows loading state initially
2. shows error state on fetch failure
3. shows empty state when no metadata (404)
4. shows '+ Metadata Ekle' button when no metadata
5. opens create form when '+ Metadata Ekle' is clicked
6. shows validation error when title is empty on submit
7. cancel closes create form and returns to view
8. shows metadata content when metadata exists
9. shows Düzenle button when metadata exists
10. opens edit form when Düzenle is clicked
11. cancel closes edit form and returns to view

## Fix Applied

`news-bulletin-form.smoke.test.tsx` — "edit mode opens" and "cancel closes edit mode" tests updated to also handle `/metadata` URL (return 404) alongside `/script`, preventing MetadataPanel's "Düzenle" button from causing `getByRole` ambiguity.

## Known Limitations

- React Router v7 future flag warnings in stderr — cosmetic, no functional impact
- No backend integration test (kept as unit/smoke level)
- Title is required for metadata create; other fields optional
