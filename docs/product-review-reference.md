# Product Review Modülü — Referans

**Durum:** CLOSED (MVP v1)  
**Son güncelleme:** 2026-04-18  
**Modül id:** `product_review`  
**Migration:** `0063_product_review_phase_a` + `0064_product_review_canonical_index`

Orijinal belgeler arşivlendi: `docs/archive/product-review/`

---

## İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [Pipeline (11 Adım)](#2-pipeline-11-adım)
3. [Scraping — Parser Chain v2](#3-scraping--parser-chain-v2)
4. [HTTP Güvenlik Guardrails](#4-http-güvenlik-guardrails)
5. [Kreatif Yönlendirme ve Şablon Dalları](#5-kreatif-yönlendirme-ve-şablon-dalları)
6. [Preview-First Chain](#6-preview-first-chain)
7. [Settings Registry](#7-settings-registry)
8. [Legal Zorunluluklar](#8-legal-zorunluluklar)
9. [Remotion Compositions](#9-remotion-compositions)
10. [Test Kapsamı](#10-test-kapsamı)

---

## 1. Genel Bakış

`product_review` modülü, bir ürün URL'sinden başlayarak otomatik video üretir:

1. URL parse + canonical üretimi (affiliate + tracking temizliği)
2. HTML fetch + site-specific parser zinciri → Product + ProductSnapshot
3. Video senaryosu, metadata, görseller, TTS, altyazı
4. Preview (L1 frame + L2 mini) ile operatöre görsel onay
5. Remotion final render
6. YouTube yayını — affiliate disclosure + price disclaimer zorunlu

**3 şablon dalı:** `single` / `comparison` / `alternatives`

---

## 2. Pipeline (11 Adım)

| # | step_key | Açıklama | idempotency |
|---|---|---|---|
| 1 | `product_scrape` | URL → Product + Snapshot + parser_chain v2 | artifact_check |
| 2 | `script` | Senaryo (template-aware) | re_executable |
| 3 | `metadata` | Başlık + açıklama + tags + legal | re_executable |
| 4 | `visuals` | Ana görsel + destekleyici stok görsel | artifact_check |
| 5 | `tts` | Ses (standard_video executor reuse) | artifact_check |
| 6 | `subtitle` | SRT (standard_video executor reuse) | re_executable |
| 7 | `preview_frame` | L1 tek kare preview (renderStill) | re_executable |
| 8 | `preview_mini` | L2 mini MP4 (~3s preview) | artifact_check |
| 9 | `composition` | Remotion props üretimi | artifact_check |
| 10 | `render` | Final MP4 render | artifact_check |
| 11 | `publish` | YouTube yayını + review gate | operator_confirm |

### Run Mode

- **semi_auto** (default): confidence düşükse gate tarafından bloklanır; publish gate AKTIF.
- **full_auto**: `product_review.full_auto.min_confidence` (default 0.7) ve `min_scraped_fields` eşiği aşılırsa adımlar otomatik akar. Publish gate yine AKTIF.

---

## 3. Scraping — Parser Chain v2

### Parser Öncelik Zinciri

```
jsonld > site_specific > opengraph > twittercard > generic
```

Bir parser "usable" (name + price + image varsa) sonuç döndürürse zincir o noktada durur.

### Site-Specific Parser'lar (Tier-1)

| Host | Parser | SKU kaynak |
|---|---|---|
| amazon.{com,com.tr,de,co.uk,...} | `parse_amazon` | ASIN (`/dp/XXX`) |
| trendyol.com, ty.gl | `parse_trendyol` | `-p-{id}` path |
| hepsiburada.com | `parse_hepsiburada` | `-p-HBCV...` |
| n11.com | `parse_n11` | (yoksa) |
| *.myshopify.com | `parse_shopify` | handle |
| WooCommerce | `parse_woocommerce` | — |

### Shortlink Expansion

- Amazon: `a.co`, `amzn.to`, `amzn.asia`, `amzn.eu`, `amzn.com`
- Trendyol: `ty.gl`
- Diğer: `hb.com.tr`
- Her hop'ta SSRF kontrolü, max 5 hop, 6s timeout

### Canonical URL Conflict

`products.canonical_url` kolonunda partial-unique index. Çakışma olursa `canonical_conflict=True` flag yazılır, audit trail kaydedilir.

---

## 4. HTTP Güvenlik Guardrails

`fetch_html` çağrısı her zaman:

| Kontrol | Detay |
|---|---|
| **SSRF guard** | Loopback, private, link-local, multicast IP blok. DNS resolution sonrası tüm A/AAAA kayıtları kontrol. |
| **Scheme guard** | Sadece `http` + `https`. `file://`, `ftp://`, `javascript:` reject. |
| **Throttle** | Host bazlı min_interval_s (default 2.0s). Erken çağrı → `ThrottleBlocked`. |
| **Timeout** | Default 10s. `FetchTimeoutError` wrap. |
| **Max body** | Default 2 MB. Kesilirse `truncated=True`. |
| **User-Agent** | `ContentHub/1.0 product_review` |

### robots.txt

`product_review.scrape.respect_robots_txt` (default False) aktifse:
- Host-cache (max 64) ile fetch, 4s timeout
- UA: `ContentHub/1.0 product_review`
- Longest-match semantics; eşit uzunlukta → allow kazanır
- `permissive_on_error=True` (default) → fetch hatası = "izinli"

---

## 5. Kreatif Yönlendirme ve Şablon Dalları

### Şablon Dalları

**single** — tek ürün incelemesi:
```
intro_hook → hero_card → spec_compare(1-up) → pros_cons → price_reveal → verdict_card → cta_outro
```

**comparison** — iki ürün karşılaştırma:
```
intro_hook → hero_card → spec_compare(2-up) → head_to_head → price_reveal(2x) → verdict_card → cta_outro
```

**alternatives** — alternatif öneriler:
```
intro_hook → hero_card(primary) → alternatives_grid → pros_cons(alt) → verdict_card → cta_outro
```

### Sahne Süreleri

| Sahne | Süre | Not |
|---|---|---|
| `intro_hook` | ~1.5s | Attention-grabber |
| `hero_card` | ~4s | Ürün adı + fiyat + ana görsel |
| `spec_compare` | ~5s | Özellik sütunları |
| `price_reveal` | ~3s | Fiyat animasyonlu çıkış |
| `pros_cons` | ~4s | Artı/eksi listesi |
| `verdict_card` | ~3s | Sonuç metni |
| `cta_outro` | ~2s | Abone ol + linkler |

### Tonlar (Style Blueprint)

| Ton | Kullanım | Accent |
|---|---|---|
| `electric` | Elektronik, teknoloji | `#00E5FF` |
| `crimson` | Gaming, ürün lansmanı | `#E63946` |
| `emerald` | Outdoor, sağlık | `#10B981` |
| `gold` | Lüks, gıda | `#F59E0B` |
| `mono` | Minimal, editoryal | `#111111` |

Varsayılan: `electric`. Admin override: `product_review.blueprint.tone`.

### Motion Kuralları

- Enter: spring (damping=12, mass=0.7)
- Exit: ease-out cubic-bezier(0.16, 1, 0.3, 1)
- Hero float: amplitude=8px, period=120 frame
- **Yasak:** strobe, harsh_camera_shake, glitch_blink

---

## 6. Preview-First Chain

### Level 1 — `preview_frame` (still)

- `renderStill` çağrısı → 1 kare PNG/JPG
- Sahne seçimi: `product_review.preview.frame_scene_key` (default `hero_card`)
- Maliyet: düşük (ms)

### Level 2 — `preview_mini` (mini MP4)

- Remotion full render, sadece intro + hero (~3s)
- Motion + geçişler görünür
- Opsiyonel: `product_review.gate.preview_l2_required`

---

## 7. Settings Registry

Tüm operator-facing davranışlar Settings Registry'den gelir — kodda sabit değil.

### Legal

| Key | Tip | Default |
|---|---|---|
| `product_review.legal.affiliate_disclosure_text` | text | — |
| `product_review.legal.price_disclaimer_text` | text | — |
| `product_review.legal.tos_checkbox_required` | bool | False |

### Scraping

| Key | Tip | Default |
|---|---|---|
| `product_review.scrape.respect_robots_txt` | bool | False |
| `product_review.scrape.min_interval_seconds_per_host` | float | 2.0 |
| `product_review.scrape.max_body_bytes` | int | 2 MB |
| `product_review.scrape.timeout_seconds` | int | 10 |

### Gate / Confidence

| Key | Tip | Default |
|---|---|---|
| `product_review.full_auto.min_confidence` | float | 0.7 |
| `product_review.full_auto.min_scraped_fields` | int | 4 |
| `product_review.full_auto.allow_publish_without_review` | bool | False |
| `product_review.gate.preview_l1_required` | bool | True |
| `product_review.gate.preview_l2_required` | bool | False |

### Preview / Blueprint

| Key | Default |
|---|---|
| `product_review.preview.frame_scene_key` | `hero_card` |
| `product_review.blueprint.tone` | `electric` |
| `product_review.blueprint.accent_override` | — |
| `product_review.blueprint.show_watermark` | False |
| `product_review.blueprint.watermark_text` | — |
| `product_review.blueprint.price_disclaimer_overlay` | True |

---

## 8. Legal Zorunluluklar

- **Affiliate disclosure** — `legal.disclosure_applied=True` metadata'ya yazılır; publish gate bunu doğrular.
- **Price disclaimer** — metadata description'a eklenir + composition props'unda overlay text. Publish gate doğrular.
- **ToS checkbox** — `tos_checkbox_required=True` ise operator onayı audit'e yazılır.
- **Affiliate URL** — `affiliate_enabled=True` ise URL metadata'da olmak ZORUNDA.

---

## 9. Remotion Compositions

| composition_id | Boyut | Kullanım |
|---|---|---|
| `ProductReview` | 1080x1920 / 1920x1080 | Final render |
| `ProductReviewPreviewFrame` | dto | L1 preview still |
| `ProductReviewMini` | dto | L2 mini MP4 |

**Blueprint:** `product_review_v1` — startup'ta idempotent seed edilir.  
Job başladığında blueprint snapshot'lanır; sonraki değişiklikler çalışan job'u etkilemez.

---

## 10. Test Kapsamı

| Test Dosyası | Test Sayısı | Kapsam |
|---|---|---|
| `test_product_review_foundation.py` | 18 | Temel mimari |
| `test_product_review_b_crud.py` | 11 | CRUD |
| `test_product_review_b_url_parser.py` | 19 | URL canonicalize + parser |
| `test_product_review_c_preview.py` | 11 | Preview L1/L2 |
| `test_product_review_d_templates.py` | 13 | 3 şablon dalı |
| `test_product_review_e_gates.py` | 18 | Gate + confidence |
| `test_product_review_f_wiring.py` | 16 | Executor wiring |
| `test_product_review_g_parsers.py` | 30 | Site parser + priority v2 |
| `test_product_review_g_hardening.py` | 25 | Shortlink + robots + SSRF |

**Toplam: 161/161 PASS**
