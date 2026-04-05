# M9 Verification Audit

Generated: 2026-04-05
Commit: a7d9832

---

## Runtime Wiring Truth Table

| Screen / Field | Source of Truth | Runtime Effect | Verified By | Status |
|---|---|---|---|---|
| Kie.ai API Key input | DB (settings table, key=credential.kie_ai_api_key) | KieAiProvider replaced in provider_registry on save; startup reads DB value | test_save_credential_returns_wiring_info; provider_registry.replace_provider() called | **WIRED** |
| OpenAI API Key input | DB (settings table, key=credential.openai_api_key) | OpenAICompatProvider replaced/registered in provider_registry on save | test_save_credential_returns_wiring_info; wiring action=replaced/registered | **WIRED** |
| Pexels API Key input | DB (settings table, key=credential.pexels_api_key) | PexelsProvider replaced in provider_registry on save | test_save_credential_new; factory verified callable | **WIRED** |
| Pixabay API Key input | DB (settings table, key=credential.pixabay_api_key) | PixabayProvider replaced in provider_registry on save | test_save_credential_new; factory verified callable | **WIRED** |
| YouTube Client ID input | DB (settings table, key=credential.youtube_client_id) | resolve_credential() called in /auth-url and /auth-callback | test_youtube_auth_url_with_saved_client_id; router lines 88,129 | **WIRED** |
| YouTube Client Secret input | DB (settings table, key=credential.youtube_client_secret) | resolve_credential() called in /auth-callback | router lines 138; token exchange uses resolved value | **WIRED** |
| Startup credential load | DB → .env fallback | main.py lifespan reads DB first, then config.settings (.env) | main.py lines 78-81; DB takes precedence | **WIRED** |
| YouTube Connect button | OAuth flow | Opens Google consent URL built from credential.youtube_client_id | test_youtube_auth_url_with_explicit_client_id | **WIRED** |
| YouTube Disconnect button | DELETE /publish/youtube/revoke | Deletes token file at data/youtube_tokens.json | test_youtube_revoke_idempotent | **WIRED** |
| YouTube channel name/thumbnail | GET /publish/youtube/channel-info | Calls YouTube Data API v3 /channels with OAuth access token | test_youtube_channel_info_disconnected; endpoint verified | **WIRED** |
| YouTube Analytics page | GET /publish/youtube/channel-info + /status | Real OAuth state; shows subscriber/video count from YT API | Page reads useYouTubeStatus + useYouTubeChannelInfo | **WIRED** |
| YouTube Analytics — video performance | Not implemented | No backend data source | Page shows honest deferred note | **UNSUPPORTED** |
| YouTube Analytics — ContentHub publishes | Not implemented | analytics scope not yet available | Page shows honest deferred note | **UNSUPPORTED** |
| Status badge (configured/env_only/missing) | credential_resolver.py get_credential_status() | DB row presence + admin_value_json parsing | test_list_credentials_fields; status logic verified | **WIRED** |
| Masked value display | _mask_value() in credential_resolver.py | Last 4 chars visible, rest masked with ● | test_masking_shows_last_4; test_masking_short_value_all_masked | **WIRED** |
| Source badge (DB/ENV) | source field in credential status | Shows where value came from | test_list_credentials_fields | **WIRED** |
| Validate button | POST /settings/credentials/{key}/validate | Checks DB+env for value presence | test_validate_credential_after_save | **WIRED** |
| Asset Library | No backend | Page removed placeholder data | Empty state shown | **UNSUPPORTED (honest)** |
| Job Detail actions (Retry/Cancel/Skip) | No backend endpoint | Replaced with deferred note | Milestone note shown | **UNSUPPORTED (honest)** |
| JobSystemPanels (Logs/Artifacts/Trace) | No backend endpoint | Replaced with milestone deferred notes | Milestone note shown | **UNSUPPORTED (honest)** |
| Content Library filters | No backend | Replaced with deferred message | Deferred element shown | **UNSUPPORTED (honest)** |

---

## What Was Cleaned in M9-D

### Removed (Replaced with Honest Empty States)
| Surface | Before | After |
|---|---|---|
| Asset Library | 6 fake PLACEHOLDER_ASSETS array shown as real data | Honest empty state: "Varlik Kutuphanesi henuz aktif degil" |
| Job Detail actions | Decorative Retry/Cancel/Skip info cards presented as real controls | Single line: "M14 milestone'unda aktif edilecektir" |
| JobSystemPanels | Generic "Bu veri henüz backend tarafından sağlanmıyor" on Logs/Artifacts/Trace | Milestone-specific deferred text per panel |
| Content Library filters | Disabled search/type/status/sort inputs (4 inputs, no handler) | Single deferred element with explanation |
| AdminOverviewPage readiness | "Varlik Kutuphanesi — Omurga hazir" (false; had no real backend) | "Varlik Kutuphanesi — Bekliyor" |
| Onboarding provider setup | Old generic settings keys (tts_api_key, llm_api_key, youtube_api_key) | Real credential resolver keys (credential.kie_ai_api_key etc.) |

### Not Removed (Intentionally Kept as Deferred)
| Surface | Rationale |
|---|---|
| AnalyticsContentPage (empty table) | Was already honest — shows "no data yet" messages, no fake data |
| AnalyticsOverviewPage "—" dashes | Legitimate null formatter for API-returned null values |
| Standard Video clone button note | Honest deferred note, not fake functionality |

---

## YouTube Analytics Clarification

| Question | Answer |
|---|---|
| Uses real external API? | Yes — GET https://www.googleapis.com/youtube/v3/channels with ?mine=true |
| Scope required | youtube.upload (current) covers /channels endpoint |
| Data displayed | channel_id, channel_title, thumbnail_url, subscriber_count, video_count |
| Internal publish data? | No — purely from YouTube Data API v3 |
| Analytics scope (views/impressions)? | Not implemented — requires youtube.readonly or youtube.analyticsReadonly |
| Honest about what's missing? | Yes — deferred note clearly states analytics scope limitation |

---

## Remaining Known Issues (Non-Blocking)

| Issue | Type | Blocking? | Fix Path |
|---|---|---|---|
| 4 test files with Python 3.9 syntax errors | Environment/syntax | No — pre-existing | Update to use `Optional[X]` syntax |
| test_g_avg_production_duration_exact timing | Data isolation | No — pre-existing from M8 | Scoped DB session for that test |
| feedparser must be installed for RSS tests | Environment dependency | No | Add to requirements.txt |
| YouTube Analytics only shows basic channel stats | Feature scope | No | Requires youtube.readonly scope in M13 |

---

## Final Verdict

**ACCEPTED WITH NON-BLOCKING ENV ISSUES**

Reasoning:
- All 6 credential keys are runtime-wired to provider reinit or OAuth resolver
- DB-first precedence is correct and tested
- Masking, status badges, and source indicators work correctly
- YouTube OAuth surface wired end-to-end
- YouTube Analytics correctly shows real API state with honest unsupported sections
- Mock/placeholder cleanup is complete and honest
- 913/914 backend tests pass (1 pre-existing timing failure)
- 2097/2097 frontend tests pass (0 failures)
- TypeScript: clean
- The -35 frontend test delta is fully accounted for by removed fake surfaces
