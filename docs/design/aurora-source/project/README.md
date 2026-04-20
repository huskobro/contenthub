# ContentHub — Aurora Dusk (cockpit)

**ContentHub'ın** operatör paneli ve kullanıcı paneli için tasarım sistemi ve hi-fi interaktif prototip.
Tema: **Aurora Dusk**. Layout: **Cockpit Shell**. Dil: **Türkçe** (teknik tanımlayıcılar hariç).

---

## Proje yapısı

```
/
├─ README.md                      # bu dosya
├─ colors_and_type.css            # tasarım token'ları (aurora-dusk)
└─ contenthub/
   ├─ DESIGN_SPECS.md             # tam spec (v1.4) — tüm sayfalar, ergonomi, güven, dev tools
   ├─ cockpit.css                 # cockpit layout + component library (ctxbar, rail, inspector, statusbar)
   ├─ cockpit-shell.jsx           # React shell komponentleri (CockpitShell, Inspector, Icon, vb.)
   ├─ design-system/              # 27 design-system preview kartı (tokens + components)
   │   ├─ _shell.css
   │   ├─ colors-*.html           # brand, accents, semantic, surfaces, text & border, gradients
   │   ├─ type-*.html             # display, body, numbers
   │   ├─ spacing-radius.html, shadows.html, motion.html, iconography.html, brand-logo.html
   │   ├─ layout-cockpit.html
   │   └─ components-*.html       # buttons, badges, inputs, metrics, nav, palette, drawer,
   │                              # quicklook, mediapreview, jobrow, loading, timeline
   └─ pages/                      # interaktif sayfalar (cockpit shell tabanlı)
       ├─ auth/                   # login, forgot, 2fa, onboarding, workspace-switch, session-expired
       └─ admin/                  # dashboard, (jobs, publish, wizard, palette, analytics,
                                  #  settings, audit, prompts, themes — yapım aşamasında)
```

---

## Tema: Aurora Dusk

- **Brand** — indigo-mor gradient (`#4f68f7` → `#5e39bf`), soft cyan accent (`#3bc8b8`).
- **Yüzeyler** — warm cool-white canvas, beyaz surface, koyu sidebar (`#1a1f2b`).
- **Gradient aurora** — sayfa üst kısmında radial wash (brand-8% → cyan-4%), statik, non-intrusive.
- **Tipografi** — `Geist` (sans), `Instrument Sans` (display), `Geist Mono` (mono). `font-variant-numeric: tabular-nums` her yerde.
- **Yoğunluk** — 13px base, tight padding, `compact` density default.

---

## Layout: Cockpit Shell

Üç katmanlı grid:

```
+--------------------------------------------------------+
| ctxbar  (48px — workspace + breadcrumbs + palette)     |
+----+-------------------------------+-------------------+
| r  |                               |                   |
| a  |                               |   inspector       |
| i  |         workbench             |   (340px)         |
| l  |                               |                   |
| 56 |                               |                   |
+----+-------------------------------+-------------------+
| statusbar (28px — health + render queue + env chips)   |
+--------------------------------------------------------+
```

- **Rail** — icon-only (56px), tooltip-reveal, admin/user rail ayrı.
- **Ctxbar** — workspace pill, breadcrumbs, `⌘K` palette, notifications, user.
- **Inspector** — sayfaya göre sağda kayar panel (açık/kapalı default sayfa bazlı).
- **Statusbar** — her zaman görünür: env, DB latency, SSE, render chip, tema, sürüm.

Detaylı spec: `contenthub/DESIGN_SPECS.md`.

---

## Sayfa üretim kuralları

1. Her sayfa `<CockpitShell>` ile sarılır:
   ```jsx
   <CockpitShell scope="admin" active="dashboard"
                 workspace="@ekonomi_gundem"
                 breadcrumbs={["Admin", "Gösterge paneli"]}
                 inspector={<Inspector title="…">…</Inspector>}>
     <div className="page">…</div>
   </CockpitShell>
   ```
2. `colors_and_type.css` + `cockpit.css` yüklenir, sonra `cockpit-shell.jsx` (Babel).
3. **Inline script'te `const { useState, useEffect } = React;` YAZMA** — cockpit-shell.jsx'te zaten global.
4. `scope` → rail'i belirler (`admin` / `user`).
5. `data-theme="aurora-dusk"` root'ta default.

---

## İçerik kuralları (DESIGN_SPECS.md özeti)

- **Dil Türkçe**, teknik id'ler (`BLT-2026-042`, `module_type`, `status=published`) çevrilmez.
- **Operator-to-operator ses** — marketing yok, emoji yok, ünlem yok.
- **Sentence case** başlıklarda, **mono** id'lerde ve status chip'lerde.
- **Önizleme önce** — her kayıt satırında thumbnail/waveform/QuickLook affordance'ı olmalı.
- **Snapshot-locked** — job başlayınca ayarlar donar; UI bunu belirgin şekilde gösterir.

---

## Modüller

- `standard_video` — script → TTS → subtitles → visuals → compose → render → publish
- `news_bulletin` — haber seçimi → editoryal kapı → script → TTS → compose → render → publish
- `product_review` — URL scrape → script → TTS → visuals → compose → render → publish

Yayın state machine: `draft → pending_review → approved → scheduled → published` (veya `rejected`).

---

## Versiyon

- **Spec:** v1.4 (18 Nisan 2026)
- **Tema:** Aurora Dusk
- **Sürüm:** v2.4.1
