# M12 Template/Style Context Genisleme Raporu

## Genel Bakis
M11'de sadece CompositionStepExecutor template context okuyordu. M12'de script, metadata ve visuals executor'lari da template context tuketmeye basladi.

## Tuketim Matrisi

| Executor | Template Context Okuyor mu | Okunan Alanlar |
|----------|---------------------------|----------------|
| ScriptStepExecutor | EVET (M12) | content_rules.tone, content_rules.language_rules |
| MetadataStepExecutor | EVET (M12) | content_rules.tone, publish_profile.seo_keywords |
| VisualsStepExecutor | EVET (M12) | style_blueprint.visual_rules.image_style |
| CompositionStepExecutor | EVET (M11) | template_id/name/version, style_blueprint.subtitle_rules |
| SubtitleStepExecutor | HAYIR | Timing otomatik -- template context marginal deger |
| TTSStepExecutor | HAYIR | Voice secimi dil bazli -- template voice override ileride |
| RenderStepExecutor | HAYIR | composition_props zaten template verisi tasiyor |
| RenderStillExecutor | HAYIR | Preview -- composition_props'tan okur |

## Degisiklik Detaylari

### script.py
- getattr(job, '_template_context', None) + isinstance guard
- content_rules.tone varsa LLM prompt'una "Ton: {tone}" satiri ekleniyor
- content_rules.language_rules varsa prompt'a ek dil kurallari ekleniyor
- template_info return trace'e dahil ediliyor

### metadata.py
- Ayni guard pattern
- content_rules.tone varsa metadata prompt'una ton rehberligi ekleniyor
- publish_profile.seo_keywords varsa SEO anahtar kelimeleri prompt'a ekleniyor
- template_info return trace'e dahil ediliyor

### visuals.py
- Ayni guard pattern
- style_blueprint.visual_rules.image_style varsa gorsel arama sorgusuna on ek ekleniyor
- Ornek: image_style="cinematic", visual_cue="city skyline" -> sorgu: "cinematic city skyline"
- image_style_applied flag'i trace'e ekleniyor

### prompt_builder.py
- build_script_prompt(): template_tone ve template_language_rules parametreleri eklendi
- build_metadata_prompt(): template_tone ve template_seo_keywords parametreleri eklendi
- Parametreler istege bagli -- None ise davranis degismez

## Geriye Uyumluluk
Tum degisiklikler geriye uyumlu. Template context yoksa (None veya MagicMock) davranis oncekiyle ayni.
