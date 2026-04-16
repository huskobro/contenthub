# PHASE AI — Silent Truth Fix Pack — Closure

**Status:** Complete
**Scope:** Backend runtime truth + credential write-path + operator honesty.
**Outcome:** 6/6 silent truth bugs from `CODE_AUDIT_REPORT.md` closed with tests.

---

## Problem Statement

`CODE_AUDIT_REPORT.md` (Turkish copy: `CODE_AUDIT_REPORT_TR.md`) identified a
class of "silent truth" bugs where the admin panel reported success but the
runtime did not change, or where placeholder credentials were accepted as if
they were valid keys. Every bug on the list lied to the operator in some way.

Phase AI's charter was narrow: **close the user-deceiving bugs first**, no
re-scoping, no parallel architecture, no AG/AH reopening.

---

## Bugs Closed

### 1. Provider factories ignored DB settings

**Symptom:** Admin saved `provider.llm.kie_model = "gemini-pro-latest"` via
`/admin/settings`. UI toasted "Kaydedildi". The next job still used
`gemini-2.5-flash` because `credential_wiring.py::_make_*_provider` read
settings via `_get_builtin()` directly, bypassing `settings_resolver.resolve()`.

**Fix (`backend/app/settings/credential_wiring.py`):**
- All five factories (`_make_kie_ai_provider`, `_make_openai_compat_provider`,
  `_make_pexels_provider`, `_make_pixabay_provider`, `_make_dubvoice_provider`)
  are now `async` and accept `db: Optional[AsyncSession] = None`.
- New helper `_resolve_or_builtin(key, db, fallback)` consults the full chain
  (DB admin_value → DB default → .env → builtin → fallback) when `db` is
  provided, falling back to the builtin registry only when no DB session is
  available (legacy in-process callers, tests).
- `reinitialize_provider_for_credential(key, value, db=None)` threads `db`
  into the factory call.

**Fix (`backend/app/settings/router.py`):**
- Both call sites (`PUT /settings/credentials/{key}` at line 173 and
  `PUT /settings/effective/{key}` credential branch at line 283) now pass
  `db=db` so factories actually receive a session.

**Test (`backend/tests/test_phase_ai_credential_wiring.py`):**
- `test_kie_factory_reads_admin_override_from_db` upserts
  `provider.llm.kie_model=gemini-custom-admin-override` and asserts
  `_resolve_or_builtin` returns the override (not the builtin). This is the
  proof-of-truth test for the whole phase.

### 2. DubVoice write path rejected the key

**Symptom:** DubVoice was registered in `credential_wiring._CREDENTIAL_PROVIDER_MAP`
but absent from `credential_resolver.CREDENTIAL_KEYS`. Attempting to save
`credential.dubvoice_api_key` from the admin panel raised `ValueError` →
HTTP 400. Operator saw a generic error, not a clear "unknown key" message.

**Fix (`backend/app/settings/credential_resolver.py`):**
Added `credential.dubvoice_api_key` with:
- `env_var: "CONTENTHUB_DUBVOICE_API_KEY"`
- `label: "DubVoice API Key"`
- `group: "ai_providers"`, `capability: "tts"`

**Tests:**
- `test_phase_ai_dubvoice_key_is_savable` (API round-trip via PUT + GET)
- `test_phase_ai_dubvoice_in_list` (read-path symmetry)
- `test_reinitialize_provider_registered_for_dubvoice` (factory unit test)
- Added `credential.dubvoice_api_key` to `KNOWN_KEYS` in the existing
  `test_list_credentials_returns_all_known` parametrization.

### 3. `module.product_review.enabled` unmanageable

**Symptom:** `product_review` module is registered at lifespan startup
(`conftest.py` + main.py) but `KNOWN_SETTINGS` only had toggle entries for
`standard_video` and `news_bulletin`. The Settings page therefore could not
show a product_review toggle row.

**Fix (`backend/app/settings/settings_resolver.py` @ 2127):**
Added `module.product_review.enabled` with `module_scope: "product_review"`
and `builtin_default: True`, mirroring the shape of the other two module
toggle settings.

**Test:** `test_phase_ai_product_review_module_toggle_resolvable` asserts
`GET /settings/effective/module.product_review.enabled` returns the entry
with `effective_value: true` and the correct module_scope.

### 4. Publish scheduler interval hardcoded to 60s

**Symptom:** `backend/app/main.py:354` called
`poll_scheduled_publishes(AsyncSessionLocal, interval=60, …)` with a literal.
No KNOWN_SETTINGS entry existed. Admins had no knob to change it.

**Fix (`backend/app/settings/settings_resolver.py`):**
Added `publish.scheduler.interval_seconds` (group `publish`, type `float`,
builtin 60.0, wired_to `main.py lifespan`).

**Fix (`backend/app/main.py`):**
Mirrored the auto-scan scheduler pattern — open a short-lived
`AsyncSessionLocal()`, `await resolve("publish.scheduler.interval_seconds")`,
pass the result into `poll_scheduled_publishes`. The setting is read ONCE at
startup (not live-reload); log line makes this explicit:
`"Publish scheduler task created (interval=%ss, restart-reload)."`

**Test:** `test_phase_ai_publish_scheduler_interval_setting_exists` asserts
the setting is discoverable via the effective endpoint and builtin is 60.0.

### 5. OpenAI placeholder silently dropped

**Symptom:** Startup drop for `{"abc", "sk-test-key-123", "placeholder", ""}`
was OK (best-effort boot log), but the **write path** — user pasting "abc"
into the OpenAI row on `/admin/settings/credentials` — used to succeed
because `save_credential()` accepted any string. UI toasted "Kaydedildi"
while effectively nothing useful was saved.

**Fix (`backend/app/settings/credential_resolver.py`):**
- Added `PlaceholderCredentialError` + `is_placeholder_credential()` +
  `PLACEHOLDER_CREDENTIAL_VALUES` frozenset (shared source of truth with
  `credential_wiring`).
- `save_credential()` now runs the normalize → placeholder check early. On
  placeholder it raises `ValueError` with an honest message, which the router
  already maps to HTTP 400 with that message in the body.

**Tests (`test_m9_credentials_api.py`):**
- `test_phase_ai_placeholder_rejected_with_400` parametrizes all known
  placeholder values (including whitespace-only) and asserts 400 + message
  containing "placeholder" or "bos".
- Updated existing `test_masking_short_value_all_masked` — the old test used
  `"abc"` as a valid short value, now uses `"zxcv"` (4 chars, non-placeholder).

### 6. "Dogrula" / Test Connection lied about live testing

**Symptom:** `POST /settings/credentials/{key}/validate` only checked whether
a value existed in DB/env. UI toasted a green "Valid" for expired, revoked,
or simply wrong keys. Operators trusted the Valid badge.

**Fix (`backend/app/settings/router.py`):**
Response shape now includes `live_tested: false` explicitly and a message
that tells the user in plain Turkish: "Provider'a canli istek atilmadi —
gercek dogrulama icin ilgili modulu kullanin."

**Fix (`frontend/src/api/credentialsApi.ts`):**
`ValidateCredentialResponse` interface exported with the new `live_tested`
field for consumers to react to.

**Fix (`frontend/src/components/settings/ApiKeyField.tsx`):**
Feedback state now supports an `"info"` variant. Logic:
- `valid=false` → error (red)
- `valid=true, live_tested=true` → success (green) — reserved for future
  real per-provider ping
- `valid=true, live_tested=false` → info (neutral, italic) — "kayit
  dogrulandi, canli test yapilmadi"

This is an **honesty relabel**, not a live ping. A future phase can add real
per-provider probes without changing the API contract (`live_tested` flips
to `true` when a probe succeeds).

**Tests:**
- `test_phase_ai_validate_honest_response_shape` asserts `live_tested: false`
  is present and the message mentions "canli".
- `test_phase_ai_validate_missing_credential_is_honest` covers the 404-ish
  miss case.

---

## Files Changed

### Backend
- `backend/app/settings/credential_wiring.py` — async factories + resolver helper
- `backend/app/settings/credential_resolver.py` — DubVoice + placeholder guard
- `backend/app/settings/router.py` — `db=db` threading + honest validate
- `backend/app/settings/settings_resolver.py` — product_review + scheduler interval
- `backend/app/main.py` — publish scheduler interval resolution
- `backend/tests/test_m9_credentials_api.py` — 6 new tests + 1 update
- `backend/tests/test_tts_faz1_foundation.py` — async factory fixture fix
- `backend/tests/test_phase_ai_credential_wiring.py` — **new** 18-test unit file

### Frontend
- `frontend/src/api/credentialsApi.ts` — ValidateCredentialResponse type
- `frontend/src/components/settings/ApiKeyField.tsx` — info variant + honest feedback

### Docs
- `docs/phase-ai-silent-truth-fix-closure.md` — this file

---

## Test Results

### Backend
```
$ backend/.venv/bin/python3 -m pytest tests/ -q
2432 passed, 1 warning in ~100s
```

No regressions. Pre-existing `RuntimeWarning` about an un-awaited coroutine
in `test_m2_c6_dispatcher_integration.py::test_post_jobs_valid_payload_creates_job_and_steps`
is unchanged (not introduced by Phase AI).

### Frontend
```
$ cd frontend && npx tsc --noEmit
EXIT=0

$ cd frontend && npx vitest run
213 files, 208 passed | 4 failed | 1 skipped
2565 tests, 2525 passed | 5 failed | 35 skipped
```

The 5 vitest failures are ALL in canvas/atrium/bridge surface panel-switch and
legacy-fallback tests (`surface-panel-switch-everywhere.smoke.test.tsx`,
`bridge-legacy-fallback.smoke.test.tsx`, `canvas-legacy-fallback.smoke.test.tsx`,
`canvas-workspace-legacy-fallback.smoke.test.tsx`,
`default-surface-strategy.unit.test.ts`). These tests touch zero files that
Phase AI modified — they are pre-existing failures tracked in the
`abundant-munching-raven.md` Phase C (Canvas panel switcher) plan and
unrelated to settings/credentials/provider wiring.

---

## Intentionally NOT Done

- **Live per-provider ping** in `/credentials/{key}/validate`. The audit
  allowed either a real ping OR an honest label; we chose the honest label
  because ping implementations are per-provider (needs OpenAI `/models`,
  Pexels search-with-limit=1, Pixabay quota-only call, DubVoice voice-list,
  Kie.ai chat-completion-with-1-token, etc.) and would expand scope. The
  `live_tested: false` field is in the contract from day one so a later
  phase can flip it true without breaking consumers.

- **Live-reload** for `publish.scheduler.interval_seconds`. The auto-scan
  scheduler reads its interval each tick; the publish scheduler reads once.
  Changing publish interval therefore still requires backend restart. Noted
  explicitly in the log line and the setting's `help_text`.

- **Fixing the 5 pre-existing frontend canvas/panel-switch failures.** Those
  belong to the Canvas surface work described in the plan file, not to silent
  truth. They don't involve any file Phase AI touched.

- **Fixing `CODE_AUDIT_REPORT.md` typos flagged during discovery.** The audit
  was kept as-is (single-source-of-truth for the phase brief); only the
  Turkish translation `CODE_AUDIT_REPORT_TR.md` was created earlier in this
  session on explicit request.

---

## Risk & Limitations

- **Session-scoped test DB.** `test_engine` is session-scoped, so rows leak
  across tests in the same process. The new `test_kie_factory_reads_admin_override_from_db`
  uses upsert (select-or-insert) to tolerate pre-existing rows from other
  tests. If a later test suite depends on the absence of
  `provider.llm.kie_model` in the settings table, it may need to be updated.

- **Placeholder set is shared by value-equality.** `PLACEHOLDER_CREDENTIAL_VALUES`
  lives in `credential_wiring.py` and is imported locally from
  `credential_resolver.save_credential()` to avoid a circular import. Adding
  a new placeholder pattern requires updating only the frozenset.

- **DubVoice env_var rename.** The backend now advertises
  `CONTENTHUB_DUBVOICE_API_KEY` for DubVoice. If operators were previously
  using a different env name (e.g. `DUBVOICE_API_KEY`), they must either
  export with the new name OR — recommended — save through `/admin/settings`
  which persists to DB, winning over .env.

---

## Credential Rotation Notice

During Phase AI implementation the operator pasted a real DubVoice API key
into the chat transcript. Out of caution, **that key was not saved** via chat
(assistant refused to inject credentials through chat for safety reasons) and
the operator was instructed to rotate at DubVoice and re-enter through the
admin UI (`/admin/settings/credentials`), which now works end-to-end thanks
to bug #2 above.
