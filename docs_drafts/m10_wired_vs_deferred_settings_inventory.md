# M10 Wired vs Deferred Settings Inventory

Generated: 2026-04-05

---

## Wired Settings (Runtime Effect Verified)

| Key | Group | Type | Builtin Default | Wired To |
|---|---|---|---|---|
| credential.kie_ai_api_key | credentials | secret | — | LLM provider (KieAiProvider) — startup + runtime reinit |
| credential.openai_api_key | credentials | secret | — | LLM fallback provider (OpenAICompatProvider) — startup + runtime reinit |
| credential.pexels_api_key | credentials | secret | — | Visuals provider (PexelsProvider) — startup + runtime reinit |
| credential.pixabay_api_key | credentials | secret | — | Visuals fallback provider (PixabayProvider) — startup + runtime reinit |
| credential.youtube_client_id | credentials | secret | — | YouTube OAuth auth-url + token exchange |
| credential.youtube_client_secret | credentials | secret | — | YouTube OAuth token exchange |
| provider.llm.kie_model | providers | string | gemini-2.5-flash | KieAiProvider model secimi — startup + runtime reinit |
| provider.llm.kie_temperature | providers | float | 0.7 | KieAiProvider temperature parametresi |
| provider.llm.openai_model | providers | string | gpt-4o-mini | OpenAICompatProvider model secimi — startup + runtime reinit |
| provider.llm.openai_temperature | providers | float | 0.7 | OpenAICompatProvider temperature parametresi |
| provider.llm.timeout_seconds | providers | float | 60.0 | OpenAI compat base HTTP client timeout |
| provider.tts.edge_default_voice | providers | string | tr-TR-AhmetNeural | EdgeTTSProvider varsayilan ses — TTS step |
| provider.visuals.pexels_default_count | providers | integer | 5 | PexelsProvider arama sonuc limiti |
| provider.visuals.pixabay_default_count | providers | integer | 5 | PixabayProvider arama sonuc limiti |
| provider.visuals.search_timeout_seconds | providers | float | 30.0 | Pexels/Pixabay arama HTTP timeout |
| provider.whisper.model_size | providers | string | base | LocalWhisperProvider model yuklemesi |
| execution.render_still_timeout_seconds | execution | integer | 120 | render_still executor timeout parametresi |
| source_scans.soft_dedupe_threshold | source_scans | float | 0.65 | dedupe_service Jaccard similarity threshold |
| publish.youtube.upload_timeout_seconds | publish | float | 60.0 | YouTubeAdapter HTTP client timeout |

**Total: 19 settings, all wired.**

---

## Deferred Settings (Not Yet Wired)

No deferred settings in M10. All 19 defined settings have a documented runtime consumer.

Future milestones may add deferred settings for:
- Multi-language TTS voice maps
- Render composition presets
- Analytics refresh intervals
- Notification preferences

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

---

## Group Summary

| Group | Label | Setting Count | All Wired |
|---|---|---|---|
| credentials | Kimlik Bilgileri | 6 | Yes |
| providers | Provider Ayarlari | 10 | Yes |
| execution | Calisma Ortami | 1 | Yes |
| source_scans | Kaynak Tarama | 1 | Yes |
| publish | Yayin Ayarlari | 1 | Yes |
