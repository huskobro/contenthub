# Faz 4 — Final Hardening + Product Polish + Operator Trust Closure

**Status:** CLOSED
**Date:** 2026-04-21

Faz 4 was NOT a core-blocker phase. Faz 3 already closed the "clone → running"
safety path. Faz 4's remit was to take the product from "working and safe"
to "final-product feel, operator-friendly, durable, polished." No new feature
expansion; no "refactor later" shortcuts.

---

## Scope (five focus areas)

1. **UX / HONEST STATE HARDENING** — loading / empty / disabled / error states.
2. **KEYBOARD / A11Y / INPUT POLISH** — focus rings, Space activation,
   aria-label / aria-live / aria-controls, Escape handlers.
3. **PERFORMANCE / RE-RENDER / TABLE ERGONOMICS** — heavy registry pages,
   memoization, background-tab polling.
4. **PROVIDER FAILURE UX** — timeout / rate-limit / missing-provider /
   cause-chain readability in Job Detail > Provider Trace.
5. **DOC / OPERATOR FINAL POLISH** — operator-guide provider-failure runbook.

---

## 1. UX / honest state hardening

**Root cause:** a batch of `useMutation` consumers (inbox status toggles,
notification ops, YouTube sync buttons, wizard submits) had no `onError`
handler — on failure the button reverted silently and the operator was
left guessing why. Some used per-call `mutate(args, { onSuccess })`
without a matching `onError`.

**Change:** every flagged mutation now either carries `onError` directly
on `useMutation`, or per-call `onError` on `mutate()` via the
`toastMessageFromError(err)` helper. The helper combines
`classifyError`'s title + message into one toast string so the operator
sees the actual failure (e.g. "401 invalid api key") instead of a
generic revert.

**Affected files:**

- `frontend/src/surfaces/aurora/AuroraAdminInboxPage.tsx`
- `frontend/src/surfaces/aurora/AuroraAdminNotificationsPage.tsx`
- `frontend/src/surfaces/aurora/AuroraUserYouTubeAnalyticsPage.tsx`
- `frontend/src/surfaces/aurora/AuroraAdminYouTubeAnalyticsPage.tsx`
- `frontend/src/surfaces/aurora/AuroraStandardVideoWizardPage.tsx`
- `frontend/src/surfaces/aurora/AuroraCreateProductReviewWizardPage.tsx`
- `frontend/src/pages/admin/AdminNotificationsPage.tsx`
- `frontend/src/pages/admin/StandardVideoWizardPage.tsx`
- `frontend/src/pages/admin/AdminYouTubeAnalyticsPage.tsx`
- `frontend/src/pages/user/UserInboxPage.tsx`
- `frontend/src/pages/user/UserNewsPickerPage.tsx`
- `frontend/src/pages/user/UserYouTubeAnalyticsPage.tsx`
- `frontend/src/pages/user/CreateVideoWizardPage.tsx`
- `frontend/src/lib/errorUtils.ts` (toastMessageFromError helper)

**Verification:** audit agent confirmed zero fire-and-forget mutations
remain across pages/admin, pages/user and surfaces/aurora.

---

## 2. Keyboard / a11y / input polish

**Root cause:** custom widgets were keyboard-reachable (`tabIndex=0 +
role="button"`) but lacked focus rings, Space activation, Escape
handlers or `aria-*` plumbing. Inputs placed inside panels had only a
placeholder — no associated label.

**Change — per component:**

- `ColumnSelector.tsx` — added Escape-to-close with focus restore to
  trigger, `aria-controls` on button, `id` + `aria-label` on portaled
  listbox, `focus-visible:outline` ring on trigger.
- `TableFilterBar.tsx` — `focus-visible` ring on every filter pill so
  keyboard users can see which option they are about to activate.
- `NotificationCenter.tsx` (item) — Space-key activation (in addition
  to Enter) with `preventDefault` to stop page scroll, `focus-visible`
  ring.
- `SettingRow.tsx` — edit input gets `aria-label` derived from
  setting label; feedback banner wrapped in `role="status" aria-live="polite"`
  so screen-readers announce save result.
- `ApiKeyField.tsx` — same aria-label / aria-live treatment for secret
  fields.

**Scope discipline:** skipped purely-visual polish and components that
already had correct wiring (e.g. `Sheet` with `useFocusRestore`,
`SettingsTable` row already had `focus-visible` outline). No new
"accessibility abstraction" was introduced; fixes are inline.

---

## 3. Performance / re-render / table ergonomics

**Root cause:** admin registry tables (Jobs, Settings) did O(n) scans
for filter-count badges on every parent re-render, and the SSE event
bus invalidated the `jobs` key every few seconds. News / Settings /
Dashboard queries also refetched on every tab focus, producing a visible
re-render storm even when the data hadn't changed.

**Change:**

- `JobsTable.tsx` — `useMemo` on `filtered`, `filteredIds`, `modules`,
  and single-pass `statusCounts` (completed/failed/queued/retrying);
  replaced inline `jobs.filter(s => s.status==='X').length` (4× O(n))
  with the memoized counts.
- `SettingsTable.tsx` — `useMemo` on `groups`, `types`, `filtered`,
  `filteredIds`. With ~250 settings this cut three O(n) walks per
  render.
- `useSettingsList.ts` — `staleTime: 60_000`, `refetchOnWindowFocus: false`.
  Settings registry barely changes between tab focuses; the UI was
  re-fetching + re-rendering the whole table on every Alt-Tab.
- `useNewsItemsList.ts` — `staleTime: 30_000`, `refetchOnWindowFocus: false`.
  News items only change after a manual scan or admin edit, both of
  which already invalidate the key.
- `useDashboardSummary.ts` — added `refetchIntervalInBackground: false`.
  60s polling is kept for the "live" feel but pauses while the tab is
  hidden, so a forgotten admin tab doesn't hammer the analytics
  aggregator all day.

---

## 4. Provider failure UX (exception preservation)

**Root cause:** three separate places dropped exception type / cause:

1. `visuals.py` — caught all provider errors at WARNING level and
   re-raised a generic "Tüm sahneler için görsel bulunamadı" with no
   detail. Operator had to grep logs to learn it was a 401.
2. `pipeline.py:344` — generic exception wrapper used `str(exc)` only,
   which on bare-string exceptions (`ValueError("foo")`) collapsed both
   the type and any `__cause__` / `__context__`.
3. `strict_resolution.py:201` — `error_message=str(exc)` passed to the
   provider health registry, which for `httpx.TimeoutException` /
   `httpx.ConnectError` is often an empty string → "failed — (no detail)".

**Change:**

- `visuals.py` — accumulate `provider_failures: dict[str,int]` and
  `provider_last_error: dict[str,str]`, truncated to 200 chars; embed
  both in the final `StepExecutionError` message so Job Detail shows
  `openverse: HTTPStatusError: 401 invalid api key` instead of the
  generic blanket.
- `pipeline.py` — wrapper now formats as
  `Unexpected error in step 'X': TypeName: msg ← CauseType: causeMsg`,
  preserving chained exceptions. Audit log details also use the
  enriched message.
- `strict_resolution.py` — `error_detail = f"{type(exc).__name__}: {exc}"`
  falling back to type name alone if `str(exc)` is empty.

**Design guardrail:** no auto-fallback was introduced. Strict TTS
resolution still fails fast (per CLAUDE.md "fail fast where correctness
matters") — a wrong voice is worse than a loud error.

---

## 5. Doc / operator final polish

**Change:** added "Provider Hatalari (Faz 4 — hata okunabilirligi)"
subsection to `docs/operator-guide.md` under §9 Sorun Giderme. It
explains the new Provider Trace format, maps common HTTP codes
(401/403/429/TimeoutException/ConnectError/NonRetryableProviderError)
to operator actions (credential update, network check, rate-limit
wait, fallback chain config), and documents the new
`← CauseType: causeMsg` chain in Job Detail.

A dedicated Faz 4 closure doc (this file) lives under
`docs/phases/faz4_final_hardening_product_polish.md`.

---

## What Faz 4 intentionally did NOT do

- No new features. No new pages. No new settings keys.
- No new a11y abstractions (no `AccessibleButton` wrapper, no
  `FocusManager` context). Inline fixes only.
- No auto-fallback in strict TTS / visuals. Fail-fast stays.
- No bulk refactor of every table — `JobsTable` and `SettingsTable`
  are the hot paths; smaller registries were left alone.
- No "later" shortcuts. Every audit item either shipped in this phase
  or was verified as already-correct.

---

## Verdict

**GO for MVP final.**

Core blockers closed in Faz 2/3. Faz 4 closed the trust + polish gap
between "works" and "feels like a finished local operator tool." No
remaining Faz 4 punch-list item is a ship-blocker.
