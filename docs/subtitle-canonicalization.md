# Script-Canonical Subtitle Alignment (Faz 3)

**Commit:** `0a9f8b9`

## SABIT Kural

> **Altyazı metni scriptten gelir, Whisper'dan DEĞİL.**
>
> Türkçe karakterler, marka/ürün adları ve özel söyleniş düzeltmeleri
> (glossary/pronunciation) script'te yazıldığı gibi altyazıya yansır.
> Whisper YALNIZCA timing (cue başlangıç/bitiş) için kullanılır.
>
> TTS provider'a gönderilen metne uygulanan replacements ALTYAZI metnine
> ASLA uygulanmaz.

## Neden?

Whisper Türkçe karakterleri ("ç","ğ","ı","ö","ş","ü") ve marka adlarını
("ContentHub", "DubVoice") yanlış transcribe edebilir. Altyazı kalitesi için
bu kabul edilemez. Aynı zamanda TTS için uyguladığımız pronunciation
override'ları (örn. "SQL"→"es-ku-el") metnin yazılı halini bozacağından
altyazıya sızmamalıdır.

## Akış

```
Script (canonical text)
    │
    ├──▶ glossary + pronunciation ──▶ TTS Provider (audio)
    │
    └──▶ (raw script)  ─────────────▶ alignment:
                                      - Whisper transcribe → timing
                                      - DTW / forced alignment → cue boundaries
                                      - cue TEXT = script (raw, not Whisper)
                                      │
                                      ▼
                                    SRT (script-canonical cues)
```

## Audit Artifact

`subtitle_alignment_audit.json`:

```json
{
  "script_text_canonical": "Merhaba, ContentHub ile video üretiyoruz.",
  "tts_text_sent": "Merhaba, ContentHub ile video uretiyoruz.",
  "replacements_applied_to_tts_only": [
    {"from": "üretiyoruz", "to": "uretiyoruz", "reason": "pronunciation_override"}
  ],
  "whisper_transcribed": "merhaba content hab ile video uretiyoruz",
  "alignment_source": "whisper_timing_only",
  "final_cue_texts": ["Merhaba, ContentHub ile video üretiyoruz."],
  "chars_from_script_percent": 100.0,
  "chars_from_whisper_percent": 0.0
}
```

## Test Kapsamı

- `backend/tests/test_tts_faz3_subtitle_alignment.py` — script-canonical
  invariant, replacements audit isolation, Whisper timing only.
- Modül-başına entegrasyon: `standard_video`, `news_bulletin`,
  `product_review` testleri bu kuralı uygular.
