# CHANGELOG

---

## [2026-04-01] Phase 0 — Repo Init & Docs Skeleton

**What:** Initialized git repository, added project baseline docs.
**Files:** `.gitignore`, `README.md`, `CLAUDE.md`, `docs/architecture/README.md`, `docs/testing/README.md`, `docs/decisions/.gitkeep`, `docs/phases/.gitkeep`
**Tests:** None (no code)
**Commit:** `2e0c3ba` — `chore: initialize repository with docs skeleton and project baseline`
**Push:** No remote configured

---

## [2026-04-01] Phase 1 — Backend Skeleton

**What:** FastAPI backend skeleton with health endpoint, config, logging, db placeholder, tests, and lightweight tracking docs.
**Files added/changed:**
- `backend/pyproject.toml`
- `backend/app/main.py`, `__init__.py`
- `backend/app/api/health.py`, `router.py`, `__init__.py`
- `backend/app/core/config.py`, `logging.py`, `__init__.py`
- `backend/app/db/session.py`, `__init__.py`
- `backend/tests/conftest.py`, `test_health.py`
- `data/.gitkeep`
- `docs/tracking/STATUS.md`, `CHANGELOG.md`
- `docs/testing/test-report-phase-1-backend.md`
**Tests:** `pytest backend/tests/test_health.py` — results below
**Commit:** `d7edb9a` — `chore: add phase 1 backend skeleton and lightweight tracking docs`
**Push:** ✓ All commits pushed. Remote switched to SSH. `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 1 — Frontend Skeleton

**What:** React + Vite + TypeScript skeleton with app shell (Admin/User toggle), two page stubs, 3 smoke tests passing, build clean.
**Files added:**
- `frontend/package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`
- `frontend/src/main.tsx`
- `frontend/src/app/App.tsx`
- `frontend/src/pages/AdminOverviewPage.tsx`, `UserDashboardPage.tsx`
- `frontend/src/tests/app.smoke.test.tsx`
- `docs/testing/test-report-phase-1-frontend.md`
**Tests:** `npm test` (vitest run) — 3 passed in 589ms
**Commit:** `340006e` — `chore: add phase 1 frontend skeleton with basic app shell`
**Push:** ✓ Pushed to `git@github.com:huskobro/contenthub.git`

---

## [2026-04-01] Phase 1 — Renderer & Workspace Skeleton

**What:** Renderer directory skeleton for future Remotion integration. Workspace folder structure tracked via .gitkeep. .gitignore updated to allow workspace structure while keeping runtime content ignored.
**Files added/changed:**
- `renderer/README.md`
- `renderer/src/compositions/.gitkeep`, `renderer/src/shared/.gitkeep`, `renderer/tests/.gitkeep`
- `workspace/jobs/.gitkeep`, `workspace/exports/.gitkeep`, `workspace/temp/.gitkeep`
- `.gitignore` (workspace negation rules)
- `docs/testing/test-report-phase-1-renderer.md`
**Tests:** No code tests — structural verification only
**Commit:** TBD
**Push:** TBD
