# DubVoice.ai Integration

**İlgili commit:** `72065a8` (Faz 1)

DubVoice.ai ContentHub'ın SABIT primary TTS provider'ıdır. Tüm video
modülleri için default olarak bu provider kullanılır.

## Provider Modeli

DubVoice ElevenLabs benzeri async task modeli kullanır:

```
POST /synthesize   → { task_id }
GET  /tasks/<id>   → { status: "queued" | "processing" | "done" | "failed",
                       audio_url?: "...",
                       error?: "..." }
GET  <audio_url>   → mp3 binary
```

## İstemci

`backend/app/providers/dubvoice/provider.py`

İlgili settings:

| Key | Tip | Default | Visibility |
|-----|-----|---------|-----------|
| `tts.dubvoice.default_model_id` | str | `"dubvoice_v1"` | admin |
| `tts.dubvoice.poll_interval_seconds` | float | `2.0` | admin |
| `tts.dubvoice.poll_timeout_seconds` | float | `120.0` | admin |
| `tts.dubvoice.http_timeout_seconds` | float | `30.0` | admin |
| credentials (API key) | — | — | credentials group |

## Capability

`ProviderCapability.TTS` olarak kayıtlıdır. `strict_resolution` bu
capability'yi `primary_provider_id="dubvoice"` varsayımıyla çağırır;
istisna admin ayarı ile başka bir primary seçilebilir (ama yine de auto
fallback YOK).

## Hata Haritalaması

| DubVoice Hatası | Sınıflandırma |
|-----------------|---------------|
| 401 / 403 | `NonRetryableProviderError` (auth) |
| 429 | `NonRetryableProviderError` (quota) |
| 400 (geçersiz voice_id) | `NonRetryableProviderError` |
| 5xx / network / timeout | `ProviderError` (retryable at state machine level) |

## Voice ID Çözümlemesi

`tts.default_voice.tr` ve `tts.default_voice.en` ayarları DubVoice voice
kataloğunda tanımlı voice_id string'lerini tutar. Kullanıcı override edebilir
(`user_override_allowed=True`).

## Test Kapsamı

- `backend/tests/test_tts_faz1_dubvoice_provider.py`
- `backend/tests/test_tts_faz1_contract.py`
