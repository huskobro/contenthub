# M14-B: Template Context Matrix Raporu

## Ozet

Template context'in 8 executor arasindaki tuketim durumu M14'te kesinlestirildi. TTS executor anlamli consumer olarak baglandi. 3 executor bilerek non-consumer olarak belgelendi.

## Template Context Tuketim Matrisi (M14 Sonrasi)

| Executor | Consumer? | Okunan Alanlar | Karar Gerekce |
|----------|-----------|----------------|---------------|
| **Script** | EVET | `content_rules.tone`, `content_rules.language_rules` | Prompt'a ekleniyor |
| **Metadata** | EVET | `content_rules.tone`, `publish_profile.seo_keywords` | Prompt'a ekleniyor |
| **Visuals** | EVET | `style_blueprint.visual_rules.image_style` | Arama sorgusuna prefix |
| **Composition** | EVET | Tum `style_blueprint` + `subtitle_rules` merge | Remotion props orkestrasyon |
| **TTS** | **EVET (M14)** | `style_blueprint.motion_rules.voice_style` | Ses karakter override |
| **Subtitle** | HAYIR | — | Zamanlama motoru; stil composition'da uygulanir |
| **RenderStill** | HAYIR | — | Preview props bagimsiz; blueprint composition_props uzerinden Remotion'a ulasir |
| **Render** | HAYIR | — | composition_props zaten blueprint verisini iceriyor |

## TTS Executor Degisiklikleri

### `backend/app/modules/standard_video/executors/tts.py`

**Eklenen davranis:**
1. `_template_context` okunuyor (isinstance(dict) guard)
2. `style_blueprint.motion_rules.voice_style` kontrol ediliyor
3. Varsa `get_voice(language)` sonucu override ediliyor
4. Sonucta `template_info` ve `voice_style_override_applied` alanlari ekleniyor
5. Override loglaniyor (before → after voice)

**Ornek akis:**
```
Template → motion_rules.voice_style = "tr-TR-EmelNeural"
Default voice = "tr-TR-AhmetNeural" (language default)
Sonuc: "tr-TR-EmelNeural" kullanilir, log yazilir
```

**Geriye uyumluluk:**
- Template yoksa normal davranis degismez
- `voice_style` yoksa default voice kullanilir
- `template_info` ve `voice_style_override_applied` sadece template context varsa eklenir

## Non-Consumer Belgeleme

3 executor'a kaynak kodda M14 non-consumer belgeleme eklendi:

### SubtitleStepExecutor
```
NON-CONSUMER — intentional.
Subtitle executor is a timing engine (SRT generation + Whisper transcription).
Style rules (font, color, size) are applied at composition time by
CompositionStepExecutor, which merges style_blueprint.subtitle_rules
into subtitle_style.
```

### RenderStillExecutor
```
NON-CONSUMER — intentional.
Preview props are constructed from job input + subtitle_presets.
Blueprint rules reach Remotion through composition_props.json,
not through render_still.
```

### RenderStepExecutor
```
NON-CONSUMER — intentional.
Composition props already incorporate blueprint data.
Render executor is a subprocess wrapper (npx remotion render).
```

## Testler

### `backend/tests/test_m14_template_context.py` — 11 test

**TTS Consumer Testleri (4):**
1. `test_tts_voice_override_from_template` — voice_style override uygulanir
2. `test_tts_without_template_context` — Template yoksa normal davranis
3. `test_tts_template_context_without_voice_style` — Template var ama voice_style yok
4. `test_tts_template_without_blueprint` — Template var ama blueprint yok

**Non-Consumer Dogrulama (3):**
5. `test_subtitle_executor_is_documented_non_consumer` — Kaynak kodda "NON-CONSUMER" var
6. `test_render_still_executor_is_documented_non_consumer` — Ayni
7. `test_render_executor_is_documented_non_consumer` — Ayni

**Consumer Matris (4):**
8-11. TTS `_template_context` okuyor, diger 3 non-consumer okumuyor

## Kumulatif Ilerleme

| Milestone | Consumer | Non-Consumer | Belirsiz |
|-----------|----------|-------------|----------|
| M11 | 1 (composition) | 0 | 7 |
| M12 | 4 (script, metadata, visuals, composition) | 0 | 4 |
| M13 | 4 (test tamamlandi) | 0 | 4 |
| **M14** | **5 (TTS eklendi)** | **3 (belgelendi)** | **0** |

Belirsizlik sifira indi. Her executor icin net karar var.
