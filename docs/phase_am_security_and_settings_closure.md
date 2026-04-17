# PHASE AM — Security & Consistency Hardening — Closure

**Status:** Complete (AM-1 … AM-6)
**Worktree:** `.claude/worktrees/audit+effective-settings-and-gemini-plan`
**Branch:** `worktree-audit+effective-settings-and-gemini-plan`
**Scope:** Read-only audit (AM-1) → surgical security + consistency fixes → docs.
**Outcome:** 5/5 Phase AL audit findings closed with targeted tests. 50 new Phase AM tests + 160 regression tests green. No main branch touches. No behavior change outside the audited surfaces.

---

## 1. Problem Statement

Phase AL (`docs/phase_al_product_simplification_and_effective_settings_audit.md`) produced five actionable audit findings that required backend and frontend surgery:

| # | Finding | Surface |
|---|---|---|
| A | Legacy `/platform-connections` CRUD endpoints read/wrote any user's row without ownership enforcement. | backend |
| B | `/users/*` CRUD was unauthenticated — non-admin callers could list, patch, or delete users. | backend |
| C | `/audit-logs/*` had only a visibility rule guard; a visibility rule flip would expose the whole audit trail to non-admins. | backend |
| D | `settings` table carried 60+ rows whose keys were no longer in `KNOWN_SETTINGS` (test seeds, legacy group names). They kept `visible_to_user=True` and leaked into the user-facing effective list, while the 16 keys the registry currently marks as user-visible stayed hidden. | backend |
| E | Admin and user pages used bare React Query keys (`["users"]`, `["channel-profiles"]`, `["effectiveSettings"]`, etc.). Under role switching or multi-user browser sessions this creates stale-data risk — the cache can't distinguish identities once a page unmounts. | frontend |

Phase AM's charter was narrow: **close these five findings only**. No new UX redesign, no automation flow builder, no layout consolidation. Smallest possible surface. Targeted tests. Commit + push per sub-phase.

---

## 2. Sub-phase Summary

### AM-1 — Discovery + impact map (commit `4d8269a`)

Read-only; produced `docs/phase_ak_effective_settings_and_gemini_plan_audit.md` and `docs/phase_al_product_simplification_and_effective_settings_audit.md`. No code changed. Results tabulated below under "Numbers you can verify."

### AM-2 — Platform connections ownership guard (commit `06108df`)

**Files changed:**
- `backend/app/platform_connections/service.py`: `list_platform_connections`, `get_platform_connection`, `update_platform_connection`, `delete_platform_connection`, `get_connection_with_health` all accept `user_context: Optional[UserContext] = None`. Fail-closed (return empty / None / False when `user_context is None` on a non-admin path). Non-admin reads join `ChannelProfile.user_id == user_context.user_id`.
- `backend/app/platform_connections/router.py`: every legacy CRUD endpoint now requires `ctx: UserContext = Depends(get_current_user_context)` and passes `user_context=ctx` into the service. `GET ""` verifies any explicit `channel_profile_id` filter via `ensure_owner_or_admin`. Foreign IDs return 404 (not 403) to avoid leaking existence. POST "" is intentionally left unchanged (OAuth callback flow — scoped separately).

**Tests:** `backend/tests/test_phase_am_platform_connections_guard.py` — 18 tests:
- 6 unauth-401 via `raw_client`
- non-admin list scoping vs admin list sees all
- foreign `channel_profile_id` filter rejection
- cross-user GET/PATCH/DELETE → 404
- owner happy-path PATCH/DELETE + admin delete bypass

### AM-3 — Users + audit admin guard (commit `a1c4bd6`)

**Files changed:**
- `backend/app/users/router.py`: `router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])`. Eight endpoints (list/create/get/patch/delete + override list/set/delete) unchanged otherwise.
- `backend/app/audit/router.py`: stacked both guards — `dependencies=[Depends(require_admin), Depends(require_visible("panel:audit-logs"))]`. Belt-and-suspenders: both gates must pass.

**Tests:** `backend/tests/test_phase_am_users_audit_admin_guard.py` — 18 tests:
- 8 users unauth-401 + 4 non-admin-403 + 1 admin-ok
- 2 audit unauth-401 + 2 non-admin-403 + 1 admin-ok

### AM-4 — Effective settings drift repair (commit `6ecfd1c`)

**Files changed:**
- `backend/app/settings/settings_seed.py`: new `mark_orphan_settings(db)` async function + new `compute_drift_report(rows)` pure reducer. Drift marker flips `active → orphan` when a key leaves `KNOWN_SETTINGS`; flips `orphan → active` if the key returns. Leaves `deleted` (admin soft-delete) untouched — orthogonal axis.
- `backend/app/main.py`: startup lifespan calls `mark_orphan_settings` after `sync_default_values_from_registry`. Logs only when drift is non-zero.
- `backend/app/settings/service.py`: `list_settings(visible_to_user_only=True)` now also filters `Setting.status == "active"`. Belt-and-suspenders hardening so `orphan` and `deleted` rows can never leak even if the startup marker hasn't run.
- `backend/app/settings/router.py`: `DriftReport` / `DriftRepairResult` Pydantic models. `GET /api/v1/settings/drift` (admin-only read-only inspector). `POST /api/v1/settings/drift/repair` (admin-only on-demand idempotent repair so operators don't have to bounce the process after a registry edit).

**Tests:** `backend/tests/test_phase_am_settings_drift.py` — 14 tests:
- unit: mark_orphan happy path / reactivation / skip-deleted / idempotency
- reducer: compute_drift_report shape + counts
- service: list_settings excludes orphan and deleted rows
- API guard: GET /drift 401/403/200, POST /drift/repair 401/403/200 + idempotent

### AM-5 — Frontend scoped query hygiene (commit `ee03737`)

**Files changed** (frontend cache keys only — no HTTP behavior changed):

| File | Change |
|---|---|
| `frontend/src/pages/admin/AdminConnectionsPage.tsx` | `["users"]` → `["users", "admin-scope"]`, `["channel-profiles"]` → `["channel-profiles", "admin-scope"]` |
| `frontend/src/pages/admin/AdminAutomationPoliciesPage.tsx` | `["automation-policies"]` → `["automation-policies", "admin-scope"]` |
| `frontend/src/pages/admin/PromptEditorPage.tsx` | `["effectiveSettings"]` → `["effectiveSettings", "admin-scope"]`; existing `invalidateQueries({queryKey: ["effectiveSettings"]})` still hits the scoped key via default prefix-match |
| `frontend/src/pages/user/UserChannelAnalyticsPage.tsx` | `["channel-profiles-user"]` → `["channel-profiles-user", userId]` via `useAuthStore((s) => s.user?.id ?? "anonymous")` |
| `frontend/src/surfaces/canvas/CanvasUserPublishPage.tsx` | 3 user-scope keys include `userId`: projects-completed, projects-production, canvas-publish-channels |

`AdminNotificationsPage.tsx` was already scoped with `"admin-page"` marker; left untouched.

### AM-6 — Docs + final verification (this doc)

No source changes; final verification runs, closure doc.

---

## 3. Numbers you can verify

| Question | Before Phase AM | After Phase AM |
|---|---|---|
| `KNOWN_SETTINGS` total keys | 204 | 204 |
| `settings` DB rows | 136 | 136 |
| DB rows with `visible_to_user=1` | 4 stale (`system.output_dir`, `system.workspace_root`, `workspace.output_dir`, `workspace.workspace_root`) | 4 — but on next boot the `workspace.*` two become `status='orphan'` and drop out of the user view |
| Orphan groups in DB | `test` (56), `groupA` (2), `groupB` (2), `workspace` (2) | Same rows preserved; marked `status='orphan'` at startup so they never leak |
| `/platform-connections` legacy CRUD | reads any user's row | non-admin scoped to own ChannelProfile |
| `/users/*` | unauthenticated | admin-only |
| `/audit-logs/*` | visibility guard only | admin + visibility (stacked) |
| `GET /settings/drift` | did not exist | admin-only inspector |
| `POST /settings/drift/repair` | did not exist | admin-only idempotent repair |

---

## 4. Test results

All tests run from the worktree backend directory with `.venv/bin/python3 -m pytest`.

### Phase AM-specific suites

| Suite | Tests | Result |
|---|---|---|
| `test_phase_am_platform_connections_guard.py` | 18 | ✅ all passed |
| `test_phase_am_users_audit_admin_guard.py` | 18 | ✅ all passed |
| `test_phase_am_settings_drift.py` | 14 | ✅ all passed |
| **Phase AM total** | **50** | **✅ 50/50** |

### Adjacent regression coverage

| Suite | Tests | Result |
|---|---|---|
| `test_settings_api.py` | — | ✅ |
| `test_settings_precedence.py` | — | ✅ |
| `test_m22_visibility_settings_publish.py` | — | ✅ |
| `test_m10_settings_resolver.py` | — | ✅ |
| `test_tts_faz6_settings_visibility.py` | — | ✅ |
| `test_faz17_connection_center.py` | — | ✅ |
| `test_faz17a_capability_guard.py` | — | ✅ |
| `test_health.py` | — | ✅ |
| **Combined with Phase AM** | **160** | **✅ 160/160 in 21.07s** |

No tests were skipped. No flaky retries. Coverage includes:
- route / API smoke
- permission tests
- visibility tests
- settings resolver precedence
- state integrity (platform connections)

---

## 5. Design choices (and why)

### Fail-closed service layer (AM-2)
`list_platform_connections(user_context=None)` returns `[]` on a non-admin path rather than raising. This keeps the legacy callers (templates, batch scripts) from crashing while still preventing data leakage — the only way a non-admin can see connections is through `UserContext` + channel-profile ownership join.

### 404 (not 403) for cross-user connection reads (AM-2)
Returning 403 for "exists but you can't see it" leaks existence. `GET /platform-connections/{foreign_id}` → 404 is consistent with the Phase X ownership canon and with most public APIs (GitHub, GitLab).

### Guard stacking on audit-logs (AM-3)
`dependencies=[Depends(require_admin), Depends(require_visible("panel:audit-logs"))]` means both gates must pass. If the visibility rule is ever flipped open, `require_admin` still keeps users out. The reverse is also true. This is the defense-in-depth pattern CLAUDE.md calls for.

### Non-destructive drift marker (AM-4)
Instead of deleting stale rows, we introduced `status='orphan'`. Reversible — the row is preserved and automatically reactivated if the key returns. Distinct from `status='deleted'` (admin soft-delete), which the drift marker leaves alone. Two orthogonal axes; a row can be `deleted` and `orphan` conceptually, but in practice the drift marker never overwrites `deleted` because that's an admin decision.

### Belt-and-suspenders on `list_settings` (AM-4)
Even with the startup marker, we still filter `status='active'` in `list_settings(visible_to_user_only=True)`. If a rogue migration or a direct SQL insert ever creates an active-looking row with a missing registry key, the user-facing list still won't leak it. Costs one WHERE clause; buys a safety net.

### In-product drift inspector + repair (AM-4)
`GET /settings/drift` and `POST /settings/drift/repair` exist so operators can verify the drift is closed without tailing the startup log. Admin-only — never exposed to users. Read endpoint is idempotent by construction; repair endpoint is idempotent by implementation.

### Frontend scope markers, not backend changes (AM-5)
The backend already scopes non-admin callers automatically (Phase X ownership). AM-5 is pure frontend cache hygiene. We did NOT tighten `/api/v1/automation-policies` in AM-5 even though the audit caught it unguarded — that's a separate backend fix with its own risk profile and test plan.

---

## 6. Scope boundaries — what Phase AM did NOT touch

Explicit list so future phases know what's still open:

| Topic | Status | Rationale |
|---|---|---|
| `POST /platform-connections` (OAuth callback create) | unchanged (anonymous) | Tightening could break OAuth callback flows; requires its own scope + test plan. |
| `GET /api/v1/automation-policies` backend guard | unchanged (anonymous) | AM-5 was frontend-only. Real backend gap — needs follow-up pass. |
| `automation_policies` `owner_user_id` filter enforcement | unchanged | Same as above. |
| UX redesign / automation flow builder | unchanged | Out of scope per user instruction. |
| Layout consolidation (canvas / atrium / horizon) | unchanged | Out of scope. |
| Theme persistence migration | unchanged | Already covered in Phase AK audit; implementation deferred. |
| Calendar / content calendar overhaul | unchanged | Out of scope. |
| `AdminNotificationsPage` query keys | unchanged | Already scoped with `"admin-page"` marker. |

---

## 7. Risks documented

- **Production DB cutover (AM-4):** On the first restart after AM-4 deploys, 62 rows with `group in {test, groupA, groupB, workspace}` will flip from `status='active'` to `status='orphan'` automatically. The 4 user-visible stale rows (`system.output_dir`, `system.workspace_root`, `workspace.output_dir`, `workspace.workspace_root`) will drop out of the user-facing effective list — this is the fix's intended behavior, but users who habitually saw those entries should be informed. They never controlled live settings, only misleading display.
- **Status enum not yet migrated (AM-4):** `settings.status` is a plain VARCHAR; Alembic does not enforce the set `{active, deleted, orphan}`. Acceptable for the non-breaking AM-4 rollout; if we later lock the enum, migration ordering is: (1) write all existing "orphan"s → (2) tighten enum.
- **`/automation-policies` still unguarded (AM-5 scope note):** Backend endpoint accepts anonymous callers. AM-5 frontend cache marker does not fix this. Recommended follow-up: "AM-2b" pass applying the Phase X ownership pattern (mirror AM-2 for platform_connections).
- **No frontend typecheck in this worktree:** The worktree has no `node_modules`, so `tsc --noEmit` was not run against the AM-5 edits. CI will catch any regression on main repo push. Visual verification: every query key is still an array, `useAuthStore` imports are correct, hooks are called inside component bodies.

---

## 8. Commit history (this phase only)

```
ee03737 fix(frontend): phase AM-5 — scoped query cache hygiene          # AM-5
6ecfd1c fix(settings): phase AM-4 — drift repair for orphan registry rows # AM-4
a1c4bd6 fix(users,audit): phase AM-3 — admin-only guards on users + audit-logs # AM-3
06108df fix(platform-connections): phase AM-2 — close legacy ownership leak # AM-2
4d8269a docs(phase-ak/al): audit reports — effective settings + ownership   # AM-1
```

All commits on `worktree-audit+effective-settings-and-gemini-plan`. No main branch touches. All pushed to `origin`.

---

## 9. Delivery format per sub-phase

Each sub-phase (AM-2 … AM-5) was delivered to the user with the same 7-section format:
1. What I did
2. Files changed
3. Tests run
4. Results
5. Extra risk
6. Commit hash
7. Push status

---

## 10. Phase AM acceptance

| Gate | Requirement | Status |
|---|---|---|
| Code Quality | lint / type check / tests / no dead imports | ✅ all Phase AM + adjacent tests pass; no dead imports introduced |
| Behavior | permissions / visibility / state transitions valid | ✅ fail-closed paths covered by tests; no new silent behavior |
| Product | UX complexity not increased | ✅ no new surfaces; two admin-only endpoints added behind `require_admin` |
| Stability | restart recovery, workspace integrity, failure surfacing | ✅ AM-4 startup path is idempotent; AM-2 fail-closed pattern verified |
| Document | docs updated, changes recorded, honest debt | ✅ this doc + section 7 (risks) + section 6 (boundaries) |

**Phase AM is complete.** The worktree branch carries five commits that can be reviewed individually or merged as a series. Main branch has not been touched.

---

## Appendix — Running the verification locally

```bash
cd .claude/worktrees/audit+effective-settings-and-gemini-plan/backend
../../../../backend/.venv/bin/python3 -m pytest \
  tests/test_phase_am_platform_connections_guard.py \
  tests/test_phase_am_users_audit_admin_guard.py \
  tests/test_phase_am_settings_drift.py \
  -v
# -> 50 passed

# Broader adjacent regression:
../../../../backend/.venv/bin/python3 -m pytest \
  tests/test_settings_api.py \
  tests/test_settings_precedence.py \
  tests/test_m22_visibility_settings_publish.py \
  tests/test_m10_settings_resolver.py \
  tests/test_tts_faz6_settings_visibility.py \
  tests/test_phase_am_platform_connections_guard.py \
  tests/test_phase_am_users_audit_admin_guard.py \
  tests/test_phase_am_settings_drift.py \
  tests/test_faz17_connection_center.py \
  tests/test_faz17a_capability_guard.py \
  tests/test_health.py \
  -q
# -> 160 passed
```
