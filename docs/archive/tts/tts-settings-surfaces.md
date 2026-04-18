# TTS Settings Admin/User Surfaces (Faz 6)

**Commit:** `df29d7c`

## Amaç

Her TTS ayarı `KNOWN_SETTINGS` üzerinde 4 visibility bayrağıyla tanımlıdır:

- `visible_to_user` — user paneldeki Settings sayfasında görünür mü?
- `user_override_allowed` — kullanıcı admin default'unu override edebilir mi?
- `visible_in_wizard` — guided wizard içinde gösterilir mi?
- `read_only_for_user` — kullanıcı salt-okunur görür mü?

Değişiklik:
- `seed_known_settings()` yeni eklenen key için bu bayrakları `KNOWN_SETTINGS`
  meta'sından DB'ye aynen yazar.
- `sync_visibility_flags_from_registry()` mevcut DB satırları üzerinde
  YALNIZCA visibility bayraklarını günceller. `admin_value_json` ASLA
  değiştirilmez. Idempotent.

Startup'ta `main.py` sırası: `seed_known_settings()` → `sync_visibility_flags_from_registry()`.

## Politika Tablosu (TTS keys)

### User-Facing (14 key)

| Key | Wizard |
|-----|:------:|
| `tts.default_voice.tr` | ✅ |
| `tts.default_voice.en` | ✅ |
| `tts.voice_settings.speed` | ✅ |
| `tts.voice_settings.pitch` | — |
| `tts.voice_settings.emphasis` | ✅ |
| `tts.voice_settings.use_speaker_boost` | — |
| `tts.pauses.sentence_break_ms` | — |
| `tts.pauses.paragraph_break_ms` | — |
| `tts.pauses.scene_break_ms` | — |
| `tts.glossary.brand` | — |
| `tts.glossary.product` | — |
| `tts.pronunciation.overrides` | — |
| `tts.controls.default_scene_energy` | ✅ |
| `tts.preview.voice_sample_text` | — |

### Admin-Only (12 key)

- `tts.allow_auto_fallback` *(SABIT)*
- `tts.fallback_providers` *(SABIT)*
- `tts.dubvoice.default_model_id`
- `tts.dubvoice.poll_interval_seconds`
- `tts.dubvoice.poll_timeout_seconds`
- `tts.dubvoice.http_timeout_seconds`
- `tts.voice_settings.stability`
- `tts.voice_settings.similarity_boost`
- `tts.voice_settings.style`
- `tts.controls.ssml_pauses_enabled`
- `tts.preview.max_characters_draft`
- `tts.preview.workspace_dir`

## SABIT İnvariant

`tts.allow_auto_fallback` ve `tts.fallback_providers` **HİÇBİR KOŞULDA**
kullanıcı paneline çıkmaz. `test_sabit_fallback_infra_keys_admin_only` bu
kuralı assert eder.

## Seed / Sync Sözleşmesi

| Operasyon | Visibility bayrakları | `admin_value_json` |
|-----------|----------------------|-------------------|
| `seed_known_settings()` (yeni key) | meta'dan yazılır | `null` |
| `seed_known_settings()` (mevcut key) | dokunulmaz | dokunulmaz |
| `sync_visibility_flags_from_registry()` | meta'ya senkronize | **DOKUNULMAZ** |

## Test Kapsamı

`backend/tests/test_tts_faz6_settings_visibility.py` — 9 test:

1. User-facing TTS keys meta doğru.
2. Admin-only TTS keys meta doğru.
3. SABIT fallback/auto-fallback admin-only.
4. Wizard-visible TTS keys doğru.
5. Seed yeni key'i meta ile yazar.
6. Seed idempotent.
7. Sync eski satırlardaki visibility flag'lerini günceller.
8. Sync idempotent (seed sonrası değişiklik yok).
9. Sync `admin_value_json`'u KORUR.
