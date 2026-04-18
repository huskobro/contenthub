# Product Review — Scraping Rehberi

**Modul:** `product_review`
**Scope:** URL parse + canonical + HTTP fetch + parser chain v2 + shortlink + robots.txt + SSRF/throttle/timeout.

---

## 1. Parser Priority Chain v2

```
jsonld > site_specific > opengraph > twittercard > generic
```

Bir parser "usable" (name + price + image varsa) sonuc dondururse zincir o noktada durur. Hicbiri usable degilse, en yuksek confidence'li name-li partial dondurulur. Exception firlatan parser zinciri bozmaz.

### 1.1 JSON-LD
- `<script type="application/ld+json">` icindeki `@type=Product` nesnesi.
- Alanlar: name, brand, image, offers.price, offers.priceCurrency, offers.availability, sku, gtin, aggregateRating.

### 1.2 Site-Specific (Tier-1)
Host → parser mapping (`HOST_MATCHERS` + `parse_site_specific`):

| Host | Parser | SKU kaynak | Currency default |
|---|---|---|---|
| amazon.{com,com.tr,de,co.uk,...} | `parse_amazon` | ASIN (`/dp/XXX`) | USD |
| trendyol.com, ty.gl | `parse_trendyol` | `-p-{id}` path | TRY |
| hepsiburada.com | `parse_hepsiburada` | `-p-HBCV...` | TRY |
| n11.com | `parse_n11` | (yoksa) | TRY |
| *.myshopify.com, shopify-cdn | `parse_shopify` | handle | (variant) |
| host uymaz + `body.woocommerce` | `parse_woocommerce` | - | (meta) |

### 1.3 OpenGraph
- `<meta property="og:*">` + `<meta property="product:price:*">`.

### 1.4 Twitter Card
- `<meta name="twitter:*">` + `twitter:label1/data1` ("Price" pattern Amazon'da kullanilir).

### 1.5 Generic
- `<title>`, `<h1>`, ilk `<img>` — son care fallback.

## 2. Shortlink Expansion

`is_shortlink(url)` → `SHORT_HOSTS` kumesi uzerinden kontrol:

- Amazon: `a.co`, `amzn.to`, `amzn.asia`, `amzn.eu`, `amzn.com`
- Trendyol: `ty.gl`
- Diger: `hb.com.tr`

Algoritma:
1. HEAD (opsiyonel, manuel redirect bloklu)
2. 30x + Location → sonraki hop
3. 405 / baska 4xx + no-location → GET fallback (no-redirect)
4. Her hop'ta SSRF kontrolu (`_is_private_host`)
5. max_hops=5 (default), timeout_s=6
6. Donus: `ShortlinkResult(final_url, hops, shortlink_detected)`

Exception hiyerarsisi:
- `ShortlinkError` — generic network/HTTP hatasi (retryable)
- `ShortlinkSSRFBlocked` — private host hop (retryable=False)
- `ShortlinkTooManyHops` — 5+ hop (retryable=False)

## 3. robots.txt Respect

`product_review.scrape.respect_robots_txt` (default False) aktifse:

1. `robots_guard.is_allowed(url, respect_robots_txt=True)` cagrilir.
2. robots.txt host-cache (max 64) ile fetch edilir (4s timeout).
3. UA: `ContentHub/1.0 product_review`. UA-specific kural daha uzun match'le default `*`'i ezer.
4. Longest-match allow/disallow semantics. Esit uzunlukta → allow kazanir.
5. `permissive_on_error=True` (default) → fetch hatasi = "izinli" (fail-soft).
6. 404 robots.txt = "izinli" (standart).

## 4. HTTP Fetch Guardrails

`fetch_html` cagrisi her zaman:

- **SSRF guard:** loopback, private, link-local, multicast, reserved, unspecified IP block. DNS resolution sonrasi tum A/AAAA kayitlari kontrol.
- **Scheme guard:** sadece `http` + `https`. `file://`, `ftp://`, `javascript:` vb. reject.
- **Throttle:** host bazli min_interval_s (default 2.0s). Ikinci cagri cok erken gelirse `ThrottleBlocked`.
- **Timeout:** default 10s. `socket.timeout` → `FetchTimeoutError` wrap.
- **Max body bytes:** default 2 MB. Kesilirse `truncated=True`.
- **User-Agent:** `ContentHub/1.0 product_review`.

## 5. Canonical URL Conflict

`products.canonical_url` kolonunda partial-unique index (sadece non-NULL). Scrape sirasinda:

1. `canonicalize_url(final_url)` hesaplanir.
2. Varsa ayni canonical'a sahip BASKA bir Product aranir.
3. Bulunursa: `canonical_conflict=True` flag, canonical atanmaz (NULL kalir), audit trail.
4. DB commit IntegrityError'a duserse rollback + NULL fallback.

## 6. Tam Pipeline Ornegi

```
URL: https://a.co/abc123
  ├─ is_shortlink → True
  ├─ expand_shortlink → https://www.amazon.com/dp/B09XS7JWHH (1 hop)
  ├─ robots_guard.is_allowed (setting=False) → True (short-circuit)
  ├─ fetch_html → (status=200, html, final_url=...)
  ├─ parse_product_html_v2(html, final_url)
  │   ├─ jsonld → None
  │   ├─ site_specific (amazon) → ParsedProduct(name=..., price=..., ...)
  │   └─ dondurulen: amazon
  ├─ canonicalize_url(final_url) → https://www.amazon.com/dp/B09XS7JWHH
  ├─ duplicate check → yok
  ├─ product upsert (name, price, image, brand, rating, sku)
  └─ ProductSnapshot kaydi (HTML arsivi)
```

## 7. Test Dosyalari

- `tests/test_product_review_b_url_parser.py` — 19 test (canonicalize + parse_product_html v1)
- `tests/test_product_review_g_parsers.py` — 30 test (site-specific + priority v2)
- `tests/test_product_review_g_hardening.py` — 25 test (shortlink + robots + SSRF + throttle + timeout + canonical conflict)
