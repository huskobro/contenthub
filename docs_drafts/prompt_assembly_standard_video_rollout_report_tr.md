# Standard Video Prompt Assembly Rollout — Rapor (M35)

Tarih: 2026-04-07

## 1. Executive Summary

Standard video modülünün script ve metadata adımları Prompt Assembly Engine'e bağlandı. news_bulletin'de çalışan blok tabanlı, izlenebilir prompt inşa sistemi artık standard_video tarafında da aktif. Her prompt kararı — hangi bloklar dahil edildi/atlandı, neden, hangi ayar etkiledi, provider'a giden exact payload — artık görünür ve kalıcı olarak kaydediliyor.

---

## 2. Tanımlanan Bloklar

### Script Adımı (`step_scope="script"`)

| Key | Kind | Condition | Kontrol Eden Ayar |
|-----|------|-----------|-------------------|
| `sv.script_system` | `core_system` | `always` | — (korumalı) |
| `sv.opening_hooks` | `behavior_block` | `settings_boolean` | `standard_video.config.opening_hooks_enabled` |
| `sv.narrative_arc` | `module_instruction` | `always` | — |
| `sv.humanizer` | `behavior_block` | `settings_boolean` | `standard_video.config.humanize_enabled` |
| `sv.category_guidance` | `context_block` | `data_presence` | `category` verisi varsa |
| `sv.tts_enhance` | `behavior_block` | `settings_boolean` | `standard_video.config.tts_enhance_enabled` |
| `sv.output_contract` | `output_contract` | `always` | — (korumalı) |

### Metadata Adımı (`step_scope="metadata"`)

| Key | Kind | Condition | Kontrol Eden Ayar |
|-----|------|-----------|-------------------|
| `sv.metadata_system` | `core_system` | `always` | — (korumalı) |
| `sv.metadata_seo_rules` | `behavior_block` | `settings_boolean` | `standard_video.config.seo_rules_enabled` |
| `sv.metadata_output_contract` | `output_contract` | `always` | — (korumalı) |

**Toplam:** 10 yeni sv.* blok (7 script + 3 metadata)

Step scope izolasyonu tam: script adımında metadata blokları dahil edilmiyor, tersi de geçerli.

---

## 3. Bağlanan Executor'lar

### `ScriptStepExecutor` (`standard_video/executors/script.py`)

- **PRIMARY**: `PromptAssemblyService.assemble()` — `module_scope="standard_video"`, `step_key="script"`
- **FALLBACK**: `build_script_prompt()` — assembly engine hata verirse devreye girer, loglanır
- data_snapshot: `topic`, `duration_seconds`, `language`, `category`, `tone`, `audience` (+ template_tone/language_rules varsa)
- Provider response assembly trace'e kaydediliyor (`trace_service.record_provider_result`)

### `MetadataStepExecutor` (`standard_video/executors/metadata.py`)

- **PRIMARY**: `PromptAssemblyService.assemble()` — `module_scope="standard_video"`, `step_key="metadata"`
- **FALLBACK**: `build_metadata_prompt()` — aynı fallback mekanizması
- data_snapshot: `script_title`, `script_summary`, `language`, `seo_keywords` (+ template_tone varsa)
- Provider response assembly trace'e kaydediliyor

---

## 4. Taşınan Hardcoded Promptlar

Daha önce `prompt_builder.py`'da inline hardcoded olan iki prompt artık resmi Prompt Block olarak yönetiliyor:

| Eski Konum | Yeni Yönetim |
|-----------|-------------|
| `build_script_prompt()` içindeki fallback system content | `sv.script_system` block — admin override ile değiştirilebilir |
| `build_metadata_prompt()` içindeki fallback system content | `sv.metadata_system` block — admin override ile değiştirilebilir |
| `_SCRIPT_OUTPUT_EXAMPLE` JSON formatı | `sv.output_contract` block |
| `_METADATA_OUTPUT_EXAMPLE` JSON formatı | `sv.metadata_output_contract` block |

`prompt_builder.py` fonksiyonları silinmedi — fallback yolu için korunuyor. Yeni job'larda çağrılmıyor.

---

## 5. Eklenen / Wire Edilen Settings Keys

| Key | Tip | Default | Wired Blok |
|-----|-----|---------|-----------|
| `standard_video.config.opening_hooks_enabled` | boolean | `true` | `sv.opening_hooks` |
| `standard_video.config.humanize_enabled` | boolean | `false` | `sv.humanizer` |
| `standard_video.config.tts_enhance_enabled` | boolean | `true` | `sv.tts_enhance` |
| `standard_video.config.seo_rules_enabled` | boolean | `true` | `sv.metadata_seo_rules` |
| `standard_video.config.category_guidance_enabled` | boolean | `true` | `sv.category_guidance` (referans) |

Hepsi `wired: True` ve admin Settings sayfasında görünür.

---

## 6. Prompt Editor'de Görünürlük

- `standard_video` module scope filtresi ile tüm 10 blok Prompt Editor'de listeleniyor
- Grup bazlı görünüm: Core / Behavior / Context / Output
- Her blok için: kind badge, condition özeti, status, effective template preview
- Admin override: sv.* bloklarının tamamında admin override edit + reset
- Related Rules: her behavior block'a bağlı config key görünüyor
- Preview (dry run): module_scope="standard_video" + step_key="script"/"metadata" seçilerek preview çalıştırılabiliyor

---

## 7. Job Detail Trace

Mevcut Job Detail altyapısı (M34'te teslim edildi) standard_video için de çalışıyor:

- Prompt Trace sekmesi: script ve metadata için ayrı run kartları
- step_key bazlı ayrım: script run ile metadata run karışmıyor
- Her run'da: assembled prompt, block breakdown (included/skipped + neden), settings/data/block snapshot JSON drawers, provider request/response
- `used_assembly_engine: true` flag'i provider_trace_json içinde

---

## 8. Dry Run / Preview

- `/api/v1/prompt-assembly/preview` endpoint'i standard_video ile çalışıyor
- `is_dry_run=True` — provider HTTP call atılmıyor
- module_scope="standard_video", step_key="script" veya "metadata" seçimi
- Sample data ile test edilebilir (data_overrides alanı)
- Included/skipped nedenleri tam görünür
- Payload sanitize edilmiş olarak kaydediliyor

---

## 9. Test Sonuçları

| Test Dosyası | Test Sayısı | Sonuç |
|-------------|-------------|-------|
| `test_condition_evaluator.py` | 15 | ✅ 15/15 PASS |
| `test_template_renderer.py` | 11 | ✅ 11/11 PASS |
| `test_assembly_service.py` | 7 | ✅ 7/7 PASS |
| `test_prompt_assembly_api.py` | 5 | ✅ 5/5 PASS |
| `test_sv_prompt_assembly.py` | 8 | ✅ 8/8 PASS |
| **Toplam** | **46** | **✅ 46/46 PASS (0.15s)** |

Yeni testler:
1. `test_sv_script_blocks_seeded` — script blokları seed'lendi mi
2. `test_sv_metadata_blocks_seeded` — metadata blokları seed'lendi mi
3. `test_sv_step_scope_isolation` — script adımında metadata bloğu yok, tersi de doğru
4. `test_sv_script_assembly_basic` — script assembly non-empty prompt üretiyor
5. `test_sv_metadata_assembly_basic` — metadata assembly non-empty prompt üretiyor
6. `test_sv_protected_blocks` — sv.script_system, sv.output_contract, sv.metadata_output_contract disable edilemiyor
7. `test_sv_determinism` — aynı snapshot'lar 3 kez çalıştırıldığında aynı sonuç
8. `test_sv_settings_behavior_flags` — opening_hooks_enabled=False → sv.opening_hooks atlanıyor

news_bulletin testleri de etkilenmedi — hepsi geçti.

---

## 10. Kalan Limitasyonlar

1. **Metadata executor script artifact dependency**: Metadata adımı script artifact'ı dosyadan okuyor. Gelecekte snapshot-locked olmalı.
2. **Template tone/language_rules**: data_snapshot'a ekleniyor ama sv.* bloklarında `{{template_tone}}` kullanan spesifik blok yok — template context blokları ilerleyen fazda eklenebilir.
3. **`category_guidance_enabled` settings key**: data_presence condition ile çalışıyor, boolean flag settings'te tanımlı ama condition_config_json'da değil. Referans amaçlıdır.
4. **E2E browser testi**: Backend testler geçti, tarayıcıda canlı test henüz yapılmadı.
5. **standard_video.prompt.script_system / metadata_system**: Eski settings key'leri (type: prompt) hâlâ settings_resolver.py'da duruyor — bunlar artık assembly engine blokları ile kapsanıyor. İlerleyen fazda deprecated olarak işaretlenebilir.

---

## 11. Commit ve Push Durumu

| # | Hash | Mesaj |
|---|------|-------|
| 1 | `6aa0e40` | feat(standard_video): wire Prompt Assembly Engine to script and metadata steps |
| 2 | `7b8fed3` | feat(standard_video): Prompt Assembly Engine rollout (M35) — merge commit |

**Push:** ✅ `github.com:huskobro/contenthub.git main` — başarılı
