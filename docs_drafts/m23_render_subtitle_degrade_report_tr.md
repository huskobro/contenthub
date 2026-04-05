# M23-C: Render / Subtitle Degrade Truth Hardening — Rapor

## Ozet

Render ve subtitle executor'larindaki kasitli degrade davranislari korundu
ama artik gozlemlenebilir: her degrade durumu `degradation_warnings` listesi,
structured log ve provider trace'e yaziliyor.

## Yapilan Degisiklikler

### Render Executor

1. **`app/modules/standard_video/executors/render.py`** — Step result'a degrade metadata eklendi:
   - `degradation_warnings` listesi step result'a ve provider trace'e eklendi
   - word_timing yoksa → "word_timing verisi yok — cursor modda render edildi"
   - duration fallback kullanildiysa → "total_duration_seconds gecersiz — fallback kullanildi"
   - Degrade uyarilari `logger.warning` ile de loglanir
   - Mevcut `duration_fallback_used` ve `timing_mode` alanlari korundu

### Subtitle Presets

2. **`app/modules/standard_video/subtitle_presets.py`** — Preset fallback gozlemlenebilir:
   - Logger eklendi (onceki: logger yoktu)
   - Bilinmeyen preset_id → WARNING log + `preset_fallback_used=True` return alanina eklendi
   - preset_id=None → INFO log (kasitli default, fallback degil)
   - `get_preset_for_composition()` artik `preset_fallback_used` boolean donuyor

## Degrade Davranis Matrisi

| Durum | Davranis | Log | Step Result |
|-------|----------|-----|-------------|
| word_timing yok | Cursor mod (degrade) | WARNING | degradation_warnings + timing_mode=cursor |
| word_timing bozuk | Cursor mod (degrade) | ERROR | degradation_warnings + timing_mode=cursor |
| Duration gecersiz | 60s fallback | WARNING | degradation_warnings + duration_fallback_used=true |
| Preset bilinmiyor | clean_white default | WARNING | preset_fallback_used=true |
| Preset null | clean_white default | INFO | preset_fallback_used=false |

## Test Sonuclari

- `test_render_word_timing_degrade_returns_empty` — PASSED
- `test_render_word_timing_missing_file` — PASSED
- `test_subtitle_preset_fallback_logged` — PASSED
- `test_subtitle_preset_valid_no_fallback` — PASSED
- `test_subtitle_preset_none_uses_default` — PASSED

## Tasarim Kararlari

- Degrade davranislari durdurulmuyor — render basarili tamamlanmali
- Ama degrade durumu kaydediliyor — operasyon ekibi sonradan analiz edebilir
- `degradation_warnings` listesi bos ise → temiz akis
- `degradation_warnings` dolu ise → degrade ile render edilmis

## Bilinen Sinirlamalar

- Job detail sayfasinda degradation_warnings henuz gorsel olarak gosterilmiyor
- Degrade job'lari filtreleyen bir analytics sorgusu henuz yok
- Bulk degrade raporu (kac job degrade render edildi?) henuz yok
