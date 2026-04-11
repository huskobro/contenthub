/**
 * Radical Theme Collection — 5 completely different DESIGN SYSTEMS
 *
 * These are NOT color swaps. Each theme radically changes:
 * - Layout proportions (sidebar width, header height, page padding)
 * - Typography scale & hierarchy
 * - Border radius philosophy (brutalist 0px → pillowed 24px)
 * - Shadow depth & style
 * - Motion timing & easing curves
 * - Density (compact/comfortable/spacious)
 * - Plus unique CSS effects per theme in index.css
 *
 * 1. Midnight Ultraviolet: Cyberpunk glass-panel OS — compact density, tight grid, holographic glow
 * 2. Arctic Frost: Swiss minimal print — spacious airy, huge radius, whisper-thin shadows
 * 3. Tokyo Neon: Akihabara arcade terminal — ultra-compact, tight type, neon bleed
 * 4. Ink & Wire: Broadsheet newspaper — tall type, editorial spacing, zero radius, ink shadows
 * 5. Solar Ember: Industrial control panel — brutalist grid, monospace-heavy, ember glow
 */

import type { ThemeManifest } from "./themeContract";

// ---------------------------------------------------------------------------
// 1. Midnight Ultraviolet — Cyberpunk glass-panel OS
//    Think: Figma's dark mode × holographic UI × glassmorphism
//    Radical: wide sidebar, thin header, pill-shaped buttons, frosted glass cards
// ---------------------------------------------------------------------------

export const MIDNIGHT_ULTRAVIOLET_THEME: ThemeManifest = {
  id: "midnight-ultraviolet",
  name: "Midnight Ultraviolet",
  description: "Derin mor ve elektrik mavi ile cyberpunk cam-panel arayuzu. Genis sidebar, ince header, buzlu cam kartlar, holografik vurgular.",
  author: "system",
  version: "2.0.0",
  tone: ["dark", "cyberpunk", "ultraviolet", "glass", "futuristic"],

  typography: {
    heading: {
      family: "Space Grotesk",
      stack: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Inter",
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "JetBrains Mono",
      stack: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    },
    size: {
      xs: "0.625rem",     // smaller base — compact cyberpunk feel
      sm: "0.6875rem",
      base: "0.75rem",
      md: "0.8125rem",
      lg: "0.9375rem",
      xl: "1.125rem",
      "2xl": "1.625rem",  // big jump for headings
      "3xl": "2.5rem",    // hero-sized headings
    },
    weight: { normal: 300, medium: 400, semibold: 500, bold: 700 },
    lineHeight: { tight: 1.15, normal: 1.45, relaxed: 1.6 },
    letterSpacing: { tight: "-0.03em", normal: "-0.01em", wide: "0.12em" },
  },

  colors: {
    brand: {
      // Faz 6 kontrast fix: Brand skalası standart light→dark yönüne
      // çevrildi. Primary button (bg-gradient brand-600→brand-700 +
      // text-white) için 600 #7c3aed = 5.70:1, 700 #6d28d9 = 7.98:1.
      // Holografik mor vurgu 300-500 aralığında korundu.
      50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd",
      400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9",
      800: "#5b21b6", 900: "#4c1d95",
    },
    neutral: {
      // Faz 6 kontrast fix: n500 #5c577a (2.78:1) AA altındaydı.
      // Skala açıldı: n500 → #8d88a8 (5.58:1), n600 → #a5a0c0 (7.53:1),
      // n700 → #c4bfdb (9.91:1).
      0: "#09080f", 25: "#0d0b16", 50: "#11101c", 100: "#191726",
      200: "#221f33", 300: "#2e2b42", 400: "#433f5b", 500: "#8d88a8",
      600: "#a5a0c0", 700: "#c4bfdb", 800: "#d8d4e8", 900: "#e6e4f0",
      950: "#f4f3f9",
    },
    success: { light: "#0d2618", base: "#10b981", dark: "#059669", text: "#6ee7b7" },
    warning: { light: "#2a1a05", base: "#f59e0b", dark: "#d97706", text: "#fcd34d" },
    error: { light: "#2d0a12", base: "#ef4444", dark: "#dc2626", text: "#fca5a5" },
    info: { light: "#0c1a33", base: "#6366f1", dark: "#4f46e5", text: "#a5b4fc" },
    surface: {
      // Faz 6 kontrast fix: sidebarSection #5c577a karanlık sidebar
      // #0d0b16 üzerinde 2.88:1 (FAIL) idi. neutral.600 (#a5a0c0, 7.53:1)
      // değerine kaydırılarak AA'yı geçer hale getirildi.
      page: "#09080f", card: "#11101c", elevated: "#191726",
      inset: "#0d0b16", sidebar: "#0d0b16", sidebarHover: "#191726",
      sidebarActive: "#221f33",
      sidebarText: "#e6e4f0", sidebarTextMuted: "#7f7a9c",
      sidebarTextActive: "#c4b5fd", sidebarSection: "#a5a0c0",
      sidebarBorder: "#2e2b42",
    },
    border: { subtle: "#221f33", default: "#2e2b42", strong: "#433f5b" },
    focus: "#8b5cf6",
    chart: ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#f97316"],
  },

  spacing: {
    0: "0", 1: "0.2rem", 2: "0.4rem", 3: "0.6rem", 4: "0.8rem",
    5: "1rem", 6: "1.2rem", 8: "1.6rem", 10: "2rem", 12: "2.4rem", 16: "3.2rem",
  },

  // Pill-shaped: large radius for that futuristic glass-panel look
  radius: { sm: "8px", md: "12px", lg: "16px", xl: "24px", full: "9999px" },

  // Colored glow shadows — purple tinted
  shadow: {
    xs: "0 1px 3px rgba(139,92,246,0.08), 0 1px 2px rgba(0,0,0,0.5)",
    sm: "0 2px 8px rgba(139,92,246,0.10), 0 1px 3px rgba(0,0,0,0.6)",
    md: "0 4px 16px rgba(139,92,246,0.12), 0 2px 6px rgba(0,0,0,0.5)",
    lg: "0 8px 32px rgba(139,92,246,0.15), 0 4px 10px rgba(0,0,0,0.6)",
    xl: "0 20px 60px rgba(139,92,246,0.18), 0 8px 20px rgba(0,0,0,0.7)",
    "2xl": "0 32px 80px rgba(139,92,246,0.22), 0 16px 32px rgba(0,0,0,0.8)",
  },

  // Snappy, springy motion
  motion: { fast: "80ms", normal: "140ms", slow: "220ms", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },

  layout: {
    sidebarWidth: "272px",             // wider sidebar — more breathing room
    sidebarCollapsedWidth: "64px",     // wider collapsed too
    headerHeight: "42px",              // thin header — cyberpunk compact
    pageMaxWidth: "1440px",            // wider content area
    pagePadding: "1.25rem",
  },

  density: "compact",
};

// ---------------------------------------------------------------------------
// 2. Arctic Frost — Swiss minimal print design
//    Think: Dieter Rams × Apple.com × Linear × ultra-whitespace
//    Radical: huge padding, enormous radius, almost no shadows, white sidebar
// ---------------------------------------------------------------------------

export const ARCTIC_FROST_THEME: ThemeManifest = {
  id: "arctic-frost",
  name: "Arctic Frost",
  description: "Isvicre minimal baski tasarimi. Genis bosluklar, buyuk radius, neredeyse sifir golge. Beyaz sidebar, havali ve ferah.",
  author: "system",
  version: "2.0.0",
  tone: ["minimal", "frost", "swiss", "airy", "clean", "light"],

  typography: {
    heading: {
      family: "Instrument Sans",
      stack: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Instrument Sans",
      stack: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "Geist Mono",
      stack: "'Geist Mono', 'JetBrains Mono', 'SF Mono', monospace",
    },
    size: {
      xs: "0.75rem",      // larger base — spacious reading
      sm: "0.8125rem",
      base: "0.875rem",
      md: "0.9375rem",
      lg: "1.0625rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "2rem",       // modest headings — swiss restraint
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.3, normal: 1.6, relaxed: 1.8 },
    letterSpacing: { tight: "-0.015em", normal: "0.005em", wide: "0.1em" },
  },

  colors: {
    brand: {
      // Faz 6 kontrast fix: Eski primary button brand.500 #0ea5e9 +
      // white = 2.77:1 AA altındaydı. Skala bir ton koyulaştırıldı —
      // brand.500 artık #0284c7 (4.10 LG), brand.600 #0369a1 (5.93 OK),
      // brand.700 #075985 (7.56). Swiss minimal mavi kimlik korundu.
      50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc",
      400: "#38bdf8", 500: "#0284c7", 600: "#0369a1", 700: "#075985",
      800: "#0c4a6e", 900: "#082f49",
    },
    neutral: {
      0: "#ffffff", 25: "#fdfdfe", 50: "#f9fafb", 100: "#f3f4f6",
      200: "#e5e7eb", 300: "#d1d5db", 400: "#9ca3af", 500: "#6b7280",
      600: "#4b5563", 700: "#374151", 800: "#1f2937", 900: "#111827",
      950: "#030712",
    },
    success: { light: "#ecfdf5", base: "#22c55e", dark: "#16a34a", text: "#15803d" },
    warning: { light: "#fffbeb", base: "#eab308", dark: "#ca8a04", text: "#a16207" },
    error: { light: "#fef2f2", base: "#ef4444", dark: "#dc2626", text: "#b91c1c" },
    info: { light: "#eff6ff", base: "#3b82f6", dark: "#2563eb", text: "#1d4ed8" },
    surface: {
      // Faz 6 kontrast fix: sidebarSection #9ca3af beyaz sidebar üzerinde
      // 2.54:1 (FAIL) idi. #6b7280 (4.83:1) yapıldı — Swiss section
      // header'lar artık net okunuyor. sidebarTextActive eski brand.700
      // referansı #0369a1 olarak literal kalıyor.
      page: "#f9fafb", card: "#ffffff", elevated: "#ffffff",
      inset: "#f3f4f6", sidebar: "#ffffff", sidebarHover: "#f3f4f6",
      sidebarActive: "#e0f2fe",
      sidebarText: "#111827", sidebarTextMuted: "#6b7280",
      sidebarTextActive: "#0369a1", sidebarSection: "#6b7280",
      sidebarBorder: "#e5e7eb",
    },
    border: { subtle: "#f3f4f6", default: "#e5e7eb", strong: "#d1d5db" },
    focus: "#0ea5e9",
    chart: ["#0ea5e9", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"],
  },

  spacing: {
    0: "0", 1: "0.125rem", 2: "0.25rem", 3: "0.375rem", 4: "0.5rem",
    5: "0.75rem", 6: "1rem", 8: "1.25rem", 10: "1.5rem", 12: "2rem", 16: "2.5rem",
  },

  // Super-rounded — pillowy, soft, Apple-inspired
  radius: { sm: "12px", md: "16px", lg: "20px", xl: "28px", full: "9999px" },

  // Whisper-thin shadows — almost flat design
  shadow: {
    xs: "0 0 0 1px rgba(0,0,0,0.03)",
    sm: "0 1px 2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)",
    md: "0 2px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)",
    lg: "0 4px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)",
    xl: "0 8px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)",
    "2xl": "0 16px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)",
  },

  // Slow, gentle, breathing motion
  motion: { fast: "180ms", normal: "320ms", slow: "500ms", easing: "cubic-bezier(0.4, 0, 0.2, 1)" },

  layout: {
    sidebarWidth: "280px",             // wide sidebar — room to breathe
    sidebarCollapsedWidth: "72px",
    headerHeight: "44px",              // compact header
    pageMaxWidth: "1120px",            // narrow content — reading-optimized
    pagePadding: "1.25rem",            // compact padding
  },

  density: "compact",
};

// ---------------------------------------------------------------------------
// 3. Tokyo Neon — Akihabara arcade terminal
//    Think: Cyberpunk 2077 UI × retro arcade × dense data displays
//    Radical: ultra-compact, monospace-influenced, neon bleed, thin sidebar
// ---------------------------------------------------------------------------

export const TOKYO_NEON_THEME: ThemeManifest = {
  id: "tokyo-neon",
  name: "Tokyo Neon",
  description: "Akihabara arcade terminal estetiği. Ultra-sıkı, monospace ağırlıklı, neon pembe bleed. Dar sidebar, yoğun bilgi gösterimi.",
  author: "system",
  version: "2.0.0",
  tone: ["dark", "neon", "arcade", "dense", "terminal", "nightlife"],

  typography: {
    heading: {
      family: "Sora",
      stack: "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Nunito Sans",
      stack: "'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "Fira Code",
      stack: "'Fira Code', 'JetBrains Mono', 'SF Mono', monospace",
    },
    size: {
      xs: "0.625rem",     // tiny — arcade density
      sm: "0.6875rem",
      base: "0.75rem",
      md: "0.8125rem",
      lg: "0.875rem",
      xl: "1rem",
      "2xl": "1.25rem",
      "3xl": "1.75rem",   // restrained headings
    },
    weight: { normal: 400, medium: 600, semibold: 700, bold: 800 },
    lineHeight: { tight: 1.1, normal: 1.35, relaxed: 1.5 },
    letterSpacing: { tight: "-0.02em", normal: "0.01em", wide: "0.2em" },
  },

  colors: {
    brand: {
      // Faz 6 kontrast fix: Brand skalası standart light→dark yönüne
      // çevrildi. Primary button (bg-gradient brand-600→brand-700 +
      // text-white) için 600 #db2777 = 4.60:1, 700 #be185d = 6.04:1.
      // Akihabara neon pembe 400-500 aralığında korundu; sidebar neon
      // vurgusu #f9a8d4 literal olarak sidebarTextActive'de saklanıyor.
      50: "#fdf2f8", 100: "#fce7f3", 200: "#fbcfe8", 300: "#f9a8d4",
      400: "#f472b6", 500: "#ec4899", 600: "#db2777", 700: "#be185d",
      800: "#9d174d", 900: "#831843",
    },
    neutral: {
      // Faz 6 kontrast fix: n500 #655e85 (3.07:1) küçük metinler için
      // sınırdaydı. Skala açıldı: n500 → #9590b4 (6.09:1),
      // n600 → #a9a5c2 (7.77:1).
      0: "#0c0a14", 25: "#100e1a", 50: "#15121f", 100: "#1c1929",
      200: "#252237", 300: "#332e4a", 400: "#4a4466", 500: "#9590b4",
      600: "#a9a5c2", 700: "#c2bed6", 800: "#d5d1e4", 900: "#e8e6f0",
      950: "#f5f4f9",
    },
    success: { light: "#0c2a1b", base: "#34d399", dark: "#10b981", text: "#6ee7b7" },
    warning: { light: "#2a1e05", base: "#fbbf24", dark: "#f59e0b", text: "#fde68a" },
    error: { light: "#2e0a0a", base: "#f87171", dark: "#ef4444", text: "#fecaca" },
    info: { light: "#0c1633", base: "#818cf8", dark: "#6366f1", text: "#c7d2fe" },
    surface: {
      page: "#0c0a14", card: "#15121f", elevated: "#1c1929",
      inset: "#100e1a", sidebar: "#100e1a", sidebarHover: "#1c1929",
      sidebarActive: "#252237",
      // Faz 6 kontrast fix: sidebarSection #655e85 (3.18:1 LG sınırı) →
      // n600 #a9a5c2 (7.89:1) — section başlıkları AA geçiyor.
      sidebarText: "#e8e6f0", sidebarTextMuted: "#8580a4",
      sidebarTextActive: "#f9a8d4", sidebarSection: "#a9a5c2",
      sidebarBorder: "#332e4a",
    },
    border: { subtle: "#252237", default: "#332e4a", strong: "#4a4466" },
    focus: "#ec4899",
    chart: ["#ec4899", "#818cf8", "#fbbf24", "#f87171", "#34d399", "#fb923c", "#a78bfa"],
  },

  spacing: {
    0: "0", 1: "0.125rem", 2: "0.25rem", 3: "0.375rem", 4: "0.5rem",
    5: "0.75rem", 6: "1rem", 8: "1.25rem", 10: "1.5rem", 12: "2rem", 16: "2.5rem",
  },

  // Sharp corners — arcade/terminal feel
  radius: { sm: "2px", md: "3px", lg: "4px", xl: "6px", full: "9999px" },

  // Neon glow shadows
  shadow: {
    xs: "0 0 2px rgba(236,72,153,0.12), 0 1px 2px rgba(0,0,0,0.5)",
    sm: "0 0 4px rgba(236,72,153,0.15), 0 1px 3px rgba(0,0,0,0.6)",
    md: "0 0 8px rgba(236,72,153,0.12), 0 2px 6px rgba(0,0,0,0.5)",
    lg: "0 0 16px rgba(236,72,153,0.15), 0 4px 10px rgba(0,0,0,0.6)",
    xl: "0 0 32px rgba(236,72,153,0.18), 0 8px 20px rgba(0,0,0,0.7)",
    "2xl": "0 0 48px rgba(236,72,153,0.22), 0 14px 30px rgba(0,0,0,0.8)",
  },

  // Lightning-fast, snappy transitions
  motion: { fast: "60ms", normal: "100ms", slow: "160ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },

  layout: {
    sidebarWidth: "200px",             // narrow sidebar — max content space
    sidebarCollapsedWidth: "44px",     // ultra-thin collapsed
    headerHeight: "38px",              // razor-thin header
    pageMaxWidth: "1600px",            // extra-wide — data-dense layout
    pagePadding: "0.75rem",            // tight padding
  },

  density: "compact",
};

// ---------------------------------------------------------------------------
// 4. Ink & Wire — Broadsheet newspaper / editorial gazette
//    Think: NYT × The Economist × printed broadsheet × typography-first
//    Radical: zero radius, tall type, wide line-height, heavy weight contrast
// ---------------------------------------------------------------------------

export const INK_AND_WIRE_THEME: ThemeManifest = {
  id: "ink-and-wire",
  name: "Ink & Wire",
  description: "Gazete editoryel tasarimi. Serif basliklar, sifir radius, krem kagit, agir ink kontrastlar. Tipografi-oncelikli okuma deneyimi.",
  author: "system",
  version: "2.0.0",
  tone: ["editorial", "gazette", "serif", "ink", "broadsheet", "typographic"],

  typography: {
    heading: {
      family: "Playfair Display",
      stack: "'Playfair Display', Georgia, 'Times New Roman', serif",
    },
    body: {
      family: "Source Sans 3",
      stack: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "IBM Plex Mono",
      stack: "'IBM Plex Mono', 'Courier New', monospace",
    },
    size: {
      xs: "0.6875rem",
      sm: "0.75rem",
      base: "0.875rem",   // slightly larger body for readability
      md: "0.9375rem",
      lg: "1.125rem",
      xl: "1.375rem",     // generous size jump
      "2xl": "1.875rem",
      "3xl": "2.75rem",   // dramatic serif headline scale
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.15, normal: 1.65, relaxed: 1.85 },  // wide line height — readability
    letterSpacing: { tight: "-0.01em", normal: "0.01em", wide: "0.18em" },
  },

  colors: {
    brand: {
      50: "#faf7f2", 100: "#f0eae0", 200: "#ddd3c0", 300: "#c4b49a",
      400: "#a89070", 500: "#8c7050", 600: "#745a3e", 700: "#5e4832",
      800: "#4a382a", 900: "#3a2c22",
    },
    neutral: {
      // Faz 6 kontrast fix: n500 #857f70 (3.76:1) küçük metinler için
      // sınırdaydı. Skala koyulaştırıldı:
      // n500 → #5a5548 (7.00:1), n600 → #4a463d (9.14:1).
      // Eski açık tonlar (#857f70, #6b665a) border/placeholder için
      // sidebarSection/borderStrong literal'lerinde saklanmaya devam
      // ediyor (sidebar #1a1814 üzerinde >=4.5 sağlıyorlar).
      0: "#faf8f4", 25: "#f7f4ef", 50: "#f2efe8", 100: "#e8e4db",
      200: "#d8d3c8", 300: "#c2bcae", 400: "#a49e8f", 500: "#5a5548",
      600: "#4a463d", 700: "#3a3730", 800: "#2d2a24", 900: "#1a1814",
      950: "#0d0c0a",
    },
    success: { light: "#e8f5e9", base: "#558b2f", dark: "#33691e", text: "#1b5e20" },
    warning: { light: "#fff8e1", base: "#ff8f00", dark: "#e65100", text: "#bf360c" },
    error: { light: "#fce4ec", base: "#c62828", dark: "#b71c1c", text: "#7f0000" },
    info: { light: "#e8eaf6", base: "#3949ab", dark: "#1a237e", text: "#0d47a1" },
    surface: {
      page: "#f2efe8", card: "#faf8f4", elevated: "#faf8f4",
      inset: "#e8e4db", sidebar: "#1a1814", sidebarHover: "#2d2a24",
      sidebarActive: "#4a463d",
      // Faz 6 kontrast fix: sidebarSection #857f70 sidebar #1a1814
      // üzerinde 4.45:1 (sınır). n400 #a49e8f (6.64:1) ile AA kesin.
      sidebarText: "#f2efe8", sidebarTextMuted: "#a49e8f",
      sidebarTextActive: "#ddd3c0", sidebarSection: "#a49e8f",
      sidebarBorder: "#4a463d",
    },
    border: { subtle: "#d8d3c8", default: "#c2bcae", strong: "#a49e8f" },
    focus: "#5e4832",
    chart: ["#5e4832", "#558b2f", "#3949ab", "#c62828", "#ff8f00", "#7b1fa2", "#00838f"],
  },

  spacing: {
    0: "0", 1: "0.125rem", 2: "0.25rem", 3: "0.375rem", 4: "0.5rem",
    5: "0.75rem", 6: "1rem", 8: "1.25rem", 10: "1.5rem", 12: "2rem", 16: "2.5rem",
  },

  // ZERO radius — brutalist newspaper aesthetic
  radius: { sm: "0px", md: "0px", lg: "0px", xl: "2px", full: "9999px" },

  // Flat ink shadows — subtle, print-like
  shadow: {
    xs: "0 1px 0 rgba(26,24,20,0.06)",
    sm: "0 1px 1px rgba(26,24,20,0.08)",
    md: "0 2px 3px rgba(26,24,20,0.08), 0 0 0 1px rgba(26,24,20,0.04)",
    lg: "0 3px 6px rgba(26,24,20,0.10), 0 0 0 1px rgba(26,24,20,0.04)",
    xl: "0 6px 12px rgba(26,24,20,0.12), 0 0 0 1px rgba(26,24,20,0.06)",
    "2xl": "0 12px 24px rgba(26,24,20,0.16), 0 0 0 1px rgba(26,24,20,0.06)",
  },

  // Elegant, unhurried transitions
  motion: { fast: "160ms", normal: "280ms", slow: "440ms", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" },

  layout: {
    sidebarWidth: "260px",
    sidebarCollapsedWidth: "60px",
    headerHeight: "44px",              // compact header
    pageMaxWidth: "1080px",            // narrow — newspaper column width
    pagePadding: "1.25rem",            // compact padding
  },

  density: "compact",
};

// ---------------------------------------------------------------------------
// 5. Solar Ember — Industrial control panel / HUD
//    Think: SpaceX mission control × dark factory dashboard × ember heat
//    Radical: monospace headers, brutalist grid, inset cards, fire glow
// ---------------------------------------------------------------------------

export const SOLAR_EMBER_THEME: ThemeManifest = {
  id: "solar-ember",
  name: "Solar Ember",
  description: "Endustriyel kontrol paneli estetiği. Monospace basliklar, brutalist grid, iceri gomulu kartlar, ates pariltisi.",
  author: "system",
  version: "2.0.0",
  tone: ["dark", "industrial", "hud", "monospace", "fire", "control-panel"],

  typography: {
    heading: {
      family: "Archivo",
      stack: "'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Archivo",
      stack: "'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "Source Code Pro",
      stack: "'Source Code Pro', 'SF Mono', 'Fira Code', monospace",
    },
    size: {
      xs: "0.625rem",
      sm: "0.6875rem",
      base: "0.75rem",
      md: "0.8125rem",
      lg: "0.9375rem",
      xl: "1.0625rem",
      "2xl": "1.375rem",
      "3xl": "1.875rem",   // moderate headings — utilitarian
    },
    weight: { normal: 400, medium: 500, semibold: 700, bold: 700 },  // heavy medium-bold jump
    lineHeight: { tight: 1.15, normal: 1.4, relaxed: 1.55 },
    letterSpacing: { tight: "0em", normal: "0.02em", wide: "0.14em" },
  },

  colors: {
    brand: {
      // Faz 6 kontrast fix: Brand skalası standart light→dark yönüne
      // çevrildi. Eski 600 #ea580c beyaz metin üzerinde 3.56:1 (AA
      // altı) idi; primary button gradient'i bir ton kaydırılarak
      // 600 → #c2410c (5.18:1), 700 → #9a3412 (7.51:1) yapıldı.
      // Ember parıltısı 400-500 aralığında korundu; sidebar fire-accent
      // (#fb923c) literal olarak sidebarTextActive'de saklanıyor.
      50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74",
      400: "#fb923c", 500: "#f97316", 600: "#c2410c", 700: "#9a3412",
      800: "#7c2d12", 900: "#431407",
    },
    neutral: {
      // Faz 6 kontrast fix: n500 #6b6259 (3.10:1) küçük metinler için
      // sınırdaydı. Skala açıldı: n500 → #9a9088 (5.92:1),
      // n600 → #ada49b (7.54:1).
      0: "#0c0a08", 25: "#110e0b", 50: "#161310", 100: "#1e1a16",
      200: "#292420", 300: "#38322c", 400: "#504840", 500: "#9a9088",
      600: "#ada49b", 700: "#cec7be", 800: "#e0dad2", 900: "#e9e4de",
      950: "#f5f2ee",
    },
    success: { light: "#0d2a14", base: "#22c55e", dark: "#16a34a", text: "#86efac" },
    warning: { light: "#2a2005", base: "#facc15", dark: "#eab308", text: "#fef08a" },
    error: { light: "#2e0e0e", base: "#ef4444", dark: "#dc2626", text: "#fca5a5" },
    info: { light: "#0c1a2e", base: "#38bdf8", dark: "#0ea5e9", text: "#7dd3fc" },
    surface: {
      page: "#0c0a08", card: "#161310", elevated: "#1e1a16",
      inset: "#110e0b", sidebar: "#0c0a08", sidebarHover: "#1e1a16",
      sidebarActive: "#292420",
      // Faz 6 kontrast fix: sidebarSection #6b6259 sidebar #0c0a08
      // üzerinde 3.31:1 (LG sınırı). n600 #ada49b (7.54:1) ile güçlü AA.
      sidebarText: "#e9e4de", sidebarTextMuted: "#8a8078",
      sidebarTextActive: "#fb923c", sidebarSection: "#ada49b",
      sidebarBorder: "#292420",
    },
    border: { subtle: "#292420", default: "#38322c", strong: "#504840" },
    focus: "#ea580c",
    chart: ["#ea580c", "#22c55e", "#38bdf8", "#ef4444", "#facc15", "#a855f7", "#ec4899"],
  },

  spacing: {
    0: "0", 1: "0.125rem", 2: "0.25rem", 3: "0.5rem", 4: "0.75rem",
    5: "1rem", 6: "1.25rem", 8: "1.5rem", 10: "2rem", 12: "2.5rem", 16: "3rem",
  },

  // Zero radius — brutalist industrial look
  radius: { sm: "0px", md: "2px", lg: "3px", xl: "4px", full: "9999px" },

  // Inset shadows — cards feel stamped into the surface
  shadow: {
    xs: "inset 0 1px 2px rgba(0,0,0,0.3), 0 0 1px rgba(234,88,12,0.05)",
    sm: "inset 0 1px 3px rgba(0,0,0,0.35), 0 0 2px rgba(234,88,12,0.08)",
    md: "inset 0 2px 4px rgba(0,0,0,0.25), 0 0 4px rgba(234,88,12,0.06)",
    lg: "inset 0 2px 6px rgba(0,0,0,0.3), 0 0 8px rgba(234,88,12,0.08)",
    xl: "0 0 16px rgba(234,88,12,0.12), 0 4px 12px rgba(0,0,0,0.6)",
    "2xl": "0 0 32px rgba(234,88,12,0.16), 0 8px 24px rgba(0,0,0,0.7)",
  },

  // Instant, mechanical transitions
  motion: { fast: "50ms", normal: "80ms", slow: "140ms", easing: "cubic-bezier(0, 0, 0.2, 1)" },

  layout: {
    sidebarWidth: "208px",             // narrow sidebar — data-first
    sidebarCollapsedWidth: "48px",
    headerHeight: "40px",              // thin header — control panel
    pageMaxWidth: "1560px",            // ultra-wide — dashboard layout
    pagePadding: "1rem",               // tight — maximize data density
  },

  density: "compact",
};

/** All radical themes in an array for easy registration */
export const RADICAL_THEMES: ThemeManifest[] = [
  MIDNIGHT_ULTRAVIOLET_THEME,
  ARCTIC_FROST_THEME,
  TOKYO_NEON_THEME,
  INK_AND_WIRE_THEME,
  SOLAR_EMBER_THEME,
];
