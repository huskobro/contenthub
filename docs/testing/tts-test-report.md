# TTS Closure Test Report (Faz 7)

**Tarih:** 2026-04-15
**Kapsam:** Faz 1–6 TTS closure + TTS ile temas eden modül smoke testleri.

## Özet

| Metrik | Değer |
|--------|------:|
| TTS closure test sayısı | 350 |
| Geçen | 350 |
| Başarısız | 0 |
| Pre-existing failures (out-of-scope) | 40 |

Pre-existing başarısızlıklar TTS closure kapsamı DIŞINDADIR ve
`MEMORY.md::project_preexisting_test_failures.md` içinde zaten not
edilmiştir. Bu kapsamda düzeltilmemiştir.

## Koşulan Test Dosyaları

### Faz 1 — Common Layer

- `tests/test_tts_faz1_contract.py`
- `tests/test_tts_faz1_voice_registry.py`
- `tests/test_tts_faz1_dubvoice_provider.py`

### Faz 2 — No Auto-Fallback

- `tests/test_tts_faz2_strict_resolution.py`
- `tests/test_tts_faz2_fallback_audit.py`

### Faz 3 — Script-Canonical Subtitles

- `tests/test_tts_faz3_subtitle_alignment.py`

### Faz 4 — Fine Controls

- `tests/test_tts_faz4_controls.py` (39 test)
- `tests/test_tts_faz4_executor_integration.py` (4 test)

### Faz 5 — Preview-First

- `tests/test_tts_faz5_preview_service.py` (16 test)
- `tests/test_tts_faz5_preview_router.py` (14 test)

### Faz 6 — Settings Surfaces

- `tests/test_tts_faz6_settings_visibility.py` (9 test)

### TTS-Temas Eden Modül Smoke Testleri

- `tests/test_m4_c1_*`, `test_m4_c2_*`, `test_m4_c3_*` (standard_video TTS
  step integration)
- `tests/test_m2_c4_*`, `test_m2_c5_*` (news_bulletin narration + TTS)
- `tests/test_m10_settings_resolver.py`
- `tests/test_settings_precedence.py`
- `tests/test_m14_*` (template snapshot + TTS settings lock)
- `tests/test_product_review_f_*` (product_review Faz F TTS adapter wiring)
- `tests/test_m23_hardening_*` (restart recovery w/ TTS pause state)

## Pre-Existing Failures (DIŞARIDA bırakıldı)

Aşağıdakiler TTS closure öncesinde de başarısızdı, sweep'te de aynı şekilde
failed. `git stash` ile temiz state koşumu da aynı sonucu verdi — regresyon
YOK.

- `test_full_auto_service` guards (M7 fresh DB ile ilgili)
- `test_m2_c1_module` dispatcher (pre-existing M2-C1 sorunu)
- `test_m2_c6` dispatcher
- `test_m6_c3` composition
- `test_m7_c1` Alembic migration yolu
- `test_m7_c2` YouTube OAuth smoke
- `test_sprint1-3_auth_hardening`

Toplam: ~40 failure, TTS closure'u etkilemez.

## Kabul

- [x] 350/350 TTS closure subset passed
- [x] Regresyon yok (pre-existing failure sayısı değişmedi)
- [x] SABIT invariantlar test kilidi altında:
      - `test_sabit_fallback_infra_keys_admin_only`
      - script-canonical subtitle invariant
      - preview `is_preview=True` assertion
      - sync `admin_value_json` preservation

## Koşum Komutları

```bash
# TTS closure subset
cd backend
./.venv/bin/python -m pytest \
  tests/test_tts_faz1_*.py \
  tests/test_tts_faz2_*.py \
  tests/test_tts_faz3_*.py \
  tests/test_tts_faz4_*.py \
  tests/test_tts_faz5_*.py \
  tests/test_tts_faz6_*.py \
  tests/test_m4_c1_*.py tests/test_m4_c2_*.py tests/test_m4_c3_*.py \
  tests/test_m2_c4_*.py tests/test_m2_c5_*.py \
  tests/test_m10_settings_resolver.py \
  tests/test_settings_precedence.py \
  tests/test_m14_*.py \
  tests/test_product_review_f_*.py \
  tests/test_m23_hardening_*.py
```
