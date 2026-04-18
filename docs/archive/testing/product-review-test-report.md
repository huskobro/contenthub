# Product Review Test Raporu

**Tarih:** 2026-04-15
**Modul:** `product_review`
**Durum:** Faz A-H tamamlandi (KAPANIS).

---

## 1. Cikti

```
tests/test_product_review_foundation.py ..................   [ 11%]  (18)
tests/test_product_review_b_crud.py ...........              [ 18%]  (11)
tests/test_product_review_b_url_parser.py ...................[ 29%]  (19)
tests/test_product_review_c_preview.py ...........           [ 36%]  (11)
tests/test_product_review_d_templates.py .............       [ 44%]  (13)
tests/test_product_review_e_gates.py ..................      [ 55%]  (18)
tests/test_product_review_f_wiring.py ................       [ 65%]  (16)
tests/test_product_review_g_parsers.py ..............................  [ 84%]  (30)
tests/test_product_review_g_hardening.py .........................  [100%]  (25)

============================= 161 passed in 5.57s ==============================
```

## 2. Ozet

| Faz | Suite | Count | Pass | Fail |
|---|---|---|---|---|
| A | foundation | 18 | 18 | 0 |
| B | b_crud | 11 | 11 | 0 |
| B | b_url_parser | 19 | 19 | 0 |
| C | c_preview | 11 | 11 | 0 |
| D | d_templates | 13 | 13 | 0 |
| E | e_gates | 18 | 18 | 0 |
| F | f_wiring | 16 | 16 | 0 |
| G | g_parsers | 30 | 30 | 0 |
| G | g_hardening | 25 | 25 | 0 |
| **Toplam** | **9 suite** | **161** | **161** | **0** |

## 3. Kapsam Notlari

### 3.1 Foundation (Faz A)
- Module definition + step tanimlari
- Input schema validation
- Gate defaults
- Template compat list

### 3.2 CRUD (Faz B)
- Products tablosu insert/select/update
- ProductSnapshot yaratimi
- ProductReview (video kayit) bagi

### 3.3 URL Parser (Faz B)
- canonicalize_url: affiliate temizleme, tracking param silme, amazon ASIN normalize, trendyol -p-{id} destek
- parse_product_html v1 (JSON-LD + OG + generic fallback)

### 3.4 Preview (Faz C)
- L1 renderStill executor idempotent
- L2 mini MP4 executor idempotent
- Sahne override settings
- Blueprint traceability artifact'e yazilir

### 3.5 Templates (Faz D)
- single/comparison/alternatives icin sahne siralari
- template-aware script uretimi
- template-aware metadata tag + baslik

### 3.6 Gates (Faz E)
- aggregate_confidence hesaplama
- gate_decision semi_auto/full_auto farklari
- min_confidence + min_scraped_fields esikleri

### 3.7 Wiring (Faz F)
- TTS executor standard_video reuse
- Subtitle executor standard_video reuse
- Render executor standard_video reuse
- Publish executor core delegate
- Affiliate + disclaimer guard
- publish_review_audit trail

### 3.8 Site Parsers (Faz G)
- Amazon / Trendyol / Hepsiburada / N11 / Shopify / WooCommerce
- Twitter Card fallback
- Host dispatcher
- Priority chain v2 (jsonld > site_specific > og > twittercard > generic)
- Exception safety (parser crash zinciri bozmaz)

### 3.9 Hardening (Faz G)
- is_shortlink host lookup
- expand_shortlink single hop / max hops / GET fallback / SSRF mid-chain
- robots_guard short-circuit / allow / disallow / UA-specific / permissive-on-error
- http_fetch SSRF loopback / non-http scheme / throttle / timeout wrap
- Duplicate canonical conflict detection

## 4. Repo-Wide Impact

Faz G sonrasi commit (717a1ca) repo'da su durumu yaratti:
- `backend/tests` toplam (bilinen pre-existing fail suite'leri haric): **1863 passed**.
- Pre-existing failures (product_review ile ILGILI DEGIL, daha onceki fazlarda tespit edilmis):
  - `test_full_auto_service::test_guard_project_toggle_off_rejects`
  - `test_m2_c1::test_alti_adim_tanimi`, `test_adim_anahtarlari_dogru`, `test_adim_siralari_dogru`
  - `test_m2_c6` (3 tests)
  - `test_m6_c3::test_19_root_tsx_cast_count`
  - `test_m7_c1` / `c2` / `c3`
  - `test_m9_youtube_surface`
  - `test_sprint1` / `test_sprint2` / `test_sprint3`

Bunlar product_review degisikliklerinden once de failing durumdaydi; Faz G/H bu duruma yeni bir regresyon eklememistir.

## 5. Calistirma Komutu

```bash
cd backend && .venv/bin/python3 -m pytest \
  tests/test_product_review_foundation.py \
  tests/test_product_review_b_crud.py \
  tests/test_product_review_b_url_parser.py \
  tests/test_product_review_c_preview.py \
  tests/test_product_review_d_templates.py \
  tests/test_product_review_e_gates.py \
  tests/test_product_review_f_wiring.py \
  tests/test_product_review_g_parsers.py \
  tests/test_product_review_g_hardening.py
```

Sonuc: 161 passed in ~5.6s.
