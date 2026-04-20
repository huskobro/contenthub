# Faz 3 — First-run / Migration / Upgrade / Restore Closure

**Status:** CLOSED
**Date:** 2026-04-21

Faz 3 was the safety/truth pass after Faz 2's runtime-resilience closure.
It targeted the "clone → running" path and every scenario that could
silently break an operator before they ever reach Faz 4.

---

## Scope (what Faz 3 owned)

1. MIGRATION STACK — root-cause fix for the M7 / phase_al_001 /
   product_review_foundation cascading test failures.
2. FIRST-RUN / BOOTSTRAP — empty DB, missing env, schema drift,
   wrong-order execution, initial admin seed.
3. UPGRADE / OLD-DB COMPATIBILITY — operator with a DB at an older
   revision upgrading to head.
4. BACKUP / RESTORE — operator-facing hot snapshot + explicit restore
   with a rollback path.
5. DOC TRUTH ALIGNMENT — eliminate the fake `python -m app.db.seed`
   instructions and document the real bootstrap flow.

---

## 1. Migration stack — root cause + fix

**File:** `backend/alembic/versions/faz13_automation_policy_v2_and_inbox.py`

**Bug:** `upgrade()` ran an `UPDATE automation_policies SET
source_scan_mode = …` statement **before** the corresponding
`batch_op.add_column` calls. On a fresh DB this crashed with
`no such column: source_scan_mode`. On upgrade-from-87a789ff3f45
DBs the same crash mode applied, because the old schema created by
`87a789ff3f45` only had `cp_source_scan`/`status`, not the new names.

**Fix:** reordered `upgrade()` into explicit three steps (ADD → UPDATE
→ DROP) with per-step guards. Each guard consults a `_has_column`
PRAGMA probe so the migration is idempotent across partial re-runs.

**Impact:** resolved 20 cascading test failures in one change.

**Verification:**
- `backend/tests/test_m7_c1_migration_fresh_db.py` — now green
- `backend/tests/test_phase_al_001_approver_migration.py` — now green
- `backend/tests/test_product_review_foundation.py` — now green
- Cross-revision upgrade smoke (see Item 3 below)

---

## 2. First-run / bootstrap

**Tests added:** `backend/tests/test_faz3_first_run_bootstrap.py` (7)

- `test_first_run_alembic_upgrade_head_succeeds` — `alembic upgrade head`
  against an empty `CONTENTHUB_DATA_DIR` exits 0 and produces the DB.
- `test_first_run_schema_has_critical_tables` — fresh schema contains
  `users, settings, jobs, job_steps, publish_records, publish_logs,
  templates, style_blueprints, news_sources, news_items,
  automation_policies, operations_inbox_items, alembic_version`.
- `test_seed_admin_user_creates_initial_admin_on_empty_db` — `seed_admin_user`
  creates exactly one `admin@contenthub.local` row on empty `users`.
- `test_seed_admin_user_is_idempotent` — double-seed does not duplicate.
- `test_seed_admin_user_backfills_null_password_hash` — phase_ac drift
  recovery path is exercised against a real drifted row.
- `test_seed_known_settings_populates_empty_registry` — `KNOWN_SETTINGS`
  lands on empty `settings`.
- `test_seed_known_settings_is_idempotent` — second pass returns 0.

**Operator script hardening:** `start.sh`

- Added `.env` missing warning block.
- Added empty-`CONTENTHUB_JWT_SECRET` warning (grep against `.env`) so
  operators know the insecure dev fallback is in play.
- Pre-existing behavior kept: refuses to boot if `alembic upgrade head`
  fails; refuses to boot if venv or node is missing.

---

## 3. Upgrade / old-DB compatibility

**Tests added:** `backend/tests/test_faz3_upgrade_compatibility.py` (4)

- `test_upgrade_from_initial_foundation_reaches_head` — stages the DB
  at the earliest revision (`e7dc18c0bcfb`) and runs `upgrade head`
  through the full chain.
- `test_upgrade_across_faz13_boundary_is_safe` — stages the DB at
  `87a789ff3f45` (OLD automation_policies shape) and upgrades to head,
  regression-guarding the root cause fixed in Item 1.
- `test_double_upgrade_head_is_noop` — `start.sh` runs `upgrade head`
  on every boot; test guarantees the second pass does not change
  revision or error.
- `test_alembic_current_reports_single_head_after_upgrade` — guards
  against branched history / stamp drift after upgrade.

---

## 4. Backup / restore truth

**Library:** `backend/app/db/backup.py`
**CLIs:** `backend/scripts/backup_db.py`, `backend/scripts/restore_db.py`
**Tests:** `backend/tests/test_faz3_backup_restore.py` (7)

Design choices (documented in the module docstring):
- Uses SQLite's online backup API (safe while backend is running).
- Snapshots are plain SQLite files — any tool can read them.
- Restore refuses without `--confirm`; moves the previous DB + WAL/SHM
  sidecars aside to `.replaced_<timestamp>` so the operator has a
  manual rollback path.
- Honest limitations: no automatic schedule, no off-machine push, no
  compression, no hot-swap restore (backend must be stopped).

CLI smoke test exercises both scripts end-to-end and the safety gate.

---

## 5. Doc truth alignment

Removed the fake `python -m app.db.seed` instruction (the module does
not exist — seeding runs automatically inside the backend lifespan
handler) from:

- `docs/RUNTIME_AND_STORAGE_POLICY.md` — rewrote "Fresh setup flow"
  and "Clone & First-Run Checklist" to reflect reality, plus added a
  "Backup & Restore" section with the actual CLI commands.
- `docs/operator-guide.md` — removed the fake seed command, added the
  Faz 3 backup/restore commands.
- `USER_GUIDE.md` (root) — rewrote the first-run setup block.
- `README.md` — rewrote the Hizli Baslangic block.

Documented initial admin credentials (`admin@contenthub.local` /
`admin123`) with an explicit "change immediately" reminder.

---

## Final verdict

All five Faz 3 items closed with tests. Full backend suite continues
to pass after the migration ordering fix. Faz 4 (final MVP acceptance
gate) can proceed.
