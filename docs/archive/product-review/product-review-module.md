# Product Review Modulu — Kapanis Rehberi

**Durum:** CLOSED (MVP v1)
**Son guncelleme:** 2026-04-15
**Modul id:** `product_review`
**Migration:** `0063_product_review_phase_a` (+ `0064_product_review_canonical_index`)

---

## 1. Ne Yapar

`product_review` modulu, bir urun URL'sinden baslayarak:

1. URL parse + canonical uretir (affiliate + tracking temizligi)
2. HTML fetch + site-specific parser zinciri ile Product + ProductSnapshot yaratir
3. Video senaryosu, metadata, gorseller, TTS, altyazi uretir
4. Preview (L1 frame + L2 mini) ile operatore visual onay yoptirir
5. Remotion ile final render alir
6. YouTube'a yayin yapar — affiliate disclosure + price disclaimer zorunlu

Modul 3 template branch destekler:
- **single** — tek urun incelemesi (Faz D)
- **comparison** — iki urun karsilastirma (Faz D)
- **alternatives** — bir urune alternatif oneriler (Faz D)

## 2. Pipeline (11 Adim)

| # | step_key | Aciklama | idempotency |
|---|---|---|---|
| 1 | `product_scrape` | URL → Product + Snapshot + parser_chain v2 | artifact_check |
| 2 | `script` | Senaryo (template-aware) | re_executable |
| 3 | `metadata` | Baslik + aciklama + tags + legal | re_executable |
| 4 | `visuals` | Ana gorsel + destekleyici stok gorsel | artifact_check |
| 5 | `tts` | Ses (standard_video executor reuse) | artifact_check |
| 6 | `subtitle` | SRT (standard_video executor reuse) | re_executable |
| 7 | `preview_frame` | L1 tek kare preview (renderStill) | re_executable |
| 8 | `preview_mini` | L2 mini MP4 (~3s preview) | artifact_check |
| 9 | `composition` | Remotion props uretimi | artifact_check |
| 10 | `render` | Final MP4 render | artifact_check |
| 11 | `publish` | YouTube yayini + review gate | operator_confirm |

## 3. Input Schema

```json
{
  "topic": "string (3–500)",
  "template_type": "single | comparison | alternatives",
  "primary_product_id": "string (required)",
  "secondary_product_ids": ["string", "..."],
  "language": "tr",
  "orientation": "vertical | horizontal",
  "duration_seconds": 30..600,
  "run_mode": "semi_auto | full_auto",
  "affiliate_enabled": "bool"
}
```

## 4. Run Mode

- **semi_auto** (default) — her adim `operator_confirm` idempotency'ye tabi degil, ama confidence dusukse gate tarafindan bloklanir. Publish gate (manual review) AKTIF.
- **full_auto** — confidence esigi (`product_review.full_auto.min_confidence`, default 0.7) ve min_scraped_fields esigi asilirsa adimlar otomatik akar. Publish gate yine AKTIF.
  - Istisna: `product_review.full_auto.allow_publish_without_review=True` + audit trail yazilmasi (`publish_review_audit.json`).

## 5. Ayar Kayitlari (Settings Registry)

Tum operator-facing davranislar Settings Registry'den gelir — kod icinde sabit degil.

### Legal
- `product_review.legal.affiliate_disclosure_text`
- `product_review.legal.price_disclaimer_text`
- `product_review.legal.tos_checkbox_required`

### Scraping
- `product_review.scrape.respect_robots_txt` (bool, default False)
- `product_review.scrape.min_interval_seconds_per_host` (float, default 2.0)
- `product_review.scrape.max_body_bytes` (int, default 2 MB)
- `product_review.scrape.timeout_seconds` (int, default 10)

### Gate / Confidence
- `product_review.full_auto.min_confidence` (float, default 0.7)
- `product_review.full_auto.min_scraped_fields` (int, default 4)
- `product_review.full_auto.allow_publish_without_review` (bool, default False)
- `product_review.gate.preview_l1_required` (bool, default True)
- `product_review.gate.preview_l2_required` (bool, default False)

### Preview / Blueprint
- `product_review.preview.frame_scene_key` (hero_card, intro_hook, price_reveal, verdict_card, cta_outro)
- `product_review.blueprint.tone` (electric, crimson, emerald, gold, mono)
- `product_review.blueprint.accent_override`
- `product_review.blueprint.show_watermark`
- `product_review.blueprint.watermark_text`
- `product_review.blueprint.price_disclaimer_overlay` (default True)

## 6. Style Blueprint

`product_review_v1` — modul startup'ta seed edilir (`seed_product_review_blueprints`).

- 5 ton: electric, crimson, emerald, gold, mono
- Orientations: vertical + horizontal
- Watermark opsiyonel, price_disclaimer_overlay ZORUNLU
- Motion kurallari: no strobe, no glitch_blink, no harsh_camera_shake

## 7. Remotion Compositions

| composition_id | width x height | Kullanim |
|---|---|---|
| `ProductReview` | 1080x1920 (vertical) / 1920x1080 (horizontal) | Final render |
| `ProductReviewPreviewFrame` | dto | L1 preview still |
| `ProductReviewMini` | dto | L2 mini MP4 |

## 8. Test Kapsami

- `tests/test_product_review_foundation.py` — 18 test (base architecture)
- `tests/test_product_review_b_crud.py` — 11 test (CRUD)
- `tests/test_product_review_b_url_parser.py` — 19 test (URL canonicalize + parser)
- `tests/test_product_review_c_preview.py` — 11 test (preview L1/L2)
- `tests/test_product_review_d_templates.py` — 13 test (3 branch)
- `tests/test_product_review_e_gates.py` — 18 test (gates + confidence)
- `tests/test_product_review_f_wiring.py` — 16 test (executor wiring)
- `tests/test_product_review_g_parsers.py` — 30 test (site parsers + priority v2)
- `tests/test_product_review_g_hardening.py` — 25 test (shortlink + robots + SSRF)

**Toplam:** 161/161 passed.
