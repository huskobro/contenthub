# ContentHub — Font/Tipografi Sistemi Raporu

**Tarih:** 2026-04-05
**Kapsam:** Wave 1 Final — Typography & Token System
**Durum:** TAMAMLANDI

---

## 1. Ozet

ContentHub'un tipografi sistemi, tema kontratindan turetilen ve tum uygulamada tutarli bir sekilde kullanilan cok katmanli bir yapidir. Wave 1 Final kapsaminda font aileleri, boyut skalasi, agirlik/satir yuksekligi tokenlari ve tema-bagli Google Fonts yukleme mekanizmasi tamamlandi.

---

## 2. Tipografi Mimarisi

### 2.1 Font Aileleri

Sistem uc kategoride font ailesi destekler:

| Kategori | Varsayilan (Obsidian Slate) | Warm Earth Ornegi | Kullanim |
|----------|---------------------------|-------------------|----------|
| **heading** | Inter | DM Sans | h1-h6, sayfa basliklari, Sheet basliklari |
| **body** | Inter | DM Sans | Paragraflar, etiketler, UI metni, butonlar |
| **mono** | JetBrains Mono | JetBrains Mono | Kod, ID'ler, teknik degerler, JSON |

Her font ailesi iki bilesenden olusur:
- `family`: Kisa font adi (orn: "Inter") — Google Fonts yukleme ve gosterim icin
- `stack`: Tam CSS font-family degeri fallback'lerle (orn: "'Inter', -apple-system, ...")

### 2.2 Font Boyut Skalasi

8 kademeli boyut skalasi:

| Token | Deger | Yaklasik px | Kullanim |
|-------|-------|-------------|----------|
| `xs` | 0.6875rem | ~11px | Badge'ler, ipuclari, meta bilgi |
| `sm` | 0.75rem | ~12px | Tablo hucreleri, yardimci metin |
| `base` | 0.8125rem | ~13px | Varsayilan govde metni |
| `md` | 0.875rem | ~14px | Onemli govde metni, form etiketleri |
| `lg` | 1rem | ~16px | Alt basliklar, vurgulanan metin |
| `xl` | 1.125rem | ~18px | Bolum basliklari |
| `2xl` | 1.375rem | ~22px | Sayfa alt basliklari |
| `3xl` | 1.75rem | ~28px | Sayfa ana basliklari |

### 2.3 Font Agirlik Skalasi

| Token | Deger | Kullanim |
|-------|-------|----------|
| `normal` | 400 | Govde metni |
| `medium` | 500 | Buton metni, vurgulanan etiketler |
| `semibold` | 600 | Basliklar, tablo ustbilgi |
| `bold` | 700 | Ana basliklar, vurgu |

### 2.4 Satir Yuksekligi

| Token | Deger | Kullanim |
|-------|-------|----------|
| `tight` | 1.25 | Kompakt listeler, badge'ler |
| `normal` | 1.5 | Genel govde metni |
| `relaxed` | 1.625 | Uzun metin bloklari, aciklamalar |

### 2.5 Harf Araligi (Opsiyonel)

| Token | Deger | Kullanim |
|-------|-------|----------|
| `tight` | -0.01em | Basliklar (opsiyonel sikistirma) |
| `normal` | 0 | Varsayilan |
| `wide` | 0.05em | Uppercase etiketler, kategori basliklar |

---

## 3. Token Turetim Zinciri

```
themeContract.ts (ThemeManifest tipi + DEFAULT_THEME)
        |
        v
themeEngine.ts (generateCSSVariables + resolveTokens)
        |
        +---> CSS Variables (:root'a uygulanir)
        |         --ch-font-heading, --ch-font-body, --ch-font-mono
        |         --ch-text-xs ... --ch-text-3xl
        |         --ch-weight-normal ... --ch-weight-bold
        |         --ch-leading-tight / normal / relaxed
        |
        +---> tokens.ts (statik export: typography.fontFamily, .headingFamily, .monoFamily, .size, .weight, .lineHeight)
```

### 3.1 CSS Degiskenleri

Theme engine her tema degisikliginde su CSS degiskenlerini `:root` uzerinde gunceller:

- `--ch-font-heading` — heading font stack
- `--ch-font-body` — body font stack
- `--ch-font-mono` — mono font stack
- `--ch-text-{xs|sm|base|md|lg|xl|2xl|3xl}` — boyut degerleri
- `--ch-weight-{normal|medium|semibold|bold}` — agirlik degerleri
- `--ch-leading-{tight|normal|relaxed}` — satir yuksekligi

### 3.2 Statik Token Export'lari

`tokens.ts` dosyasi DEFAULT_THEME'den turetilen statik degerler export eder:

```typescript
export const typography = {
  fontFamily: DEFAULT_THEME.typography.body.stack,
  headingFamily: DEFAULT_THEME.typography.heading.stack,
  monoFamily: DEFAULT_THEME.typography.mono.stack,
  size: { ...DEFAULT_THEME.typography.size },
  weight: { ...DEFAULT_THEME.typography.weight },
  lineHeight: { ...DEFAULT_THEME.typography.lineHeight },
} as const;
```

Bu yaklasim, inline style kullanan React bilesenleri icin compile-time erisilebilir token degerleri saglar. CSS degiskenleri ise runtime tema degisikliklerini yakalar.

---

## 4. Google Fonts Dinamik Yukleme

`themeEngine.ts` icindeki `updateGoogleFontsLink()` fonksiyonu:

1. Temanin heading, body ve mono font ailelerini toplar
2. Sistem fontlarini filtreler (system-ui, -apple-system, vb.)
3. Kalan fontlar icin Google Fonts URL'i olusturur
4. `<link>` elementi olusturur veya gunceller (ID: `contenthub-theme-fonts`)
5. Her font icin 400, 500, 600, 700 agirliklari yuklenir
6. `display=swap` ile FOUT (Flash of Unstyled Text) minimize edilir

Tema degistiginde sadece font ailesi degismisse link guncellenir; ayni kaliyorsa islem yapilmaz.

---

## 5. Sheet Bileseni Tipografi Entegrasyonu

Sheet bileseni baslik icin `headingFamily` token'ini kullanir:

```typescript
fontFamily: typography.headingFamily
```

Bu sayede Sheet baslik metni, temanin heading fontuyla render edilir.

---

## 6. Test Kapsami

- `ThemeEngine.test.ts` — CSS degisken uretimi, font stack dogru cikti dogrulamasi (12 test)
- `themeStore.test.ts` — farkli font aileleri ile tema import/export (14 test)

Tum testler BASARILI.

---

## 7. Bilinen Sinirlamalar

1. Google Fonts yukleme aglantisi icerir; cevrimdisi kullanimda fallback font stack devreye girer
2. Variable font destegi henuz yok; her agirlik ayri dosya olarak yuklenir
3. Font yukleme durumu (loading/loaded/error) bilesen seviyesinde izlenmiyor
4. Custom font dosyasi yukleme (self-hosted) Wave 2 adayi

---

## 8. Dosya Referanslari

| Dosya | Konum |
|-------|-------|
| Tema kontrati | `src/components/design-system/themeContract.ts` |
| Tema motoru | `src/components/design-system/themeEngine.ts` |
| Statik tokenlar | `src/components/design-system/tokens.ts` |
| ThemeProvider | `src/components/design-system/ThemeProvider.tsx` |
