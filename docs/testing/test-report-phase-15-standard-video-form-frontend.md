# Test Report: Phase 15 — Standard Video Create/Edit Frontend

**Date:** 2026-04-01
**Phase:** 15
**Scope:** Standard Video Admin Create/Edit Frontend

---

## Summary

Phase 15 adds the create and edit UI for the Standard Video module on the admin frontend.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/api/standardVideoApi.ts` | Added `StandardVideoCreatePayload`, `StandardVideoUpdatePayload`, `createStandardVideo`, `updateStandardVideo` |
| `frontend/src/hooks/useCreateStandardVideo.ts` | New hook — wraps `createStandardVideo` mutation, invalidates `["standard-videos"]` on success |
| `frontend/src/hooks/useUpdateStandardVideo.ts` | New hook — wraps `updateStandardVideo(id)` mutation, invalidates `["standard-videos"]` on success |
| `frontend/src/components/standard-video/StandardVideoForm.tsx` | New reusable form for create and edit; validates topic (required) and target_duration_seconds (not negative) |
| `frontend/src/pages/admin/StandardVideoCreatePage.tsx` | New page at `/admin/standard-videos/new`; uses `useCreateStandardVideo` + `StandardVideoForm`; navigates to detail on success |
| `frontend/src/pages/admin/StandardVideoDetailPage.tsx` | Added edit mode toggle; "Düzenle" button shows `StandardVideoForm` pre-filled with existing data; "İptal" returns to view mode |
| `frontend/src/app/router.tsx` | Added `/admin/standard-videos/new` route pointing to `StandardVideoCreatePage` |
| `frontend/src/pages/admin/StandardVideoRegistryPage.tsx` | Added "+ Yeni Standard Video" button navigating to `/admin/standard-videos/new` |

---

## Test Results

**Command:** `npm test -- --run`

| Test File | Tests | Result |
|-----------|-------|--------|
| `format-duration.test.ts` | 7 | PASS |
| `app.smoke.test.tsx` | 4 | PASS |
| `settings-registry.smoke.test.tsx` | 5 | PASS |
| `visibility-registry.smoke.test.tsx` | 5 | PASS |
| `jobs-registry.smoke.test.tsx` | 7 | PASS |
| `job-detail-page.smoke.test.tsx` | 5 | PASS |
| `standard-video-registry.smoke.test.tsx` | 5 | PASS |
| `standard-video-detail-page.smoke.test.tsx` | 6 | PASS |
| `standard-video-form.smoke.test.tsx` | 6 | PASS |

**Total: 50 / 50 tests passed**

### New Tests (standard-video-form.smoke.test.tsx)

1. `create page renders the form heading` — PASS
2. `create page shows topic field` — PASS
3. `topic validation shows error when empty` — PASS
4. `detail page renders edit button after loading` — PASS
5. `detail page shows edit form when Düzenle is clicked` — PASS
6. `edit form is pre-filled with existing video data` — PASS

**Build:** `npm run build` → `tsc --noEmit` + `vite build` — PASS (124 modules, no type errors)

---

## Known Limitations

- The `status` field is not sent in the create payload (create endpoint does not accept status; default is "draft").
- Edit form sends `status` in the PATCH payload — the backend accepts it.
- No optimistic UI update; the list re-fetches via query invalidation on mutation success.

---

## Deferred

- Script and metadata create/edit UI (Phase scope did not include this).
- Confirmation dialog before discarding edits.
