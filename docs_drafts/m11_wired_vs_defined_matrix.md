# M11 Wired vs Defined Settings Matrix

## Summary

- Total KNOWN_SETTINGS: 19
- Wired to runtime consumer: 16
- Defined but not yet wired: 3

## Wired Settings (16)

| Setting Key | Runtime Consumer |
|---|---|
| `credential.kie_ai_api_key` | `KieAiProvider(api_key=...)` |
| `credential.openai_api_key` | `OpenAICompatProvider(api_key=...)` |
| `credential.pexels_api_key` | `PexelsProvider(api_key=...)` |
| `credential.pixabay_api_key` | `PixabayProvider(api_key=...)` |
| `provider.llm.kie_model` | `KieAiProvider(model=...)` |
| `provider.llm.kie_temperature` | `KieAiProvider(temperature=...)` |
| `provider.llm.openai_model` | `OpenAICompatProvider(model=...)` |
| `provider.llm.openai_temperature` | `OpenAICompatProvider(temperature=...)` |
| `provider.llm.timeout_seconds` | `KieAiProvider(timeout=...)` and `OpenAICompatProvider(timeout=...)` |
| `provider.tts.edge_default_voice` | `EdgeTTSProvider(default_voice=...)` |
| `provider.visuals.pexels_default_count` | `PexelsProvider(default_count=...)` |
| `provider.visuals.pixabay_default_count` | `PixabayProvider(default_count=...)` |
| `provider.visuals.search_timeout_seconds` | `PexelsProvider(search_timeout=...)` and `PixabayProvider(search_timeout=...)` |
| `credential.youtube_client_id` | YouTube OAuth flow |
| `credential.youtube_client_secret` | YouTube OAuth flow |
| `source_scans.soft_dedupe_threshold` | `scan_engine` -> `dedupe_service` |

## Not Wired Settings (3)

| Setting Key | Reason |
|---|---|
| `provider.tts.whisper.model_size` | Whisper provider not yet implemented in the codebase |
| `provider.render.render_still_timeout` | Remotion executor uses its own internal constant; not yet reading from settings |
| `provider.publish.youtube.upload_timeout` | YouTube adapter uses its own internal constant; not yet reading from settings |

## Notes

- All `wired` flags in KNOWN_SETTINGS now match the actual runtime state. No false claims.
- The 3 unwired settings are honest about their status: they are defined in the registry for future use but have no runtime consumer today.
- Wiring the remaining 3 requires either implementing the missing provider (Whisper) or refactoring the relevant executor/adapter to read timeouts from the settings resolver instead of using hardcoded constants.
