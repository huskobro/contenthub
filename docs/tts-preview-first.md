# Preview-First TTS (Faz 5)

**Commit:** `cf3853d`

Kullanıcı, final render'a girmeden önce TTS sesini dört seviyede önizleyebilir.
Amaç CLAUDE.md "Preview-First UX" kuralına uymak: büyük görsel/ses kararlar
body-önce dinlenebilsin.

## Seviyeler

| Seviye | Ad | Girdi | Çıktı |
|:------:|----|-------|-------|
| **L1** | `voice_sample` | voice_id (+ opsiyonel custom_text) | 1 kısa mp3 (~10-20 sn) |
| **L2** | `scene` | narration (tek sahne) + controls | 1 sahne mp3 |
| **L3** | `draft_script` | scenes[] (birden çok sahne) | Her sahne için mp3 |
| **L4** | `final` | tam job pipeline | final audio (preview DEĞİL) |

**SABIT:** L1/L2/L3 her zaman `is_preview=True` bayrağı ile manifest yazar
ve `workspace/_tts_previews/<preview_id>/` altında tutulur. L4 final
artifact'ları `workspace/<job_id>/` altındadır — karışmaz.

## Router

`backend/app/tts/preview_router.py` — `Depends(require_user)` ile korunur.

| Method | Path | Amaç |
|--------|------|------|
| POST | `/tts/preview/voice-sample` | L1 voice sample üret |
| POST | `/tts/preview/scene` | L2 scene preview üret |
| POST | `/tts/preview/draft-script` | L3 draft script preview üret |
| GET | `/tts/preview/{preview_id}` | Manifest döndür |
| GET | `/tts/preview/{preview_id}/audio/{filename}` | Audio stream (FileResponse) |

### Path traversal koruması

`get_preview_audio` içinde:
- `..`, `/` içeren filename → 400
- `.mp3` dışındaki uzantılar → 400
- `_safe_child(preview_root, filename)` çözümlemesi → parent'tan kaçma reddedilir.

### Hata eşleme

| Exception | HTTP |
|-----------|------|
| `TTSFallbackNotAllowedError` | 400 |
| `TTSProviderNotFoundError` | 503 |
| `TTSPrimaryFailedError` | 502 (dict detail: `message`, `primary_provider_id`) |
| `ValueError` | 422 |

## Manifest Şeması

`workspace/_tts_previews/<preview_id>/preview_manifest.json`:

```json
{
  "preview_id": "prev_abc123",
  "level": "scene",
  "provider_id": "dubvoice",
  "voice_id": "voice_tr_narrator_01",
  "language": "tr",
  "created_at": "2026-04-15T12:00:00+00:00",
  "is_preview": true,
  "scenes": [
    {
      "scene_number": 1,
      "output_path": "<abs>/voice_sample.mp3",
      "duration_seconds": 2.5,
      "tts_text_char_count": 120,
      "replacements_count": 1,
      "scene_energy": "neutral",
      "voice_settings": {"stability": 0.5, "speed": 1.0}
    }
  ],
  "controls_snapshot": { "speed": 1.0, "sentence_break_ms": 250 },
  "notes": null
}
```

## Settings

| Key | Default | Visibility |
|-----|---------|-----------|
| `tts.preview.voice_sample_text` | "Merhaba, bu ses ornegidir. …" | user-facing |
| `tts.preview.max_characters_draft` | 1500 | admin |
| `tts.preview.workspace_dir` | `_tts_previews` | admin |

## Test Kapsamı

- `backend/tests/test_tts_faz5_preview_service.py` — 16 test (service-level)
- `backend/tests/test_tts_faz5_preview_router.py` — 14 test (handler-level,
  path traversal, error mapping)
