# Test Report — Phase 2 Frontend Panel Shell

**Date:** 2026-04-01
**Phase:** 2 — Frontend Panel Shell and Basic Routing

## Goal
Replace toggle-based single-screen approach with real route structure. Verify that both Admin and User shells render correctly via react-router-dom.

## Commands Run

```bash
export PATH="/opt/homebrew/opt/node/bin:$PATH"
cd frontend
npm install                  # added react-router-dom ^6.26.0
npm run build                # tsc --noEmit + vite build
npm test                     # vitest run
```

## Test Results

```
src/tests/app.smoke.test.tsx (4 tests) 43ms
  ✓ renders user dashboard at /user
  ✓ renders admin overview at /admin
  ✓ user shell shows header with User label
  ✓ admin shell shows header with Admin label

Test Files  1 passed (1)
     Tests  4 passed (4)
  Duration  433ms
```

## Build Output

```
✓ 40 modules transformed.
dist/assets/index-DPVJ4PiW.js  210.45 kB │ gzip: 68.61 kB
✓ built in 318ms
```

## Issues Fixed During This Turn
- First test run: `getByText("Dashboard")` found 2 elements — the sidebar NavLink and the page `<h2>`. Fixed by using `getByRole("heading", { name: "Dashboard" })` to target only the heading.

## Intentionally Not Done
- Auth / role enforcement
- Zustand stores
- React Query
- Permission guards on routes
- 404 page
- Real navigation between all sidebar items

## Risks
- React Router v7 future flag warning (`v7_startTransition`) appears in test stderr — not a failure, just a deprecation notice. Will resolve naturally when upgrading to v7 in a later phase.
- Node not on default shell PATH — must prefix with `export PATH=...` each session.
