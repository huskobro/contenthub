# TTS Referans — ContentHub v1.0

**Durum:** CLOSED (tüm 8 faz tamamlandı)  
**Son güncelleme:** 2026-04-18  
**Kaynak belgeler (arşivlendi):** `docs/archive/tts/`

Bu doküman, ContentHub TTS sisteminin tüm bileşenlerini tek bir yerde özetler.
Orijinal faz dokümanları `docs/archive/tts/` dizinine taşınmıştır.

---

## İçindekiler

1. [Sabit Kurallar](#1-sabit-kurallar)
2. [Mimari Akış](#2-mimari-akış)
3. [Common Layer — Provider Kontratı (Faz 1)](#3-common-layer--provider-kontratı-faz-1)
4. [Fallback Akışı — No Auto-Fallback (Faz 2)](#4-fallback-akışı--no-auto-fallback-faz-2)
5. [Fine Controls (Faz 4)](#5-fine-controls-faz-4)
6. [Preview-First TTS (Faz 5)](#6-preview-first-tts-faz-5)
7. [Settings Yüzeyleri (Faz 6)](#7-settings-yüzeyleri-faz-6)
8. [Artifact Sözleşmesi](#8-artifact-sözleşmesi)
9. [Test Kapsamı](#9-test-kapsamı)
10. [Bilinen Sınırlamalar](#10-bilinen-sınırlamalar)

---

## 1. Sabit Kurallar

1. **DubVoice.ai primary** — tüm video modülleri (standard_video, news_bulletin,
   product_review, educational_video, howto_video) için birincil TTS sağlayıcı.
2. **Otomatik fallback YOK** — birincil sağlayıcı düştüğünde sistem sessizce
   başkasına geçmez. Fallback yalnızca `tts.fallback_providers` allowlist'inde
   tanımlı ve `tts.allow_auto_fallback=true` ise, explicit state machine üzerinden
   devreye girer.
3. **Altyazı script-canonical** — Türkçe karakterler, marka/ürün adları ve
   özel söylenişler scripten gelir; Whisper YALNIZCA zamanlama (timing) için
   kullanılır. TTS metnini değiştiren glossary/pronunciation replacements
   altyazı metnine ASLA uygulanmaz.
4. **Preview-first** — kullanıcı büyük render'a girmeden önce voice sample (L1),
   scene preview (L2), draft script preview (L3) üretebilir; final output (L4)
   preview'den net ayrılır (`is_preview=True` manifest bayrağı).
5. **Settings Registry** — tüm operator-facing davranışlar `KNOWN_SETTINGS`
   üzerinden yönetilir.

---

## 2. Mimari Akış

```
User / Wizard
    │
    ▼
Preview Router  ────▶ preview_service ──▶ resolve_tts_strict ──▶ DubVoice
    │                                              │
    │                                              └──▶ (explicit fallback,
    ▼                                                    only if allowed)
Job Executor (standard_video/news_bulletin/...)
    │
    ├──▶ plan_scene_tts (controls: speed, pitch, emphasis,
    │                    scene_energy, glossary, pauses)
    │
    ├──▶ TTS Provider  (tts_controls_audit.json)
    │
    ├──▶ Whisper Aligner  (timing only)
    │
    └──▶ Script-Canonical SRT  (subtitle_alignment_audit.json)
```

---

## 3. Common Layer — Provider Kontratı (Faz 1)

**Commit:** `72065a8`

### Anahtar Dosyalar

| Dosya | İçerik |
|---|---|
| `backend/app/tts/contract.py` | `TTSRequest`, `TTSResult`, `TTSProvider` ABC |
| `backend/app/tts/voice_registry.py` | language + role → voice_id çözümleme |
| `backend/app/providers/dubvoice/provider.py` | DubVoice async istemcisi (create → poll → fetch) |
| `backend/app/providers/registry.py` | `ProviderCapability.TTS` dispatcher |
| `backend/app/tts/strict_resolution.py` | Primary seçimi + fallback zinciri |

### TTSRequest / TTSResult

```python
# TTSRequest
text: str          # Glossary/pronunciation uygulanmış nihai metin
voice_id: str
language: str      # "tr" / "en"
voice_settings: dict  # stability, similarity_boost, style, speed, use_speaker_boost
output_path: Path

# TTSResult
audio_path: Path
duration_seconds: float
provider_id: str
metadata: dict     # task_id, model_id, vb.
```

### Kural

- Provider kodu primary/fallback karar vermez — bunu `strict_resolution` yapar.
- Provider retry'ı provider içinde değil, state machine'de.
- `NonRetryableProviderError` hiyerarşisi hangi başarısızlıkların retry edilmeyeceğini belirtir.

---

## 4. Fallback Akışı — No Auto-Fallback (Faz 2)

**Commit:** `91f49d7`

```
resolve_tts_strict()
    │
    ▼
Primary (DubVoice) ──OK──▶ Success
    │
    FAIL
    │
    ├── tts.allow_auto_fallback = false ──▶ TTSFallbackNotAllowedError
    │
    └── true
         │
         ├── provider not in tts.fallback_providers ──▶ TTSFallbackNotAllowedError
         │
         └── Try next ──OK──▶ Success
                       FAIL ──▶ TTSPrimaryFailedError
```

### Hata Sınıfları

| Hata | Anlam |
|---|---|
| `TTSPrimaryFailedError` | Primary başarısız, fallback da başarısız |
| `TTSFallbackNotAllowedError` | Primary başarısız, otomatik fallback kapalı veya allowlist boş |
| `TTSProviderNotFoundError` | Registry'de TTS kabiliyetli provider yok |

### Fallback Settings (admin-only, SABIT)

| Key | Default |
|---|---|
| `tts.allow_auto_fallback` | `false` |
| `tts.fallback_providers` | `[]` |

---

## 5. Fine Controls (Faz 4)

**Commit:** `b1a1329` — `backend/app/tts/controls.py`

### Pipeline

```
scene narration
    │
    ├──▶ apply_glossary_and_pronunciation(text, glossary, overrides)
    │       (word-boundary regex; sadece TTS text'ine uygulanır)
    ├──▶ insert_ssml_pauses(text, sentence_ms, paragraph_ms, scene_ms)
    ├──▶ apply_scene_energy(voice_settings, scene_energy)
    └──▶ build_provider_voice_settings(scene_controls, global_controls)
              ▼
           plan_scene_tts() ──▶ TTS Provider
```

### Scene Energy Preset'leri

| Preset | speed | stability | style |
|---|---|---|---|
| `calm` | 0.95 | 0.75 | 0.3 |
| `neutral` | 1.0 | 0.5 | 0.5 |
| `energetic` | 1.08 | 0.35 | 0.75 |

### Settings Özeti

| Key | Kullanıcı | Wizard |
|---|:---:|:---:|
| `tts.voice_settings.speed` | ✅ | ✅ |
| `tts.voice_settings.pitch` | ✅ | — |
| `tts.voice_settings.emphasis` | ✅ | ✅ |
| `tts.voice_settings.use_speaker_boost` | ✅ | — |
| `tts.pauses.sentence_break_ms` | ✅ | — |
| `tts.glossary.brand` | ✅ | — |
| `tts.glossary.product` | ✅ | — |
| `tts.pronunciation.overrides` | ✅ | — |
| `tts.controls.default_scene_energy` | ✅ | ✅ |
| `tts.voice_settings.stability` | admin | — |
| `tts.voice_settings.style` | admin | — |
| `tts.controls.ssml_pauses_enabled` | admin | — |

---

## 6. Preview-First TTS (Faz 5)

**Commit:** `cf3853d`

### Seviyeler

| Seviye | Ad | Girdi | Çıktı |
|:---:|----|---|---|
| **L1** | `voice_sample` | voice_id (+ opsiyonel custom_text) | ~10-20 sn mp3 |
| **L2** | `scene` | narration (tek sahne) + controls | 1 sahne mp3 |
| **L3** | `draft_script` | scenes[] | Her sahne için mp3 |
| **L4** | `final` | tam job pipeline | final audio (preview DEĞİL) |

L1/L2/L3 her zaman `is_preview=True` ve `workspace/_tts_previews/<preview_id>/` altında tutulur.

### Router (`backend/app/tts/preview_router.py`)

| Method | Path | Amaç |
|---|---|---|
| POST | `/tts/preview/voice-sample` | L1 voice sample |
| POST | `/tts/preview/scene` | L2 scene preview |
| POST | `/tts/preview/draft-script` | L3 draft script preview |
| GET | `/tts/preview/{preview_id}` | Manifest |
| GET | `/tts/preview/{preview_id}/audio/{filename}` | Audio stream |

### Güvenlik

- `..`, `/` içeren filename → 400 (path traversal koruması)
- `.mp3` dışı uzantılar → 400

---

## 7. Settings Yüzeyleri (Faz 6)

**Commit:** `df29d7c`

### User-Facing (14 key)

`tts.default_voice.tr`, `tts.default_voice.en`, `tts.voice_settings.speed`, `.pitch`, `.emphasis`, `.use_speaker_boost`, `tts.pauses.*` (3 key), `tts.glossary.*` (2 key), `tts.pronunciation.overrides`, `tts.controls.default_scene_energy`, `tts.preview.voice_sample_text`

### Admin-Only (12 key)

`tts.allow_auto_fallback` *(SABIT)*, `tts.fallback_providers` *(SABIT)*, `tts.dubvoice.*` (4 key), `tts.voice_settings.stability/similarity_boost/style`, `tts.controls.ssml_pauses_enabled`, `tts.preview.max_characters_draft/workspace_dir`

### SABIT İnvariant

`tts.allow_auto_fallback` ve `tts.fallback_providers` HİÇBİR KOŞULDA kullanıcı paneline çıkmaz.  
Test: `test_tts_faz6_settings_visibility.py::test_sabit_fallback_infra_keys_admin_only`

### Seed / Sync Sözleşmesi

| Operasyon | Visibility bayrakları | admin_value_json |
|---|---|---|
| `seed_known_settings()` (yeni key) | meta'dan yazılır | `null` |
| `seed_known_settings()` (mevcut key) | dokunulmaz | dokunulmaz |
| `sync_visibility_flags_from_registry()` | meta'ya senkronize | **DOKUNULMAZ** |

---

## 8. Artifact Sözleşmesi

| Dosya | Üretildiği yer | İçerik |
|---|---|---|
| `tts_fallback_audit.json` | Her TTS çağrısında | Primary/fallback karar + neden |
| `tts_controls_audit.json` | Her sahne için | Uygulanan kontrol snapshot'ı |
| `subtitle_alignment_audit.json` | Whisper sonrası | Timing + script-canonical eşleme |
| `preview_manifest.json` | Her preview için | preview_id, level, `is_preview=True`, scenes[] |

Final artifact'lar: `workspace/<job_id>/...`  
Preview artifact'lar: `workspace/_tts_previews/<preview_id>/...` (ayrılmaz)

---

## 9. Test Kapsamı

| Test Dosyası | Kapsam |
|---|---|
| `test_tts_faz1_contract.py` | Provider kontratı |
| `test_tts_faz1_voice_registry.py` | Voice çözümleme |
| `test_tts_faz1_dubvoice_provider.py` | DubVoice istemcisi |
| `test_tts_faz2_strict_resolution.py` | Fallback state machine |
| `test_tts_faz2_fallback_audit.py` | Audit artifact üretimi |
| `test_tts_faz4_controls.py` | 39 unit test (controls) |
| `test_tts_faz4_executor_integration.py` | 4 entegrasyon testi |
| `test_tts_faz5_preview_service.py` | 16 test (service-level preview) |
| `test_tts_faz5_preview_router.py` | 14 test (handler + path traversal) |
| `test_tts_faz6_settings_visibility.py` | 9 test (visibility flags) |

Toplam TTS kapsamı: ~350 test (Faz 7 sweep dahil).

---

## 10. Bilinen Sınırlamalar

- **Semantic voice matching** — şu anda voice_id string match; gelecekte semantic search eklenecek.
- **Preview cache** — her preview isteği yeni dosya üretir; cache/dedupe gelecek faz.
- **Non-DubVoice preview** — EdgeTTS için L1-L3 preview path aynı değil; provider-native preview ayrı faz.
