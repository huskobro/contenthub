# M10 Wired vs Deferred Settings Inventory

Generated: 2026-04-05 (Updated: Closure Audit)

---

## Truly Wired Settings (Runtime Effect Verified — 7)

| Key | Group | Type | Builtin Default | Wired To |
|---|---|---|---|---|
| credential.kie_ai_api_key | credentials | secret | — | LLM provider (KieAiProvider) — startup + runtime reinit |
| credential.openai_api_key | credentials | secret | — | LLM fallback provider (OpenAICompatProvider) — startup + runtime reinit |
| credential.pexels_api_key | credentials | secret | — | Visuals provider (PexelsProvider) — startup + runtime reinit |
| credential.pixabay_api_key | credentials | secret | — | Visuals fallback provider (PixabayProvider) — startup + runtime reinit |
| credential.youtube_client_id | credentials | secret | — | YouTube OAuth auth-url + token exchange |
| credential.youtube_client_secret | credentials | secret | — | YouTube OAuth token exchange |
| provider.llm.openai_model | providers | string | gpt-4o-mini | main.py startup + credential_wiring factory — resolve() ile okunuyor |

---

## Defined But NOT Runtime-Wired Settings (12)

These settings are defined in KNOWN_SETTINGS, seeded to DB, visible in UI, and editable — BUT the provider code does NOT read them from the resolver. Providers use their own hardcoded defaults. Changing the admin_value in the UI will NOT take effect until the provider code is updated to read from resolve().

| Key | Group | Type | Builtin Default | Status |
|---|---|---|---|---|
| provider.llm.kie_model | providers | string | gemini-2.5-flash | DEFINED — KieAiProvider kendi default'unu kullaniyor |
| provider.llm.kie_temperature | providers | float | 0.7 | DEFINED — KieAiProvider kendi default'unu kullaniyor |
| provider.llm.openai_temperature | providers | float | 0.7 | DEFINED — OpenAICompatProvider kendi default'unu kullaniyor |
| provider.llm.timeout_seconds | providers | float | 60.0 | DEFINED — _openai_compat_base.py kendi default'unu kullaniyor |
| provider.tts.edge_default_voice | providers | string | tr-TR-AhmetNeural | DEFINED — EdgeTTSProvider kendi _VARSAYILAN_SES kullaniyor |
| provider.visuals.pexels_default_count | providers | integer | 5 | DEFINED — PexelsProvider kendi default'unu kullaniyor |
| provider.visuals.pixabay_default_count | providers | integer | 5 | DEFINED — PixabayProvider kendi default'unu kullaniyor |
| provider.visuals.search_timeout_seconds | providers | float | 30.0 | DEFINED — Pexels/Pixabay kendi timeout kullaniyor |
| provider.whisper.model_size | providers | string | base | DEFINED — LocalWhisperProvider henuz aktif degil |
| execution.render_still_timeout_seconds | execution | integer | 120 | DEFINED — render_still.py kendi sabitini kullaniyor |
| source_scans.soft_dedupe_threshold | source_scans | float | 0.65 | DEFINED — dedupe_service kendi degerini kullaniyor |
| publish.youtube.upload_timeout_seconds | publish | float | 60.0 | DEFINED — YouTubeAdapter kendi degerini kullaniyor |

---

## Wiring Verification Summary

| Verification Point | Status |
|---|---|
| Credential keys → provider reinit on save | Verified via test_save_credential_returns_wiring_info |
| Startup reads DB → .env → builtin chain | Verified via main.py lifespan + test_resolve_* |
| Settings seed at startup (idempotent) | Verified via test_seed_creates_rows, test_seed_idempotent |
| Effective API returns correct sources | Verified via test_list_effective_endpoint, test_get_effective_single |
| Admin value update persists and reflects | Verified via test_put_effective_updates_admin_value |
| Type coercion for all 6 types | Verified via TestTypeCoercion (9 unit tests) |
| Secret masking in explain() | Verified via test_explain_secret_masks_value |
| Frontend badges (WIRED/DEFERRED, source) | Verified via m10-effective-settings.smoke.test.tsx (13 tests) |
| KNOWN_SETTINGS wired:true/false accuracy | Audited and corrected — only 7/19 truly wired |

---

## Group Summary

| Group | Label | Total | Truly Wired | Defined Only |
|---|---|---|---|---|
| credentials | Kimlik Bilgileri | 6 | 6 | 0 |
| providers | Provider Ayarlari | 10 | 1 | 9 |
| execution | Calisma Ortami | 1 | 0 | 1 |
| source_scans | Kaynak Tarama | 1 | 0 | 1 |
| publish | Yayin Ayarlari | 1 | 0 | 1 |
| **Total** | | **19** | **7** | **12** |
