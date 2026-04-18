# TTS Closure — Genel Manifest

Bu doküman, "TTS closure" çalışmasının 8 fazını ve her fazın neyi kilitlediğini
özetler. Her faz kendi içinde kodlanmış, test edilmiş ve commit edilmiştir.

## Hedef (SABIT Kurallar)

1. **DubVoice.ai primary** — tüm video modülleri (standard_video, news_bulletin,
   product_review, educational_video, howto_video) için birincil TTS sağlayıcı.
2. **Otomatik fallback YOK** — birincil sağlayıcı düştüğünde sistem sessizce
   başkasına geçmez. Fallback yalnızca `tts.fallback_providers` allowlist'inde
   tanımlı ve `tts.allow_auto_fallback=true` ise, explicit state machine üzerinden
   devreye girer.
3. **Altyazı script-canonical** — Türkçe karakterler, marka/ürün adları ve
   özel söylenişler scripten gelir; Whisper YALNIZCA zamanlama (timing) için
   kullanılır. TTS metnini değiştiren glossary/pronunciation replacements
   altyazı metnine ASLA uygulanmaz.
4. **Preview-first** — kullanıcı büyük render'a girmeden önce voice sample (L1),
   scene preview (L2), draft script preview (L3) üretebilir; final output (L4)
   preview'den net ayrılır (`is_preview=True` manifest bayrağı).
5. **Settings Registry** — tüm operator-facing davranışlar (voice_id, pauses,
   glossary, scene energy, preview limits) `KNOWN_SETTINGS` üzerinden yönetilir;
   kullanıcı/admin yüzeyleri `visible_to_user`, `user_override_allowed`,
   `visible_in_wizard`, `read_only_for_user` flag'leri ile kontrol edilir.

## Faz Haritası

| Faz | Başlık | Commit | Ana Doküman |
|----:|:-------|:-------|:-----------|
| 1 | DubVoice common TTS foundation | `72065a8` | `docs/tts-common-layer.md` |
| 2 | No-auto-fallback + explicit state machine | `91f49d7` | `docs/tts-fallback-flow.md` |
| 3 | Script-canonical subtitle alignment | `0a9f8b9` | `docs/subtitle-canonicalization.md` |
| 4 | Fine controls (speed/pitch/emphasis/pauses/glossary/scene-energy) | `b1a1329` | `docs/tts-controls.md` |
| 5 | Preview-first TTS (L1/L2/L3) | `cf3853d` | `docs/tts-preview-first.md` |
| 6 | Settings Registry admin/user surfaces | `df29d7c` | `docs/tts-settings-surfaces.md` |
| 7 | Full test sweep | — | `docs/testing/tts-test-report.md` |
| 8 | Docs + commits + push | (bu doküman) | — |

## Mimari Akış (özet)

```
User / Wizard
    │
    ▼
Preview Router  ────▶ preview_service ──▶ resolve_tts_strict ──▶ DubVoice
    │                                              │
    │                                              └──▶ (explicit fallback,
    ▼                                                    only if allowed)
Job Executor (standard_video/news_bulletin/...)
    │
    ├──▶ plan_scene_tts (controls: speed, pitch, emphasis,
    │                    scene_energy, glossary, pauses)
    │
    ├──▶ TTS Provider  (tts_controls_audit.json)
    │
    ├──▶ Whisper Aligner  (timing only)
    │
    └──▶ Script-Canonical SRT  (subtitle_alignment_audit.json)
```

## Dokunulmayan Bölgeler

- Legacy / Horizon / Bridge / Atrium surface'larındaki çalışan preview akışları.
- Publish / analytics / jobs state machine çekirdeği.
- Mevcut, TTS dışı modül iş mantıkları.

## Artifact Sözleşmesi

Her TTS closure adımı şu audit artifact'larından en az birini üretir:

- `tts_fallback_audit.json` — primary/fallback provider kararı + neden.
- `tts_controls_audit.json` — sahne başına uygulanan kontrol snapshot'ı.
- `subtitle_alignment_audit.json` — Whisper timing + script-canonical metin
  eşleme raporu; replacements listesi ve seçilen cue boundary'leri.
- `preview_manifest.json` — preview_id, level, provider_id, scenes[], duration,
  controls_snapshot, `is_preview=True`.

Final job artifact'ları ile preview artifact'ları ayrı dizinlerde tutulur
(`workspace/<job_id>/...` vs. `workspace/_tts_previews/<preview_id>/...`).

## SABIT İnvariantlar (kodda korunur)

- `tts.allow_auto_fallback` ve `tts.fallback_providers` **admin-only**
  (`visible_to_user=False`, `user_override_allowed=False`) —
  `backend/tests/test_tts_faz6_settings_visibility.py::test_sabit_fallback_infra_keys_admin_only`
  bu kuralı kilitler.
- Glossary replacement altyazı metnini değiştiremez —
  Faz 3 alignment testleri bu ayrımı denetler.
- Preview manifest'te `is_preview` daima `True` —
  `backend/tests/test_tts_faz5_preview_service.py` kapsamında asserts edilir.

## Kabul Kriterleri

- [x] Faz 1 — DubVoice common layer + provider + contract + voice registry
- [x] Faz 2 — No auto-fallback + explicit state machine + audit
- [x] Faz 3 — Script-canonical subtitle alignment (tüm modüller)
- [x] Faz 4 — Fine controls
- [x] Faz 5 — Preview-first TTS
- [x] Faz 6 — Settings admin/user surfaces
- [x] Faz 7 — 350/350 test passed (TTS closure subset)
- [x] Faz 8 — Docs committed

## Bilinen Sınırlamalar

- **Pre-existing test failures (out of TTS scope):** `MEMORY.md`'de zaten
  kaydedilmiş 40 civarı failure (M7 fresh DB, M2-C1/C6 module dispatcher,
  M6-C3 composition, M7-C2 YouTube OAuth, sprint1-3 auth hardening).
  Bu closure içinde ele alınmadı.
- **Semantic voice matching** — şu anda voice_id string match; gelecekte
  semantic search eklenecek (out of scope).
- **Preview cache** — her preview isteği yeni bir dosya üretir; cache/dedupe
  gelecek için ayrılmıştır.
