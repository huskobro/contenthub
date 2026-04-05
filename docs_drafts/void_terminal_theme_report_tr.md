# Void Terminal Tema Raporu

## 1. Estetik Yon

**Konsept:** "Void Terminal" — Dark-first kontrol odasi estetiginde bir arayuz.
**Ilham:** Bloomberg Terminal + Linear App + Vercel Dashboard carpistirma noktasi.
**Ruh:** Koyu yuzeyler, neon yesil vurgular, keskin kenarlar, terminal-ruhlu ama rafine.

### Mevcut Temalardan Radikal Farki

| Ozellik | Obsidian Slate | Warm Earth | Void Terminal |
|---------|---------------|------------|---------------|
| Mod | Light-first | Light-first | **Dark-first** |
| Brand renk | Mavi (#4f6fff) | Turuncu (#d4882a) | **Neon yesil (#2dd55b)** |
| Heading font | Plus Jakarta Sans | DM Sans | **Outfit** |
| Body font | Plus Jakarta Sans | DM Sans | **Outfit** |
| Mono font | Geist Mono | Geist Mono | **IBM Plex Mono** |
| Radius | Buyuk (6-16px) | Buyuk (6-16px) | **Keskin (3-8px)** |
| Weight scale | 400-700 | 400-700 | **300-600 (daha hafif)** |
| Motion | 120-280ms | 120-300ms | **80-220ms (daha hizli)** |
| Easing | cubic-bezier(0.2,0,0,1) | ayni | **cubic-bezier(0.16,1,0.3,1) (daha keskin)** |
| Density | comfortable | comfortable | **compact** |
| His | Premium SaaS | Sicak, dogal | **Kontrol odasi, terminal** |

## 2. Renk Sistemi

### Brand (Neon Yesil)
Tamamen tersine cevrilmis skala — koyu tonlar kucuk rakamlarda, acik tonlar buyuk rakamlarda.
Dark theme'de acik renk uzerinde koyu okumak yerine, koyu uzerinde parlak okumak icin optimize edilmis.

```
50:  #0d1f12  (en koyu — arka plan tonu)
500: #2dd55b  (ana neon yesil — canli, dikkat cekici)
900: #d8fce4  (en acik — metin rengi olarak)
```

### Neutral (Slate-Mor Tonlu Gri)
Saf siyah degil — hafif mor/mavi kayma ile derinlik hissi:
```
0:   #0a0a0c  (neredeyse siyah — ana arka plan)
50:  #121216  (kart arka plani)
400: #3d3e4a  (guclu border)
900: #dddff0  (acik metin — hafif lavanta tonu)
```

### Surface Sistemi
```
page:        #0a0a0c  (void — tamamen koyu)
card:        #121216  (hafif yukseltilmis)
elevated:    #18181d  (daha da yukseltilmis)
inset:       #0e0e11  (sayfa altina gomulu)
sidebar:     #0a0a0c  (sayfa ile ayni — kesintisiz)
```

**Kritik fark:** Sidebar ve page ayni renk — bu, sidebar'in ayrismasi icin border'a dayanir,
Obsidian Slate'teki koyu sidebar + acik page kontrastinin tam tersi.

### Semantik Renkler
Dark theme'e uyarlanmis — `light` artik koyu tonlar (arka plan), `text` artik acik tonlar:
- Success: koyu yesil bg (#0d2818), parlak yesil text (#7cf0a0)
- Error: koyu kirmizi bg (#2d0c0e), parlak kirmizi text (#ff8a8f)
- Warning: koyu sari bg (#2a1f08), parlak sari text (#ffd580)

## 3. Tipografi

### Outfit
- **Neden:** Geometrik sans-serif ama sert degil — yumusak terminal hissi.
  Plus Jakarta Sans'in aksine daha teknik ve "engineered" karaktere sahip.
- **Weight scale:** 300-600 (daha hafif).
  Dark theme'lerde ince fontlar daha iyi okunur — bold kalin fontlar parlama yapar.
- **Letter-spacing:** tight: -0.03em (cok siki), normal: -0.01em (hafif negatif)
  Bu, dark theme'de metnin daha "yakin ve entim" hissetmesini saglar.
- **3xl size:** 2.25rem (diger temalarin 2rem'inden buyuk — editorial bas lik hissi)

### IBM Plex Mono
- **Neden:** Terminal estetiginin kalbi. JetBrains Mono'dan daha industrial,
  Geist Mono'dan daha "makineli". IBM'in tipografi geleneginden geliyor.
- **Google Fonts'ta mevcut:** Evet.

## 4. Golge Sistemi

Dark theme'de geleneksel golgeler gorulmez — bunun yerine:
- Yuksek opacity siyah golgeler (0.4-0.9) — gercek derinlik
- Her seviyede hafif neon yesil glow (rgba(45,213,91,0.05-0.06)) — ambient isik efekti
- Bu, karanliktaki ekranlarin etrafindaki isik yayilimini taklit eder

```css
xs: 0 1px 2px rgba(0,0,0,0.4), 0 0 1px rgba(45,213,91,0.05)
md: 0 4px 12px rgba(0,0,0,0.6), 0 0 2px rgba(45,213,91,0.06)
```

## 5. Radius

Kasitli olarak keskin: sm: 3px, md: 4px, lg: 6px, xl: 8px.
Obsidian Slate'in 6-16px yuvarlakligi yerine, terminal/kontrol odasi estetigine uygun
daha dikdortgen formlar. Sadece `full: 9999px` yuvarlak kaliyor (badge'ler icin).

## 6. Motion

Daha hizli, daha keskin:
- fast: 80ms (Obsidian'in 120ms'sine karsilik)
- normal: 140ms (180ms yerine)
- slow: 220ms (280ms yerine)
- easing: cubic-bezier(0.16, 1, 0.3, 1) — "snap" easing, ani baslangin + yavas bitis

## 7. Layout

- Sidebar: 220px (240px yerine — daha kompakt)
- Header: 44px (52px yerine — daha dar, daha fazla icerik alani)
- Page max width: 1400px (1280px yerine — genis ekranlardan faydalanir)
- Density: compact (comfortable yerine)

## 8. CSS Atmosferik Efektler (index.css)

### Scanline Overlay
Ultra-ince horizontal cizgiler (2px araliklarla, 0.8% beyaz opacity).
`mix-blend-mode: overlay` ile sadece dark yuzeyler uzerinde gorunur.
Retro CRT/terminal hissi verir, ama okunabilirlige zarar vermez.

### Neon Focus Glow
Dark theme'de focus outline'a 8px yesil glow eklenir.
Isletim sistemlerindeki mavi focus ring yerine, tema renklerine uyumlu.

### Neon Pulse Keyframe
Aktif/loading durumlari icin kullanilabilecek neon glow pulsasyonu.

### Terminal Blink Keyframe
Cursor-benzeri yanip sonme efekti (opsiyonel kullanim icin).

## 9. Teknik Entegrasyon

### Built-in Tema Olarak Eklendi
- `themeContract.ts`: `VOID_TERMINAL_THEME` export
- `themeStore.ts`: `BUILTIN_THEMES` dizisine eklendi
- Theme switching ile aninda gecis
- ThemeEngine Google Fonts link'i otomatik gunceller

### Geri Uyumluluk
- ThemeManifest interface degismedi
- Mevcut temalar etkilenmedi
- Tum mevcut testler gecti
- 2 yeni test eklendi (8 toplam ThemeEngine test)

## 10. Test Sonuclari

```
Test Files  179 passed (+ 2 pre-existing localStorage failures)
Tests       2301 passed (2 yeni Void Terminal testi dahil)
TypeScript  0 errors
```

## 11. Degisiklik Listesi

| Dosya | Degisiklik |
|-------|-----------|
| themeContract.ts | VOID_TERMINAL_THEME eklendi (~70 satir) |
| themeStore.ts | BUILTIN_THEMES'e void-terminal eklendi, import guncellendi |
| index.css | Google Fonts genisletildi, dark theme CSS efektleri, keyframe'ler |
| ThemeEngine.test.ts | 2 yeni test (CSS var generation + token resolution) |
| void_terminal_theme_report_tr.md | Bu rapor |

## 12. Kullanim

1. Admin panelinde Ayarlar > Temalar sayfasina git
2. "Void Terminal" temasini sec
3. "Etkinlestir" butonuna tikla
4. Tum arayuz aninda dark-mode + neon yesil + terminal estetigine gecer

Veya Command Palette (Cmd+K) ile: "tema" yazin > "Void Terminal" secin.
