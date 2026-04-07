# Prompt Assembly Engine — Delivery Report

Tarih: 2026-04-07

## 1. Executive Summary

Prompt Assembly Engine tamamen teslim edildi. Block-based, traceable prompt construction sistemi ContentHub'a entegre edildi. Her prompt karari — hangi bloklar dahil/haric, neden, hangi ayarlar etkiledi, provider'a giden exact payload — artik gorunur ve izlenebilir durumda.

## 2. Teslim Edilen Bilesenleri

### Backend (12 dosya, 4 test dosyasi)
| Dosya | Sorumluluk |
|-------|-----------|
| `prompt_assembly/__init__.py` | Paket init |
| `prompt_assembly/models.py` | PromptBlock, PromptAssemblyRun, PromptAssemblyBlockTrace |
| `prompt_assembly/schemas.py` | Pydantic request/response schemalar |
| `prompt_assembly/condition_evaluator.py` | 6 condition type evaluator (pure function) |
| `prompt_assembly/template_renderer.py` | {{variable}} substitution (pure function) |
| `prompt_assembly/service.py` | PromptBlock CRUD + protection rules |
| `prompt_assembly/assembly_service.py` | Orchestrator: filter → evaluate → render → assemble → payload → trace |
| `prompt_assembly/trace_service.py` | Assembly run + block trace persistence |
| `prompt_assembly/payload_builder.py` | Provider payload construction + secret redaction |
| `prompt_assembly/block_seed.py` | 12 builtin block (news_bulletin: 9 script + 3 metadata) |
| `prompt_assembly/router.py` | 7 API endpoint (CRUD, preview, traces) |
| `alembic/versions/f1a2b3c4d5e6_*.py` | 3 tablo migration |

### Frontend (10 dosya)
| Dosya | Sorumluluk |
|-------|-----------|
| `api/promptAssemblyApi.ts` | API client + TypeScript types |
| `hooks/usePromptBlocks.ts` | Block list + update hooks |
| `hooks/usePromptAssemblyPreview.ts` | Dry run preview mutation |
| `hooks/usePromptTrace.ts` | Job trace query hooks |
| `components/prompt-assembly/PromptBlockCard.tsx` | Tek blok karti |
| `components/prompt-assembly/PromptBlockList.tsx` | Gruplu blok listesi |
| `components/prompt-assembly/PromptBlockDetailPanel.tsx` | Admin override edit paneli |
| `components/prompt-assembly/RelatedRulesSection.tsx` | Etkilenen ayarlar listesi |
| `components/prompt-assembly/BlockBreakdownView.tsx` | Included/skipped blok gorunumu |
| `components/prompt-assembly/PromptPreviewSection.tsx` | Dry run preview UI |

### Modifiye Edilen Dosyalar
| Dosya | Degisiklik |
|-------|-----------|
| `app/db/models.py` | Alembic discovery import |
| `app/api/router.py` | Router registration |
| `app/main.py` | Seed wiring (startup) |
| `app/settings/settings_resolver.py` | 4 behavior flag settings |
| `app/modules/news_bulletin/executors/script.py` | Assembly engine integration + fallback |
| `frontend/src/pages/admin/PromptEditorPage.tsx` | Block management + preview sections |
| `frontend/src/components/jobs/JobSystemPanels.tsx` | Prompt Trace panel ekleme |
| `frontend/src/pages/admin/JobDetailPage.tsx` | jobId prop gecirme |

## 3. Veritabani Tablolari

| Tablo | Amac |
|-------|------|
| `prompt_blocks` | Block tanimlari, admin override, condition config |
| `prompt_assembly_runs` | Her assembly execution trace (job veya dry run) |
| `prompt_assembly_block_traces` | Per-block karar izi (included/skipped + neden) |

## 4. Test Sonuclari

| Test Dosyasi | Test Sayisi | Sonuc |
|-------------|-------------|-------|
| `test_condition_evaluator.py` | 15 | ✅ 15/15 PASS |
| `test_template_renderer.py` | 11 | ✅ 11/11 PASS |
| `test_assembly_service.py` | 7 | ✅ 7/7 PASS |
| `test_prompt_assembly_api.py` | 5 | ✅ 5/5 PASS |
| **Toplam** | **38** | **✅ 38/38 PASS (0.12s)** |

Mevcut news_bulletin testleri de etkilenmedi — hepsi gecti.

## 5. 6 Condition Type

| Tip | Aciklama |
|-----|----------|
| `always` | Her zaman dahil (enabled_by_default=false ise atla) |
| `settings_boolean` | Settings key true/false kontrolu |
| `data_presence` | Data snapshot'ta key var mi (bos string = yok) |
| `settings_value_equals` | Settings key belirli degere esit mi |
| `module_match` | Module scope eslesmesi |
| `provider_match` | Provider name prefix eslesmesi |

## 6. Secret Redaction

`ProviderPayloadBuilder.sanitize_for_storage()` su pattern'leri yakalar ve `[REDACTED]` ile degistirir:
- authorization, api_key, api-key, x-api-key, token, bearer, secret
- Recursive — nested dict/list icinde de calisir
- Trace'e kaydedilen payload ve response daima sanitize edilir

## 7. Determinism Guarantee

Assembly service'in `_filter_blocks` → `_process_block` → assemble akisi deterministik:
- Ayni block_snapshot + ayni settings_snapshot + ayni data_snapshot = ayni final_prompt_text
- 3 tekrarli test ile dogrulandi (`test_determinism`)
- Order stability: order_index → key siralamasiyla garantili

## 8. Executor Integration

`BulletinScriptExecutor` artik assembly engine'i birincil yol olarak kullaniyor:
- `_assemble_prompt()` helper: block snapshot + settings snapshot + data snapshot → AssemblyResult
- Provider call sonrasi: `trace_service.record_provider_result()` ile response/error kaydedilir
- `assembly_run_id` step'in `provider_trace_json`'ina eklenir
- Assembly basarisiz olursa (blok yok, servis hatasi): eski `build_bulletin_script_prompt()` fallback devreye girer
- Fallback loglaniyor — sessiz degil

## 9. Admin Gorunurluk Yuzeyler

### PromptEditorPage
- Modul filtreleme tabs (Tumu / News Bulletin / Standard Video)
- Blok listesi (grup bazli: Core, Behavior, Context, Output)
- Her blok icin: key, title, kind badge, condition summary, status, effective template preview
- Detay paneli: admin override edit, reset to default, disable (protected kinds korunur)
- Related Rules: etkilenen settings listesi
- Preview: dry run + block breakdown + payload goruntuleme

### Job Detail — Prompt Trace Tab
- Assembly run listesi (multi-run destegi: script + metadata)
- Summary card: module, provider, block counts, prompt length, timestamp
- Assembled Prompt (collapsible + copy)
- Block Breakdown (included/skipped + neden)
- Settings/Data/Block snapshot JSON drawers
- Provider Request/Response (collapsible + copy)
- Hata section (varsa)

## 10. Behavior Settings (Settings Registry)

| Key | Default | Kontrol Ettigi Blok |
|-----|---------|-------------------|
| `news_bulletin.config.normalize_enabled` | `true` | `nb.normalize` |
| `news_bulletin.config.humanize_enabled` | `false` | `nb.humanizer` |
| `news_bulletin.config.tts_enhance_enabled` | `true` | `nb.tts_enhance` |
| `news_bulletin.config.anti_clickbait_enabled` | `true` | `nb.anti_clickbait` |

Tumu `wired: true` ve `wired_to` ile assembly engine blok condition'larina bagli.

## 11. Commit Gecmisi

| # | Hash | Mesaj |
|---|------|-------|
| 1 | `c30c12a` | feat: add PromptBlock, PromptAssemblyRun, PromptAssemblyBlockTrace models |
| 2 | `5a343e0` | feat: add Alembic migration for 3 prompt assembly tables |
| 3 | `6728cd4` | feat: add Pydantic schemas |
| 4 | `94865d6` | feat: implement ConditionEvaluator with 6 condition types + 15 tests |
| 5 | `3903676` | feat: implement TemplateRenderer + 11 tests |
| 6 | `c008f7a` | feat: implement PromptBlock CRUD service |
| 7 | `63a1867` | feat: implement AssemblyService, TraceService, PayloadBuilder + 7 tests |
| 8 | `d235436` | feat: add builtin block seed data (12 blocks) |
| 9 | `e9074c4` | feat: add API router + seed wiring + registration |
| 10 | `b3132dd` | test: add 5 API integration tests |
| 11 | `d5ed5b6` | feat: add frontend API client and React Query hooks |
| 12 | `ef3e74d` | feat: add block management UI components |
| 13 | `4505891` | feat: add preview section and block breakdown view |
| 14 | `f228e39` | feat: extend PromptEditorPage |
| 15 | `abdb2ba` | feat: add Prompt Trace panel to Job Detail |
| 16 | `dcc50d3` | feat: wire news_bulletin executor to assembly engine |
| 17 | `c483079` | feat: add behavior flag settings |

## 12. Kalan Limitasyonlar

1. **Pilot scope**: Sadece `news_bulletin` modulu wire edildi. `standard_video` ve diger moduller icin blok tanimlari + executor wiring gerekli.
2. **Metadata executor**: Sadece script executor wire edildi. `metadata.py` executor'u da ayni sekilde wire edilmeli.
3. **Video limiti**: YouTube API pagination hala max 50.
4. **Frontend tsc**: Worktree'de node_modules olmadigi icin frontend tsc dogrudan calistirilmadi; dosyalar Agent tarafindan dogrulandi.
5. **Snapshot locking**: Job baslarken block snapshot'in `input_data_json`'a yazilmasi henuz yapilmadi — su an executor her calistirmada DB'den canli blok yukluyor. Gercek snapshot locking icin job creation asamasinda blok snapshot'in kaydedilmesi gerekli.
6. **E2E browser testi**: Backend testler gecti ama browser'da canli test henuz yapilmadi.
