# TTS Fine Controls (Faz 4)

**Commit:** `b1a1329`

Sahne başına uygulanan TTS kontrolleri: konuşma hızı, tonlama, vurgu,
duraklamalar, glossary düzeltmeleri, pronunciation override'ları ve
scene-energy preset'leri.

## Anahtar Modül

`backend/app/tts/controls.py`

## Pipeline

```
scene narration
    │
    ├──▶ apply_glossary_and_pronunciation(text, glossary, overrides)
    │       (word-boundary regex; sadece TTS text'ine uygulanır)
    │
    ├──▶ insert_ssml_pauses(text, sentence_ms, paragraph_ms, scene_ms)
    │       (<break time="Xms"/> SSML)
    │
    ├──▶ apply_scene_energy(voice_settings, scene_energy)
    │       (calm/neutral/energetic preset'ine göre stability/style/speed
    │        güncellemesi)
    │
    └──▶ build_provider_voice_settings(scene_controls, global_controls)
            │
            ▼
         plan_scene_tts() ──▶ TTS Provider
```

## Settings (Faz 6 visibility etiketleri)

| Key | Tip | Kullanıcı | Wizard |
|-----|-----|:--------:|:------:|
| `tts.voice_settings.speed` | float | ✅ | ✅ |
| `tts.voice_settings.pitch` | float | ✅ | — |
| `tts.voice_settings.emphasis` | enum | ✅ | ✅ |
| `tts.voice_settings.use_speaker_boost` | bool | ✅ | — |
| `tts.voice_settings.stability` | float | admin | — |
| `tts.voice_settings.similarity_boost` | float | admin | — |
| `tts.voice_settings.style` | float | admin | — |
| `tts.pauses.sentence_break_ms` | int | ✅ | — |
| `tts.pauses.paragraph_break_ms` | int | ✅ | — |
| `tts.pauses.scene_break_ms` | int | ✅ | — |
| `tts.glossary.brand` | dict | ✅ | — |
| `tts.glossary.product` | dict | ✅ | — |
| `tts.pronunciation.overrides` | dict | ✅ | — |
| `tts.controls.default_scene_energy` | enum | ✅ | ✅ |
| `tts.controls.ssml_pauses_enabled` | bool | admin | — |

## Scene Energy Preset'leri

| Preset | speed | stability | style | Not |
|--------|------:|---------:|------:|-----|
| `calm` | 0.95 | 0.75 | 0.3 | yavaş, sakin |
| `neutral` | 1.0 | 0.5 | 0.5 | varsayılan |
| `energetic` | 1.08 | 0.35 | 0.75 | hızlı, vurgulu |

## Audit

Her sahne için `tts_controls_audit.json`:

```json
{
  "scene_number": 1,
  "scene_energy": "energetic",
  "text_char_count": 245,
  "tts_text_char_count": 245,
  "replacements_count": 2,
  "ssml_pauses_inserted": 3,
  "voice_settings_applied": {
    "speed": 1.08,
    "stability": 0.35,
    "style": 0.75,
    "use_speaker_boost": true
  }
}
```

## Test Kapsamı

- `backend/tests/test_tts_faz4_controls.py` — 39 unit test.
- `backend/tests/test_tts_faz4_executor_integration.py` — 4 entegrasyon.
