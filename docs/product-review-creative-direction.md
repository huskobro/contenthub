# Product Review — Kreatif Yonlendirme

**Modul:** `product_review`
**Scope:** Template branches, sahne siralari, blueprint kurallari, preview seviyeleri.

---

## 1. Template Branches

### 1.1 single
Tek urun odakli inceleme. Sahne akisi:
```
intro_hook → hero_card → spec_compare(1-up) → pros_cons → price_reveal → verdict_card → cta_outro
```

### 1.2 comparison
Iki urun yan yana karsilastirma:
```
intro_hook → hero_card → spec_compare(2-up) → head_to_head → price_reveal(2x) → verdict_card → cta_outro
```

### 1.3 alternatives
Birincil urune alternatif oneriler:
```
intro_hook → hero_card(primary) → alternatives_grid → pros_cons(alt) → verdict_card → cta_outro
```

## 2. Sahne Sabitleri

- `intro_hook` — ~1.5s, attention-grabber
- `hero_card` — ~4s, urun adi + fiyat + ana gorsel
- `spec_compare` — ~5s, ozellik sutunlari
- `price_reveal` — ~3s, fiyat animasyonlu cikis
- `pros_cons` — ~4s, arti/eksi listesi
- `head_to_head` — ~4s (sadece comparison)
- `alternatives_grid` — ~6s (sadece alternatives)
- `verdict_card` — ~3s, sonuc metni
- `cta_outro` — ~2s, "abone ol" + linkler

## 3. Tonlar (5)

| Ton | Kullanim | Accent |
|---|---|---|
| electric | Elektronik, teknoloji | #00E5FF |
| crimson | Gaming, urun lanse | #E63946 |
| emerald | Outdoor, saglik | #10B981 |
| gold | Lux, gida | #F59E0B |
| mono | Minimal, editoryal | #111111 |

Varsayilan: `electric`. Admin override: `product_review.blueprint.tone`.

## 4. Layout Kurallari

- Orientations: `vertical` (1080x1920, default) + `horizontal` (1920x1080).
- Safe area: vertical %5, horizontal %6.
- Grid: vertical 1 kolon spec; horizontal 2 kolon spec (comparison icin).
- Font sistem: display + body (app-level, Remotion defaults).

## 5. Motion Kurallari

- Enter: spring (damping=12, mass=0.7)
- Exit: ease-out cubic-bezier(0.16, 1, 0.3, 1)
- Hero float: amplitude=8px, period=120 frame
- Scene enter: 10 frame
- Scene exit: 8 frame
- **Yasak:** strobe, harsh_camera_shake, glitch_blink

## 6. Watermark + Overlay

- Watermark: default off (admin aktif edebilir, `product_review.blueprint.show_watermark`).
- Price disclaimer overlay: default ON (`product_review.blueprint.price_disclaimer_overlay`). Son sahne(ler)de ekranin altinda kucuk fontla surekli gorunur.

## 7. Preview-First Chain

Uretim tamamlanmadan once operator iki seviyeli preview gorebilir:

### Level 1 — `preview_frame` (still)
- Renderstill cagrisi.
- 1 kare PNG/JPG.
- Sahne seciminde operator override yapar (`product_review.preview.frame_scene_key`, default `hero_card`).
- Maliyet: dusuk (ms mertebesinde).

### Level 2 — `preview_mini` (mini MP4)
- Remotion full render ama sadece intro + hero (toplam ~3s).
- Motion + geçişler gorunur.
- Maliyet: orta (saniye mertebesinde).
- Opsiyonel (`product_review.gate.preview_l2_required`).

### Level 3 (opsiyonel, mevcut degil)
- Full video render zaten final. L3 ayrica bir "orta kalite" preview olarak dusunulebilir; MVP scope'u disinda.

## 8. Legal Zorunluluklar

- **Affiliate disclosure** — `legal.disclosure_applied=True` metadata'ya yazilir; publish gate bunu dogrular.
- **Price disclaimer** — metadata description'a eklenir + composition props'unda overlay text olarak gonderilir. Publish gate bunu dogrular.
- **ToS checkbox** — `product_review.legal.tos_checkbox_required=True` ise user review esnasinda operator onayi (audit'e yazilir).
- **Affiliate URL** — `affiliate_enabled=True` ise URL metadata'da olmak ZORUNDA.

## 9. Blueprint Versiyonu

- `product_review_v1` — DB'de startup seed (idempotent).
- Version=1.
- Renderer `defaultProductReviewBlueprint` ile ayni alan seti tasir (source-of-truth: renderer).
- Job snapshot zamani lock edilir; blueprint sonradan degistirilirse calisan job'u etkilemez.

## 10. Ornek Job Akisi

```
1. scrape → urun bilgisi + confidence
2. script (single) → 7 sahne
3. metadata → title "Sony WH-1000XM5 Inceleme" + description (disclosure + disclaimer)
4. visuals → urun gorseli + 3 stok gorsel
5. tts → narration.wav
6. subtitle → subtitles.srt
7. preview_frame → operator onayi (hero_card)
8. preview_mini → operator onayi (intro+hero)
9. composition → Remotion props
10. render → final.mp4 (60s)
11. publish → YouTube (disclosure + disclaimer dogrulandi, review onayli)
```
