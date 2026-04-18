# TTS Common Layer (Faz 1)

**Commit:** `72065a8`

Tüm video modülleri için ortak TTS katmanı. Amaç: her modülün kendi TTS
iş mantığını kopyala-yapıştır etmesini engellemek ve DubVoice.ai'yi primary
provider olarak tek bir yerden enjekte etmek.

## Anahtar Dosyalar

- `backend/app/tts/contract.py` — TTS provider arayüzü (`TTSRequest`,
  `TTSResult`, `TTSProvider` ABC).
- `backend/app/tts/voice_registry.py` — voice_id çözümleme; language + role
  (narrator/reporter) → voice_id.
- `backend/app/providers/dubvoice/provider.py` — ElevenLabs benzeri async
  task modeline sahip DubVoice istemcisi (create task → poll → fetch audio).
- `backend/app/providers/registry.py` — `ProviderCapability.TTS` kabiliyeti
  için dispatcher.
- `backend/app/tts/strict_resolution.py` — Faz 2 state machine ile birlikte
  kullanılır; birincili seçer, fallback'e izin verilirse listeden sıradakini
  dener, aksi halde hata fırlatır.

## Provider Kontratı

```python
class TTSProvider(ABC):
    capability = ProviderCapability.TTS

    async def synthesize(self, request: TTSRequest) -> TTSResult: ...
```

`TTSRequest`:
- `text: str` — provider'a gönderilecek nihai metin (glossary/pronunciation
  uygulanmış halde).
- `voice_id: str`
- `language: str` (tr/en)
- `voice_settings: dict` — provider-native (stability, similarity_boost, style,
  speed, use_speaker_boost).
- `output_path: Path`

`TTSResult`:
- `audio_path: Path`
- `duration_seconds: float`
- `provider_id: str`
- `metadata: dict` (task_id, model_id, vb.)

## Kural

- Provider kodu primary/fallback karar vermez — bunu `strict_resolution`
  yapar.
- Provider retry'ı provider içinde değil, yukarıda state machine'de.
- `NonRetryableProviderError` hiyerarşisi hangi başarısızlıkların retry
  edilmeyeceğini belirtir (auth hatası, kota, geçersiz voice_id).

## Test Kapsamı

- `backend/tests/test_tts_faz1_contract.py`
- `backend/tests/test_tts_faz1_voice_registry.py`
- `backend/tests/test_tts_faz1_dubvoice_provider.py`
