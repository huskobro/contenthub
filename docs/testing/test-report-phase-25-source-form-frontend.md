# Test Report — Phase 25: Admin Sources Create and Edit Frontend

**Date:** 2026-04-02
**Phase:** 25 — Admin Sources Create and Edit Frontend
**Status:** PASSED

## Summary

All 9 Phase 25 tests passed. Full frontend suite: 121/121 passed. Build: 337.20 kB.

## Files Created / Modified

- `frontend/src/api/sourcesApi.ts` (extended) — SourceCreatePayload, SourceUpdatePayload, createSource, updateSource
- `frontend/src/hooks/useCreateSource.ts` (new) — create mutation, invalidates ["sources"]
- `frontend/src/hooks/useUpdateSource.ts` (new) — patch mutation, invalidates ["sources", id] and ["sources"]
- `frontend/src/components/sources/SourceForm.tsx` (new) — shared create/edit form; source_type-aware field visibility; validation
- `frontend/src/pages/admin/SourceCreatePage.tsx` (new) — create page navigates to registry with selectedId on success
- `frontend/src/components/sources/SourceDetailPanel.tsx` (rewritten) — read/edit mode toggle via Düzenle button
- `frontend/src/pages/admin/SourcesRegistryPage.tsx` (updated) — reads location.state.selectedId, adds "+ Yeni Source" button
- `frontend/src/app/router.tsx` (updated) — /admin/sources/new route added before /admin/sources
- `frontend/src/tests/source-form.smoke.test.tsx` (new) — 9 tests

## Test Results

```
src/tests/source-form.smoke.test.tsx
  ✓ renders create page heading
  ✓ shows name required validation error
  ✓ shows rss feed_url required validation
  ✓ calls create mutation on valid RSS submit (fetch called with POST)
  ✓ cancel button is present and clickable on create page
  ✓ registry page shows '+ Yeni Source' button
  ✓ edit mode opens when Düzenle is clicked in detail panel
  ✓ cancel closes edit mode in detail panel
  ✓ update mutation is called with PATCH on valid submit

Test Files: 16 passed
Tests: 121 passed (112 previous + 9 new)
Build: 337.20 kB ✅
```

## Intentionally Not Done

- Source scan engine
- Health check
- Used news / dedupe
- News Bulletin wizard
- User panel sources view
- Bulk operations
