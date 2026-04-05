# ContentHub — Tema Kontrat/Manifest Sistemi Raporu

**Tarih:** 2026-04-05
**Kapsam:** Wave 1 Final — Theme Contract System
**Durum:** TAMAMLANDI

---

## 1. Ozet

ContentHub icin tamamen tip-guvenli, AI-uyumlu ve genisletilebilir bir tema kontrat sistemi (ThemeManifest) tasarlandi ve uygulamaya alindi. Bu sistem, uygulamanin tum gorsel tokenlarini tek bir kanonical manifest formatinda tanimlar. Herhangi bir AI modeline `themeContract.ts` dosyasi verilerek gecerli bir tema JSON'i uretilmesi mumkundur.

---

## 2. Mimari Kararlar

### 2.1 Tek Kaynak Ilkesi (Single Source of Truth)

Tema kontrati, tum gorsel degerlerin tek yetkili kaynagidir:

- `themeContract.ts` — tip tanimlari, varsayilan tema, dogrulama fonksiyonu
- `themeEngine.ts` — manifest'ten CSS degiskenleri uretimi ve DOM'a uygulama
- `tokens.ts` — DEFAULT_THEME'den turetilen statik export'lar (geriye uyumluluk)
- `themeStore.ts` — Zustand ile aktif tema yonetimi ve localStorage kaliciligi

### 2.2 ThemeManifest Tip Yapisi

ThemeManifest asagidaki alt-sistemleri kapsar:

| Alan | Tip | Aciklama |
|------|-----|----------|
| `id` | `string` | Kebab-case benzersiz tanimlayici |
| `name` | `string` | Insan-okunur tema adi |
| `description` | `string` | Tema karakteri aciklamasi |
| `author` | `string` | Yazar ("system" veya kullanici) |
| `version` | `string` | Semantik surum |
| `tone` | `string[]` | Marka/ton anahtar kelimeleri |
| `typography` | `ThemeTypography` | Font aileleri, boyut skalasi, agirlik, satir yuksekligi |
| `colors` | `ThemeColors` | Brand skalasi (50-900), neutral skalasi (0-950), semantik renkler, surface, border |
| `spacing` | `ThemeSpacing` | 0-16 arasi bosluk skalasi |
| `radius` | `ThemeRadius` | sm/md/lg/xl/full kenar yuvarlakligi |
| `shadow` | `ThemeShadow` | xs/sm/md/lg golge skalasi |
| `motion` | `ThemeMotion` | fast/normal/slow sure + easing |
| `layout` | `ThemeLayout` | Sidebar genisligi, header yuksekligi, sayfa max-genislik |
| `density` | `ThemeDensity` | "compact" / "comfortable" / "spacious" |

### 2.3 Tipografi Alt-Sistemi

Uc font ailesi desteklenir:
- **heading** — Baslik fontlari (h1-h6, sayfa basliklari)
- **body** — Govde metni (paragraflar, etiketler, UI metni)
- **mono** — Monospace (kod, ID'ler, teknik degerler)

Her font ailesi `family` (kisa ad) ve `stack` (tam CSS font-family) icerir.

### 2.4 Renk Sistemi

- **Brand skalasi:** 10 kademe (50-900) — marka kimligini tanimlar
- **Neutral skalasi:** 13 kademe (0-950) — gri tonlari
- **Semantik renkler:** success, warning, error, info — her biri light/base/dark/text
- **Surface renkleri:** page, card, elevated, inset, sidebar, sidebarHover, sidebarActive
- **Border renkleri:** subtle, default, strong
- **Focus rengi:** Tek deger
- **Chart renkleri:** Opsiyonel dizi

---

## 3. Yerlesik Temalar

### 3.1 Obsidian Slate (Varsayilan)

- **ID:** `obsidian-slate`
- **Font:** Inter (heading + body), JetBrains Mono (mono)
- **Ton:** professional, clean, modern, neutral
- **Brand rengi:** Indigo skalasi (#f0f4ff - #364fc7)
- **Sidebar:** Koyu (#1a1b1e)
- **Yogunluk:** comfortable

### 3.2 Warm Earth (Ornek)

- **ID:** `warm-earth`
- **Font:** DM Sans (heading + body), JetBrains Mono (mono)
- **Ton:** warm, natural, calm, earthy
- **Brand rengi:** Toprak/amber skalasi (#fdf8f0 - #5e3714)
- **Sidebar:** Koyu toprak (#252119)
- **Yogunluk:** comfortable

---

## 4. Dogrulama Sistemi (validateThemeManifest)

`validateThemeManifest(manifest: unknown)` fonksiyonu:

1. Root obje kontrolu
2. Zorunlu string alanlar: id, name, description, author, version
3. ID format kontrolu (kebab-case regex)
4. Tone dizisi kontrolu
5. Density enum kontrolu
6. Typography alt-obje kontrolu (heading, body, mono font tanimlari, size skalasi)
7. Colors alt-obje kontrolu (brand, neutral, semantik, surface, border)
8. Spacing, radius, shadow, motion, layout obje kontrolu

Hata donusu: `ThemeValidationError[]` — her hata `path` ve `message` icerir.
Bos dizi = gecerli manifest.

---

## 5. AI Uyumluluk

Sistem su sekilde AI-uyumlu tasarlandi:

1. `themeContract.ts` dosyasi kendi basina yeterli dokumantasyon icerir
2. Her interface JSDoc ile aciklanmistir
3. DEFAULT_THEME tam referans ornegi olarak kullanilabilir
4. EXAMPLE_WARM_EARTH_THEME ikinci bir ornek saglar
5. Dogrulama fonksiyonu detayli Turkce hata mesajlari uretir

Bir AI'ye verilecek prompt ornegi:
> "Bu ThemeManifest tipine uygun, minimalist ve soguk tonlarda bir tema JSON'i uret."

---

## 6. Test Kapsami

- `themeContract.test.ts` kapsaminda dogrulama fonksiyonu testleri
- `themeStore.test.ts` — 14 test (import, export, remove, persistence, dogrulama)
- `ThemeEngine.test.ts` — 12 test (CSS degisken uretimi, DOM uygulama, font yukleme)

Tum testler BASARILI.

---

## 7. Bilinen Sinirlamalar

1. Tema kontrati simdilik yalnizca light mode destekler; dark mode icin ayri bir manifest veya colors alt-seti gerekebilir (Wave 2 adayi)
2. Chart renkleri opsiyoneldir; grafik bilesenleri fallback kullanir
3. `letterSpacing` opsiyoneldir, eksikse varsayilan uygulanir
4. Tema versiyonlama henuz semantik diff desteklemez

---

## 8. Dosya Referanslari

| Dosya | Konum |
|-------|-------|
| Tema kontrati | `src/components/design-system/themeContract.ts` |
| Tema motoru | `src/components/design-system/themeEngine.ts` |
| Token turetimi | `src/components/design-system/tokens.ts` |
| Tema store | `src/stores/themeStore.ts` |
| ThemeProvider | `src/components/design-system/ThemeProvider.tsx` |
| Tema Registry sayfasi | `src/pages/admin/ThemeRegistryPage.tsx` |
