/**
 * Radical Theme Collection — Aurora-curated design systems.
 *
 * These are NOT color swaps. Each theme radically changes:
 *   - layout proportions (sidebar width, header height, page padding)
 *   - typography scale & hierarchy
 *   - border-radius philosophy (brutalist 0px → sharp 2px → rounded 10px)
 *   - shadow depth & style
 *   - motion timing & easing
 *   - plus unique CSS treatments in index.css
 *
 * History (Aurora theme curation + identity pass):
 *   Previously this file carried 5 themes. `midnight-ultraviolet` was removed
 *   because it duplicated Aurora Dusk's dark+purple direction; `arctic-frost`
 *   was removed because it overlapped with Obsidian Slate's light-theme slot
 *   without adding distinct product character. During the identity pass
 *   `solar-ember` was also removed because its dark+mono+compact+HUD
 *   character sat too close to `void-terminal` and `tokyo-neon` to feel like
 *   a distinct "world". In its place we introduced `nordic-frost` — a calm
 *   Scandinavian light theme that sits opposite Obsidian Slate's indigo-tech
 *   identity on the light side. Previous palettes remain in git history.
 *
 * Remaining themes (3 radical + 3 core):
 *   Radical file (this):
 *     1. Tokyo Neon    — Akihabara arcade terminal, ultra-compact, neon pink
 *     2. Ink & Wire    — broadsheet newspaper, serif dominant, zero radius
 *     3. Nordic Frost  — Scandinavian minimal light, steel-blue, wide air
 *   Core themes (themeContract.ts):
 *     - Aurora Dusk     — plum + teal dark cockpit, aurora glow
 *     - Obsidian Slate  — indigo light data surface
 *     - Void Terminal   — black + green CRT terminal
 */

import type { ThemeManifest } from "./themeContract";

// ---------------------------------------------------------------------------
// 1. Tokyo Neon — Akihabara arcade terminal
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
// 2. Ink & Wire — Broadsheet newspaper / editorial gazette
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
// 3. Nordic Frost — Scandinavian minimal light / architect's workbench
//    Think: Helsinki library × Muji stationery × calm airport wayfinding
//    Radical: cool fog-white surface, steel-blue accent, wide air, soft
//    diffused shadows, generous line-height, Inter + IBM Plex Mono.
//    Purpose in the set: counterweights Obsidian Slate's dense indigo-tech
//    character with calm, focus-first quiet. Slate feels like a trading
//    desk; Nordic Frost feels like an architect's drafting table.
// ---------------------------------------------------------------------------

export const NORDIC_FROST_THEME: ThemeManifest = {
  id: "nordic-frost",
  name: "Nordic Frost",
  description: "Iskandinav sakin isik temasi. Buzul beyaz zemin, celik mavi vurgu, genis nefes araligi, yumusak gölgeler. Obsidian Slate'in yogun indigo karakterine sakin/odak karsitligi.",
  author: "system",
  version: "1.0.0",
  tone: ["light", "calm", "scandinavian", "airy", "minimal", "focus"],

  typography: {
    heading: {
      family: "Inter",
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Inter",
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "IBM Plex Mono",
      stack: "'IBM Plex Mono', 'JetBrains Mono', 'SF Mono', monospace",
    },
    size: {
      xs: "0.75rem",
      sm: "0.8125rem",
      base: "0.9375rem",    // larger base — breathing room
      md: "1rem",
      lg: "1.125rem",
      xl: "1.3125rem",
      "2xl": "1.625rem",
      "3xl": "2.125rem",    // restrained heading scale
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.25, normal: 1.6, relaxed: 1.8 },   // generous
    letterSpacing: { tight: "-0.015em", normal: "0em", wide: "0.14em" },
  },

  colors: {
    brand: {
      // Muted steel-blue ramp. Distinct from Obsidian Slate's #3b50e6 indigo:
      // this one is desaturated, greyer, cooler — closer to stone than sky.
      // 600 #41668a on white = 5.73:1 (AA normal + AAA large).
      // 700 #2f4c6b = 8.02:1 (AAA all sizes).
      50: "#f2f5f8", 100: "#e4ebf1", 200: "#c7d5e0", 300: "#9fb3c4",
      400: "#7894ac", 500: "#587692", 600: "#41668a", 700: "#2f4c6b",
      800: "#223a54", 900: "#162a40",
    },
    neutral: {
      // Cool fog-white → charcoal. Everything has a blue undertone so the
      // theme stays visually coherent without being sterile.
      0: "#fdfefe", 25: "#f9fbfc", 50: "#f3f6f8", 100: "#e8ecf0",
      200: "#d5dbe1", 300: "#b5bec7", 400: "#889299", 500: "#5a6269",
      600: "#3f464d", 700: "#2a3037", 800: "#1b2027", 900: "#11151b",
      950: "#070a0f",
    },
    success: { light: "#e6f4ec", base: "#2f8a5a", dark: "#1e6341", text: "#0e4a2b" },
    warning: { light: "#fcf2dc", base: "#c08a1f", dark: "#8f6310", text: "#5e3f05" },
    error:   { light: "#f8e4e3", base: "#a83936", dark: "#7d2725", text: "#4d1514" },
    info:    { light: "#e6eef6", base: "#3d6ea1", dark: "#2a5078", text: "#183657" },
    surface: {
      page: "#f3f6f8",
      card: "#ffffff",
      elevated: "#ffffff",
      inset: "#e8ecf0",
      // Sidebar: deep navy-charcoal, just enough warmth to feel architectural
      // (not pure black). Keeps cockpit chrome readable across themes.
      sidebar: "#1b2027",
      sidebarHover: "#2a3037",
      sidebarActive: "#3f464d",
      sidebarText: "#e8ecf0",
      sidebarTextMuted: "#889299",
      sidebarTextActive: "#9fb3c4",
      sidebarSection: "#889299",
      sidebarBorder: "#3f464d",
    },
    border: { subtle: "#e8ecf0", default: "#d5dbe1", strong: "#b5bec7" },
    focus: "#41668a",
    chart: ["#41668a", "#2f8a5a", "#c08a1f", "#a83936", "#7894ac", "#6b5a8a", "#3d6ea1"],
  },

  // Generous spacing — airy, calm, architectural
  spacing: {
    0: "0", 1: "0.1875rem", 2: "0.375rem", 3: "0.625rem", 4: "0.875rem",
    5: "1.125rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  // Medium-soft radii — not brutalist zero, not arcade pill
  radius: { sm: "4px", md: "6px", lg: "8px", xl: "12px", full: "9999px" },

  // Soft diffused shadows, cool tint — like north light through paper
  shadow: {
    xs: "0 1px 2px rgba(27, 32, 39, 0.04)",
    sm: "0 1px 3px rgba(27, 32, 39, 0.05), 0 1px 2px rgba(27, 32, 39, 0.03)",
    md: "0 4px 8px rgba(27, 32, 39, 0.06), 0 2px 4px rgba(27, 32, 39, 0.04)",
    lg: "0 8px 20px rgba(27, 32, 39, 0.08), 0 4px 8px rgba(27, 32, 39, 0.04)",
    xl: "0 16px 36px rgba(27, 32, 39, 0.10), 0 6px 12px rgba(27, 32, 39, 0.05)",
    "2xl": "0 28px 56px rgba(27, 32, 39, 0.14), 0 12px 24px rgba(27, 32, 39, 0.08)",
  },

  // Unhurried, smooth transitions — not lethargic, not snappy
  motion: { fast: "140ms", normal: "220ms", slow: "340ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },

  layout: {
    sidebarWidth: "240px",
    sidebarCollapsedWidth: "56px",
    headerHeight: "48px",
    pageMaxWidth: "1280px",            // narrower than HUD themes — focus
    pagePadding: "1.75rem",            // generous gutters
  },

  density: "comfortable",
};

/** All radical themes in an array for easy registration */
export const RADICAL_THEMES: ThemeManifest[] = [
  TOKYO_NEON_THEME,
  INK_AND_WIRE_THEME,
  NORDIC_FROST_THEME,
];
