# M9 Test Baseline Reconciliation

Generated: 2026-04-05
Compared: M8 close (697b9b6) vs M9 (a7d9832)

---

## Backend Test Baseline

### Collection Summary

| Category | Count |
|---|---|
| Total collectable (after fix) | 914 |
| Excluded (Python 3.9 syntax, pre-existing) | 4 files / 84 tests |
| Runnable | 914 (all 4 excluded files fail at collection) |
| **Passing (with feedparser)** | **913** |
| Failing | 1 |
| New in M9 | +19 (test_m9_credentials_api.py × 14, test_m9_youtube_surface.py × 5) |

### Why 4 Files Are Excluded

These files use `str | None` Python 3.10+ syntax. They existed before M9 and were never runnable on Python 3.9 (the venv runtime):

| File | Tests | Root Cause |
|---|---|---|
| test_m3_c2_fallback_providers.py | 20 | `Exception | None` on line 56 |
| test_m7_c1_migration_fresh_db.py | 9 | `str | None` on line 86 |
| test_m7_c2_youtube_adapter.py | 32 | `dict | None` on line 60 |
| test_m7_c3_publish_executor.py | 23 | `str | None` on line 88 |

M9 did NOT modify any of these files (confirmed via `git log 697b9b6..HEAD`).

### The 1 Remaining Failure

**test_m8_c1_analytics_backend.py::test_g_avg_production_duration_exact**

- **Root cause**: Shared test database accumulates job records from earlier tests. The test computes expected average from 3 known jobs but actual average includes all prior jobs in the DB.
- **Type**: Data isolation issue — non-deterministic when run in sequence
- **M9 caused?**: No. Confirmed pre-existing at M8 close commit.
- **Fix path**: Isolate this test with a scoped DB session that resets between runs (M10+ backlog)

### feedparser Was Not Installed

On the M9 verification run, `feedparser` was not installed in venv. Installing it cleared 12 RSS/dedupe test failures:
- tests/test_m5_c1_rss_scan_engine.py: 8 failures → 0
- tests/test_m5_c2_dedupe.py: 4 failures → 0

**This is an environment dependency, not a code failure.** feedparser was installed as part of M9 stabilization.

---

## Frontend Test Baseline

### Vitest Summary

| Milestone | Test Files | Tests | Failures |
|---|---|---|---|
| M8 close (697b9b6) | 156 | 2132 | 0 |
| M9 (a7d9832) | 156 | 2097 | 0 |
| **Delta** | **0** | **-35** | **0** |

### Per-File Test Count Changes

| File | Before | After | Delta | Reason |
|---|---|---|---|---|
| admin-advanced-settings-governance-pack | 23 | 25 | +2 | Added 2 tab navigation tests |
| asset-library-media-resource-management-pack | 50 | 18 | **-32** | Fake PLACEHOLDER_ASSETS removed (M9-D) |
| automation-batch-operations-pack | 23 | 20 | -3 | Decorative action cards removed (M9-D) |
| final-ux-release-readiness-pack | 32 | 33 | +1 | Bekliyor status split test added |
| library-gallery-content-management-pack | 31 | 28 | -3 | Disabled filter inputs removed (M9-D) |
| onboarding.smoke.test | 73 | 73 | 0 | Label changes matched |
| settings-registry | 5 | 5 | 0 | Tab interaction logic updated |

**Net delta: -35. Fully explained by M9-D cleanup of fake/nonfunctional UI surfaces.**

### Are Any Tests Silent-Skipped or Hidden?

No. Vitest ran all 156 files. No `.skip`, no `xit`, no `xtest` added in M9. The delta is 100% from removed tests corresponding to removed fake UI.

---

## Conclusion

The test count drop from 2132 → 2097 is **intentional and correct**:
- 32 tests tested fake asset data that was removed
- 3 tests tested decorative action cards that were removed
- 3 tests tested disabled filter inputs that were removed
- These tests were replaced with honest tests for the new empty states

No meaningful test coverage was silently dropped.
