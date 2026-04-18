# Product Review Modulu — Kapanis (Closure) Raporu

**Durum:** CLOSED (MVP v1)
**Kapanis tarihi:** 2026-04-15
**Modul id:** `product_review`

---

## 1. Kapsam

Modul, 8 fazda tamamlandi:

| Faz | Icerik | Commit |
|---|---|---|
| A | Foundation: modul tanimi, migration, test skeleton | 955a8a8 + b72c3ad |
| B | Vertical slice: scrape + CRUD + deterministic executor zinciri | 5831d70 |
| C | Creative pack + preview (L1 frame + L2 mini) | 656319a |
| D | 3 template branch: single / comparison / alternatives | 968aad5 |
| E | data_confidence + gate decisions (semi_auto / full_auto) | 7a39ef4 |
| F | TTS / Subtitle / Render / Publish adapter + publish guard + audit | 03ee820 |
| G | Site-specific parsers + shortlink + robots.txt + canonical conflict | 717a1ca |
| H | Docs + closure | (bu commit) |

## 2. Kapanis Checklist

### 2.1 Preview-First Chain
- [x] L1 `preview_frame` executor (Faz C)
- [x] L2 `preview_mini` executor (Faz C)
- [x] Settings-gated scene override (`product_review.preview.frame_scene_key`)
- [x] Gate entegrasyonu (`product_review.gate.preview_l1_required`, `preview_l2_required`)
- [x] Blueprint version traceability preview_frame.json + preview_mini.json icinde

### 2.2 Template Branches
- [x] `single` template (Faz D) — 7 sahne
- [x] `comparison` template (Faz D) — 7 sahne (head_to_head dahil)
- [x] `alternatives` template (Faz D) — 6 sahne (alternatives_grid dahil)
- [x] `test_product_review_d_templates.py` — 13 test

### 2.3 Run Mode + Publish Gate
- [x] `semi_auto` (default) — confidence gate aktif
- [x] `full_auto` — min_confidence + min_scraped_fields esiklerinde otomatik akis
- [x] Publish review gate HER iki modda default ON
- [x] `allow_publish_without_review` settings-gated (default False)
- [x] Audit trail `publish_review_audit.json` her publish'te yazilir

### 2.4 Affiliate Disclosure + Price Disclaimer
- [x] Metadata executor disclosure'i description'a yazar
- [x] Metadata executor disclaimer'i description'a yazar
- [x] Affiliate URL zorunlulugu (`affiliate_enabled=True` ise)
- [x] Publish executor `_assert_affiliate_and_disclaimer` ile dogrular (eksikse block)
- [x] Composition props'a `showPriceDisclaimerOverlay` + `priceDisclaimerText` gonderilir

### 2.5 Scraping / Parser
- [x] parser_chain v1 (jsonld + og + generic) — Faz B
- [x] parser_chain v2 (site_specific + twitter card) — Faz G
- [x] 6 site parser (amazon, trendyol, hepsiburada, n11, shopify, woocommerce)
- [x] Host dispatcher (HOST_MATCHERS)
- [x] Priority: jsonld > site_specific > og > twittercard > generic

### 2.6 Hardening
- [x] SSRF guard (loopback, private, link-local, multicast, reserved, unspecified)
- [x] Scheme guard (sadece http/https)
- [x] Per-host throttle (default 2s)
- [x] Timeout wrap (socket.timeout → FetchTimeoutError)
- [x] Max body bytes (default 2 MB)
- [x] Shortlink expansion (a.co, amzn.to, ty.gl, hb.com.tr) + HEAD/GET fallback + SSRF per hop + max 5 hop
- [x] robots.txt respect (setting-gated, default False, permissive-on-error)
- [x] Canonical conflict detection (partial-unique index + executor-level check + NULL fallback)

### 2.7 Analytics
- [x] `Job.module_type="product_review"` aggregation otomatik (by_module)
- [x] Publish record `module="product_review"` isaretleme (publish executor)
- [x] Gate decisions (`gate_decision` artifact) → analytics trace

### 2.8 Renderer / Blueprint
- [x] Remotion `ProductReview` composition (vertical + horizontal)
- [x] Remotion `ProductReviewPreviewFrame` composition
- [x] Remotion `ProductReviewMini` composition
- [x] `product_review_v1` blueprint seed (startup idempotent)
- [x] 5 ton: electric / crimson / emerald / gold / mono
- [x] Motion kurallari: no strobe, no harsh_camera_shake, no glitch_blink

### 2.9 Settings Registry
- [x] 20+ product_review.* setting kayiti
- [x] Hepsi snapshot-locked (job.input_data_json._settings_snapshot)
- [x] Kod icinde hardcoded deger yok (legal + disclosure + disclaimer hepsi setting)

### 2.10 Migration
- [x] `0063_product_review_phase_a` — products + product_snapshots + product_reviews tablolari
- [x] `0064_product_review_canonical_index` — partial-unique index

## 3. Test Ozeti

| Suite | Count | Status |
|---|---|---|
| test_product_review_foundation.py | 18 | pass |
| test_product_review_b_crud.py | 11 | pass |
| test_product_review_b_url_parser.py | 19 | pass |
| test_product_review_c_preview.py | 11 | pass |
| test_product_review_d_templates.py | 13 | pass |
| test_product_review_e_gates.py | 18 | pass |
| test_product_review_f_wiring.py | 16 | pass |
| test_product_review_g_parsers.py | 30 | pass |
| test_product_review_g_hardening.py | 25 | pass |
| **Toplam** | **161** | **161 pass** |

## 4. Commit List

```
b72c3ad  product-review: Faz A foundation migration
955a8a8  product-review: Faz A foundation code
5831d70  product_review Faz B: vertical slice
656319a  product_review Faz C: creative pack + preview
968aad5  product_review Faz D: 3 template branch
7a39ef4  product_review Faz E: data_confidence + gate decisions
03ee820  product_review Faz F: adapter wiring + publish guard + audit
717a1ca  product_review Faz G: site-specific parsers + shortlink + robots.txt + canonical conflict
<next>   product_review Faz H: docs + closure
```

## 5. Ongorulen Bosluklar (MVP Disi)

Sonraki surumlere iteleme (closure'i bloklamaz):

- Semantic dedupe (urun karsilastirma)
- LLM-assisted title zenginlestirmesi
- L3 orta kalite preview
- Non-YouTube publish adaptorleri (Instagram, TikTok)
- EN/DE dil seti (architecture ready, template metinleri eklenebilir)

Bu maddeler MVP scope'u disinda tutulmustur ve modul kapanisini bloklamaz.

## 6. Bilinen Sinirliliklar

- Site parser'lari HTML selector bazli; buyuk DOM degisikliginde parser'lar guncellenir (fixture test'ler bunu erken yakalar).
- robots.txt fetch'i host cache'lidir; TTL yok (test sirasinda `reset()` cagrilmali).
- Canonical conflict durumunda p2'nin canonical'i NULL kalir; operator manuel merge yapmalidir.

## 7. Close Durumu

- Kod: tam.
- Test: 161/161 pass.
- Docs: 4 dosya (`product-review-module.md`, `product-review-scraping.md`, `product-review-creative-direction.md`, `product-review-closure.md`).
- Blueprint: seedli.
- Setting: kayitli.
- Publish: gate korunuyor + audit aktif.
- Disclosure + disclaimer: zorunlu + dogrulaniyor.

Modul **KAPALI**.
