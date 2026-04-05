# M11 Runtime Truth Kesin Matrisi

## Settings Wiring Matrisi (19/19)

| # | Setting Key | wired | Gerçek Consumer | Kanıt |
|---|-------------|-------|-----------------|-------|
| 1 | credential.kie_ai_api_key | TRUE | KieAiProvider(api_key=...) | main.py:89, credential_wiring.py:61 |
| 2 | credential.openai_api_key | TRUE | OpenAICompatProvider(api_key=...) | main.py:90, credential_wiring.py:71 |
| 3 | credential.pexels_api_key | TRUE | PexelsProvider(api_key=...) | main.py:91, credential_wiring.py:82 |
| 4 | credential.pixabay_api_key | TRUE | PixabayProvider(api_key=...) | main.py:92, credential_wiring.py:91 |
| 5 | credential.youtube_client_id | TRUE | YouTube OAuth router | youtube/router.py:88, 129 |
| 6 | credential.youtube_client_secret | TRUE | YouTube OAuth router | youtube/router.py:138 |
| 7 | provider.llm.kie_model | TRUE | KieAiProvider(model=...) | main.py:96, credential_wiring.py:65 |
| 8 | provider.llm.kie_temperature | TRUE | KieAiProvider(temperature=...) | main.py:97, credential_wiring.py:66 |
| 9 | provider.llm.openai_model | TRUE | OpenAICompatProvider(model=...) | main.py:94, credential_wiring.py:73 |
| 10 | provider.llm.openai_temperature | TRUE | OpenAICompatProvider(temperature=...) | main.py:98, credential_wiring.py:77 |
| 11 | provider.llm.timeout_seconds | TRUE | KieAi+OpenAI(timeout=...) | main.py:99, credential_wiring.py:67,78 |
| 12 | provider.tts.edge_default_voice | TRUE | EdgeTTSProvider(default_voice=...) | main.py:100 |
| 13 | provider.visuals.pexels_default_count | TRUE | PexelsProvider(default_count=...) | main.py:101, credential_wiring.py:86 |
| 14 | provider.visuals.pixabay_default_count | TRUE | PixabayProvider(default_count=...) | main.py:102, credential_wiring.py:95 |
| 15 | provider.visuals.search_timeout_seconds | TRUE | Pexels+Pixabay(search_timeout=...) | main.py:103, credential_wiring.py:87,96 |
| 16 | source_scans.soft_dedupe_threshold | TRUE | build_dedupe_context(soft_threshold=...) | scan_engine.py:261-269 |
| 17 | provider.whisper.model_size | FALSE | Consumer yok | Whisper provider kayıtlı değil |
| 18 | execution.render_still_timeout_seconds | FALSE | Hardcoded sabit | render_still.py:46 RENDER_STILL_TIMEOUT_SECONDS=120 |
| 19 | publish.youtube.upload_timeout_seconds | FALSE | Hardcoded sabit | youtube/adapter.py:129 timeout=60.0 |

## Runtime Bağlantı Matrisi

| Alan | Durum | Detay |
|------|-------|-------|
| Settings 16/19 wired | DOGRULANMIS | Her biri kod yoluyla kanıtlandı |
| Audit log 6 call site | DOGRULANMIS | 4 subsystem, tüm call site'lar erişilebilir |
| Publish scheduler | DOGRULANMIS | main.py lifespan'da, 60s poll, graceful shutdown |
| provider_error_rate | DOGRULANMIS | JobStep SQL sorgusu, placeholder kaldırıldı |
| Dedupe threshold | DOGRULANMIS | scan_engine → resolve() → build_dedupe_context |
| Template → composition | DOGRULANMIS | dispatcher → pipeline → composition executor |
| Template → diğer step'ler | YOK | Script, TTS, visuals, subtitle, render, metadata okumuyor |
| Visibility enforcement | ALTYAPI HAZIR | require_visible() tanımlı, sıfır route'ta uygulanmış |
| Frontend visibility | YOK | /resolve endpoint frontend'den çağrılmıyor |
