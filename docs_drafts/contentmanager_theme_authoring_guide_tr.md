# ContentHub — AI Uyumlu Tema Yazarligi Rehberi

**Tarih:** 2026-04-05
**Kapsam:** Wave 1 Final — Theme Authoring Guide
**Hedef Kitle:** Admin kullanicilar, AI asistanlari, tasarimcilar

---

## 1. Giris

Bu rehber, ContentHub icin yeni tema olusturma surecini aciklar. Temalar, ThemeManifest JSON formatinda tanimlanir ve sistem tarafindan otomatik dogrulanir. Bir AI modeline bu belge veya `themeContract.ts` dosyasi verilerek gecerli bir tema uretilmesi mumkundur.

---

## 2. Hizli Baslangic

### 2.1 AI ile Tema Uretme

Bir AI'ye (ChatGPT, Claude, vb.) su prompt'u verin:

> "ContentHub icin bir ThemeManifest JSON uret. Tema minimalist, soguk mavi tonlarinda ve profesyonel olmali. Asagidaki tipe uygun olmali: [themeContract.ts iceriginini yapistir]"

Veya mevcut bir temayi export edip referans olarak verin:

> "Bu JSON'u referans al ve ondan farkli olarak sicak turuncu/amber tonlarinda bir tema uret."

### 2.2 Manuel Tema Olusturma

1. ThemeRegistryPage'de mevcut bir temayi "Disari Aktar" ile JSON olarak kopyalayin
2. JSON'u bir metin editorde acin
3. Degerleri degistirin
4. `id` alanini benzersiz bir kebab-case deger yapin
5. ThemeRegistryPage'de "Import Et" ile sisteme yukleyin

---

## 3. ThemeManifest Yapisi

### 3.1 Zorunlu Ust-Duzey Alanlar

```json
{
  "id": "my-custom-theme",
  "name": "My Custom Theme",
  "description": "Tema aciklamasi buraya gelir.",
  "author": "kullanici-adi",
  "version": "1.0.0",
  "tone": ["minimal", "cool", "professional"],
  "density": "comfortable"
}
```

**Kurallar:**
- `id`: Kebab-case, benzersiz (orn: `ocean-breeze`, `warm-sunset`)
- `name`: Insan-okunur isim
- `description`: Kisa karakter aciklamasi
- `author`: Yazar adi veya "ai-generated"
- `version`: Semantik versiyon (orn: "1.0.0")
- `tone`: String dizisi — temanin ton/karakter anahtar kelimeleri
- `density`: `"compact"`, `"comfortable"` veya `"spacious"`

### 3.2 Typography

```json
{
  "typography": {
    "heading": {
      "family": "Playfair Display",
      "stack": "'Playfair Display', Georgia, serif"
    },
    "body": {
      "family": "Source Sans Pro",
      "stack": "'Source Sans Pro', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    "mono": {
      "family": "Fira Code",
      "stack": "'Fira Code', 'SF Mono', monospace"
    },
    "size": {
      "xs": "0.6875rem",
      "sm": "0.75rem",
      "base": "0.8125rem",
      "md": "0.875rem",
      "lg": "1rem",
      "xl": "1.125rem",
      "2xl": "1.375rem",
      "3xl": "1.75rem"
    },
    "weight": { "normal": 400, "medium": 500, "semibold": 600, "bold": 700 },
    "lineHeight": { "tight": 1.25, "normal": 1.5, "relaxed": 1.625 },
    "letterSpacing": { "tight": "-0.01em", "normal": "0", "wide": "0.05em" }
  }
}
```

**Ipuclari:**
- Google Fonts'tan font secerseniz, sistem otomatik olarak Google Fonts linkini olusturur
- `family` kisa ad (Google Fonts'taki isim), `stack` CSS fallback'lerle tam deger olmali
- `letterSpacing` opsiyoneldir, belirtilmezse varsayilan uygulanir
- Boyut skalasini degistirmek genellikle onerilmez — tutarlilik icin varsayilanlari koruyun

### 3.3 Colors

```json
{
  "colors": {
    "brand": {
      "50": "#f0f9ff", "100": "#e0f2fe", "200": "#bae6fd",
      "300": "#7dd3fc", "400": "#38bdf8", "500": "#0ea5e9",
      "600": "#0284c7", "700": "#0369a1", "800": "#075985",
      "900": "#0c4a6e"
    },
    "neutral": {
      "0": "#ffffff", "25": "#fcfcfd", "50": "#f8fafc",
      "100": "#f1f5f9", "200": "#e2e8f0", "300": "#cbd5e1",
      "400": "#94a3b8", "500": "#64748b", "600": "#475569",
      "700": "#334155", "800": "#1e293b", "900": "#0f172a",
      "950": "#020617"
    },
    "success": { "light": "#dcfce7", "base": "#22c55e", "dark": "#15803d", "text": "#14532d" },
    "warning": { "light": "#fef9c3", "base": "#eab308", "dark": "#a16207", "text": "#713f12" },
    "error": { "light": "#fee2e2", "base": "#ef4444", "dark": "#b91c1c", "text": "#7f1d1d" },
    "info": { "light": "#dbeafe", "base": "#3b82f6", "dark": "#1d4ed8", "text": "#1e3a5f" },
    "surface": {
      "page": "#f8fafc",
      "card": "#ffffff",
      "elevated": "#ffffff",
      "inset": "#f1f5f9",
      "sidebar": "#0f172a",
      "sidebarHover": "#1e293b",
      "sidebarActive": "#334155"
    },
    "border": { "subtle": "#e2e8f0", "default": "#cbd5e1", "strong": "#94a3b8" },
    "focus": "#0284c7",
    "chart": ["#0284c7", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#ec4899"]
  }
}
```

**Ipuclari:**
- Brand skalasi 10 kademe (50-900), aciktan koyuya — 500-600 ana vurgu rengi
- Neutral skalasi 13 kademe (0-950) — sidebar koyu renk icin 900-950 kullanin
- Semantik renkler (success/warning/error/info): `light` arka plan, `base` ikon/badge, `dark` hover, `text` metin rengi
- Surface: `sidebar` koyu olmali (dark shell tasarimi), `page` acik olmali
- `chart` opsiyoneldir; belirtilmezse varsayilan kullanilir

### 3.4 Spacing, Radius, Shadow, Motion, Layout

```json
{
  "spacing": {
    "0": "0", "1": "0.25rem", "2": "0.5rem", "3": "0.75rem",
    "4": "1rem", "5": "1.25rem", "6": "1.5rem", "8": "2rem",
    "10": "2.5rem", "12": "3rem", "16": "4rem"
  },
  "radius": { "sm": "4px", "md": "6px", "lg": "8px", "xl": "12px", "full": "9999px" },
  "shadow": {
    "xs": "0 1px 2px rgba(0,0,0,0.04)",
    "sm": "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    "md": "0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)",
    "lg": "0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.04)"
  },
  "motion": { "fast": "120ms", "normal": "180ms", "slow": "280ms", "easing": "ease" },
  "layout": {
    "sidebarWidth": "240px",
    "sidebarCollapsedWidth": "56px",
    "headerHeight": "52px",
    "pageMaxWidth": "1280px",
    "pagePadding": "1.5rem"
  }
}
```

**Ipuclari:**
- Spacing degerlerini degistirmek yerlesimi bozabilir — dikkatli olun
- Radius degerlerini artirmak daha "yumusak" bir gorunum verir
- Shadow'larda rgba alfa degerini temanin tonuna gore ayarlayin (sicak tema = kahverengi shadow)
- Motion degerlerini hizlandirmak daha "cevval" his verir
- Layout degerlerini degistirmek genellikle onerilmez

---

## 4. Dogrulama

Tema import edildiginde `validateThemeManifest()` otomatik calisir. Hata mesajlari Turkcedir.

### Yaygin Hatalar

| Hata | Sebep | Cozum |
|------|-------|-------|
| "id bos olmayan bir string olmali" | id alani eksik veya bos | Benzersiz kebab-case ID ekleyin |
| "ID kebab-case formatinda olmali" | Bosluk veya buyuk harf var | Sadece kucuk harf, rakam ve tire kullanin |
| "tone bir string dizisi olmali" | tone obje veya string | `["keyword1", "keyword2"]` formatinda yapin |
| "brand renk skalasi zorunlu" | colors.brand eksik | 50-900 arasi 10 renk tanimlayin |
| "success.light string olmali" | Semantik renk degeri eksik | light/base/dark/text degerlerini tamamlayin |

---

## 5. En Iyi Uygulamalar

### 5.1 Renk Uyumu

- Brand skalasinda 50 en acik, 900 en koyu olmali — monoton gecis saglayin
- Neutral skalasinda 0 saf beyaz, 950 neredeyse siyah olmali
- Semantik renkler evrensel anlam tasir — success=yesil, error=kirmizi gelenegini koruyun
- Sidebar her zaman koyu olmali (dark shell tasarimi)

### 5.2 Font Secimi

- Heading ve body icin ayni font kullanmak tutarli ama monoton olabilir
- Farkli fontlar kullanmak karakter katar ama uyum onemli
- Mono font her zaman monospace ailesinden olmali
- Google Fonts'tan secilen fontlar otomatik yuklenir
- Sistem fontlari (system-ui, -apple-system) Google Fonts yuklemesi gerektirmez

### 5.3 Tema Test Etme

1. Import ettikten sonra "Onizle" ile gorsel kontrolu yapin
2. "Aktif Et" ile tum uygulamaya uygulayin
3. Farkli sayfalari (Dashboard, Jobs, Settings) kontrol edin
4. Badge, buton, tablo ve form gorunumlerini dogrulayin
5. Sidebar ve header gorunumunu kontrol edin

---

## 6. AI Prompt Ornekleri

### Minimalist Tema

> "ContentHub ThemeManifest JSON uret. Tema minimalist ve monokrom olmali. Brand rengi gri tonlarinda, heading fontu 'Space Grotesk', body fontu 'IBM Plex Sans'. Density compact."

### Sicak Tema

> "ContentHub ThemeManifest JSON uret. Tema sicak ve davetkar olmali. Brand rengi amber/turuncu, heading fontu 'Lora', body fontu 'Nunito'. Sidebar koyu kahverengi. Radius degerleri biraz buyuk (yumusak kenarlar)."

### Kurumsal Tema

> "ContentHub ThemeManifest JSON uret. Tema kurumsal ve ciddi olmali. Brand rengi lacivert, heading fontu 'Merriweather', body fontu 'Open Sans'. Shadow degerleri hafif, motion hizli."

---

## 7. Referans: Tam ThemeManifest Tip Yapisi

```typescript
interface ThemeManifest {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tone: string[];
  typography: {
    heading: { family: string; stack: string };
    body: { family: string; stack: string };
    mono: { family: string; stack: string };
    size: { xs, sm, base, md, lg, xl, "2xl", "3xl": string };
    weight: { normal, medium, semibold, bold: number };
    lineHeight: { tight, normal, relaxed: number };
    letterSpacing?: { tight, normal, wide: string };
  };
  colors: {
    brand: { 50-900: string };
    neutral: { 0, 25, 50, 100-900, 950: string };
    success: { light, base, dark, text: string };
    warning: { light, base, dark, text: string };
    error: { light, base, dark, text: string };
    info: { light, base, dark, text: string };
    surface: { page, card, elevated, inset, sidebar, sidebarHover, sidebarActive: string };
    border: { subtle, default, strong: string };
    focus: string;
    chart?: string[];
  };
  spacing: { 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16: string };
  radius: { sm, md, lg, xl, full: string };
  shadow: { xs, sm, md, lg: string };
  motion: { fast, normal, slow, easing: string };
  layout: { sidebarWidth, sidebarCollapsedWidth, headerHeight, pageMaxWidth, pagePadding: string };
  density: "compact" | "comfortable" | "spacious";
}
```
