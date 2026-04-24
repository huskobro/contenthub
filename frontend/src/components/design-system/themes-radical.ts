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
 * History (Aurora theme curation + expansion pass):
 *   Previously this file carried 5 themes. `midnight-ultraviolet` was removed
 *   because it duplicated Aurora Dusk's dark+purple direction; `arctic-frost`
 *   was removed because it overlapped with Obsidian Slate's light-theme slot
 *   without adding distinct product character. During the identity pass
 *   `solar-ember` was also removed because its dark+mono+compact+HUD
 *   character sat too close to `void-terminal` and `tokyo-neon` to feel like
 *   a distinct "world". In its place we introduced `nordic-frost` — a calm
 *   Scandinavian light theme.
 *
 *   Expansion pass (`codex/aurora-theme-expansion-pass`): added 4 new themes
 *   to cover previously empty emotional/visual slots — translucent glass
 *   cockpit (Emerald Glass), warm analog light (Copper Dune), dramatic
 *   cold-navy data storm (Cobalt Storm), and editorial-clinical pink
 *   (Rose Laboratory). During the same pass, Nordic Frost was removed
 *   because it had lived in the same light/calm slot as Obsidian Slate
 *   and Copper Dune filled the "warm light" slot without cannibalising
 *   Ink & Wire. See `AURORA_THEME_EXPANSION_NOTES.md` for full audit.
 *
 * Remaining themes (radical file + core themes):
 *   Radical file (this):
 *     1. Tokyo Neon       — Akihabara arcade terminal, ultra-compact, neon pink
 *     2. Ink & Wire       — broadsheet newspaper, serif dominant, zero radius
 *     3. Emerald Glass    — translucent control-room, blurred petrol-teal glass
 *     4. Copper Dune      — warm analog instrument light, sand + copper
 *     5. Cobalt Storm     — dramatic cold-navy data storm, electric blue
 *     6. Rose Laboratory  — editorial-clinical light, dusty rose + fuchsia
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
// 3. Emerald Glass — translucent control-room dark
//    Think: operations room window → frosted glass panes → infrared accents
//    Radical: petrol-teal palette with semi-transparent surfaces, `backdrop-filter`
//    blur for signature glass cards, warm-free cyan. Sits opposite Aurora
//    Dusk's plum cinematic mood with a technical/industrial hardness.
//    Fallback-safe: surfaces carry enough base opacity that the theme
//    remains cohesive on browsers without backdrop-filter support.
// ---------------------------------------------------------------------------

export const EMERALD_GLASS_THEME: ThemeManifest = {
  id: "emerald-glass",
  name: "Emerald Glass",
  description: "Yari-seffaf buzlu cam kontrol odasi. Petrol-teal palet, blur'lu yuzeyler, kizilotesi acil durum vurgusu. Dusk'in sinematik moruna teknik/endustriyel bir karsitlik.",
  author: "system",
  version: "1.0.0",
  tone: ["dark", "glass", "technical", "industrial", "petrol", "control-room"],

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
      family: "JetBrains Mono",
      stack: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace",
    },
    size: {
      xs: "0.6875rem", sm: "0.75rem", base: "0.8125rem", md: "0.875rem",
      lg: "1rem", xl: "1.125rem", "2xl": "1.5rem", "3xl": "2rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.18, normal: 1.5, relaxed: 1.65 },
    letterSpacing: { tight: "-0.02em", normal: "-0.005em", wide: "0.1em" },
  },

  colors: {
    brand: {
      50: "#e4faf5", 100: "#bbf1e4", 200: "#86e3cf", 300: "#4fd2b8",
      400: "#2fbfa2", 500: "#20a88b", 600: "#168a70", 700: "#106b57",
      800: "#0b4c3e", 900: "#073128",
    },
    neutral: {
      0: "#030806", 25: "#050c0a", 50: "#071512", 100: "#0a1d19",
      200: "#0f2925", 300: "#143632", 400: "#1d4843", 500: "#2f6862",
      600: "#588f87", 700: "#86b1a9", 800: "#bcd3ce", 900: "#e0ede9",
      950: "#f2f8f6",
    },
    success: { light: "rgba(95,220,180,0.12)", base: "#5fdcb4", dark: "#2fb488", text: "#5fdcb4" },
    warning: { light: "rgba(245,180,100,0.12)", base: "#f5b464", dark: "#d3953d", text: "#f5b464" },
    error:   { light: "rgba(255,120,130,0.14)", base: "#ff7882", dark: "#d64e58", text: "#ff7882" },
    info:    { light: "rgba(120,200,220,0.12)", base: "#78c8dc", dark: "#4aa2b8", text: "#78c8dc" },
    surface: {
      page: "#071512", card: "#0f2925", elevated: "#143632",
      inset: "#050c0a", sidebar: "#050c0a", sidebarHover: "#0f2925",
      sidebarActive: "#164a42",
      sidebarText: "#e0ede9", sidebarTextMuted: "#86b1a9",
      sidebarTextActive: "#4fd2b8", sidebarSection: "#86b1a9",
      sidebarBorder: "#143632",
    },
    border: { subtle: "rgba(188, 211, 206, 0.06)", default: "rgba(188, 211, 206, 0.12)", strong: "rgba(188, 211, 206, 0.22)" },
    focus: "#4fd2b8",
    chart: ["#2fbfa2", "#78c8dc", "#f5b464", "#ff7882", "#5fdcb4", "#a5e0ff", "#d9a6ff"],
  },

  spacing: {
    0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
    5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "8px", md: "14px", lg: "18px", xl: "24px", full: "9999px" },

  shadow: {
    xs: "0 1px 2px rgba(0, 12, 10, 0.40)",
    sm: "0 2px 6px rgba(0, 12, 10, 0.40), 0 0 0 1px rgba(79, 210, 184, 0.06)",
    md: "0 10px 28px rgba(0, 12, 10, 0.45), 0 0 0 1px rgba(79, 210, 184, 0.08)",
    lg: "0 18px 40px rgba(0, 12, 10, 0.55), 0 0 0 1px rgba(79, 210, 184, 0.10)",
    xl: "0 32px 68px rgba(0, 12, 10, 0.60), 0 0 0 1px rgba(79, 210, 184, 0.12)",
    "2xl": "0 48px 100px rgba(0, 12, 10, 0.70), 0 0 0 1px rgba(79, 210, 184, 0.14)",
  },

  motion: { fast: "140ms", normal: "260ms", slow: "380ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },

  layout: {
    sidebarWidth: "252px", sidebarCollapsedWidth: "56px",
    headerHeight: "50px", pageMaxWidth: "1400px", pagePadding: "1.5rem",
  },

  density: "compact",
};

// ---------------------------------------------------------------------------
// 4. Copper Dune — warm analog light
//    Think: vintage Leica body × sun-baked sand × patinated copper
//    Radical: warm sand/cream surfaces, oxidised-copper accent, wooden-case
//    sidebar, yoruk-desert neutral scale. Opposite of the sepia newsprint
//    feel of Ink & Wire — Copper Dune is an instrument, not a page.
// ---------------------------------------------------------------------------

export const COPPER_DUNE_THEME: ThemeManifest = {
  id: "copper-dune",
  name: "Copper Dune",
  description: "Sicak analog cihaz isik temasi. Gunesli kum krem, patinalanmis bakir vurgu, ahsap kasali sidebar. Ink & Wire'in gazete hissinden farkli — Copper Dune bir kagit degil, bir alet.",
  author: "system",
  version: "1.0.0",
  tone: ["light", "warm", "analog", "instrument", "copper", "desert"],

  typography: {
    heading: {
      family: "DM Sans",
      stack: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "DM Sans",
      stack: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "IBM Plex Mono",
      stack: "'IBM Plex Mono', 'JetBrains Mono', 'SF Mono', monospace",
    },
    size: {
      xs: "0.75rem", sm: "0.8125rem", base: "0.875rem", md: "0.9375rem",
      lg: "1.0625rem", xl: "1.25rem", "2xl": "1.625rem", "3xl": "2.25rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.2, normal: 1.55, relaxed: 1.7 },
    letterSpacing: { tight: "-0.02em", normal: "-0.005em", wide: "0.12em" },
  },

  colors: {
    brand: {
      // Oxidised copper — warm orange-brown. 600 #a45625 on cream ≈ 5.3:1 AA.
      50: "#faf1e7", 100: "#f2dcc1", 200: "#e6bd93", 300: "#d6995f",
      400: "#c47c3a", 500: "#b36c2e", 600: "#a45625", 700: "#7f431d",
      800: "#5c3115", 900: "#3e200d",
    },
    neutral: {
      // Sun-baked sand → tobacco → charcoal.
      0: "#fffaf2", 25: "#fcf5eb", 50: "#f5ede2", 100: "#ebe0cf",
      200: "#d9c9ae", 300: "#bfa985", 400: "#8f7b59", 500: "#655538",
      600: "#4b3e28", 700: "#362c1d", 800: "#241c13", 900: "#15100a",
      950: "#0a0804",
    },
    success: { light: "#e6f1d8", base: "#4f7a1c", dark: "#375412", text: "#1f350a" },
    warning: { light: "#faeccb", base: "#a45625", dark: "#7f431d", text: "#4a2610" },
    error:   { light: "#f5d9cc", base: "#a63a20", dark: "#7d2a15", text: "#4a170a" },
    info:    { light: "#dee6ea", base: "#4a6b7a", dark: "#304c58", text: "#1a2e36" },
    surface: {
      page: "#f5ede2", card: "#fdf8f1", elevated: "#fffaf2",
      inset: "#ebe0cf", sidebar: "#1f1a14", sidebarHover: "#2d261d",
      sidebarActive: "#3b3226",
      sidebarText: "#f5ede2", sidebarTextMuted: "#a49171",
      sidebarTextActive: "#d6995f", sidebarSection: "#a49171",
      sidebarBorder: "#3b3226",
    },
    border: { subtle: "#ebe0cf", default: "#d4bfa0", strong: "#b29878" },
    focus: "#a45625",
    chart: ["#a45625", "#4f7a1c", "#4a6b7a", "#a63a20", "#c47c3a", "#6b5aa0", "#2e6a68"],
  },

  spacing: {
    0: "0", 1: "0.1875rem", 2: "0.375rem", 3: "0.625rem", 4: "0.875rem",
    5: "1.125rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "6px", md: "10px", lg: "14px", xl: "18px", full: "9999px" },

  shadow: {
    xs: "0 1px 2px rgba(91, 58, 28, 0.06)",
    sm: "0 2px 5px rgba(91, 58, 28, 0.08), 0 1px 2px rgba(91, 58, 28, 0.05)",
    md: "0 6px 18px rgba(91, 58, 28, 0.14), 0 2px 4px rgba(91, 58, 28, 0.08)",
    lg: "0 12px 30px rgba(91, 58, 28, 0.18), 0 4px 8px rgba(91, 58, 28, 0.10)",
    xl: "0 20px 48px rgba(91, 58, 28, 0.22), 0 8px 16px rgba(91, 58, 28, 0.12)",
    "2xl": "0 32px 72px rgba(91, 58, 28, 0.28), 0 12px 24px rgba(91, 58, 28, 0.14)",
  },

  motion: { fast: "180ms", normal: "300ms", slow: "460ms", easing: "cubic-bezier(0.32, 0.08, 0.24, 1)" },

  layout: {
    sidebarWidth: "256px", sidebarCollapsedWidth: "60px",
    headerHeight: "52px", pageMaxWidth: "1240px", pagePadding: "1.625rem",
  },

  density: "comfortable",
};

// ---------------------------------------------------------------------------
// 5. Cobalt Storm — dramatic cold-navy data storm
//    Think: pre-storm North Atlantic × lightning strike × bond trading floor
//    at 02:00. Radical: near-black navy, electric cobalt accent, dramatic
//    shadow drops, sharp 6px radius. Slate is a calm indigo desk — Storm
//    is the moment the price curve breaks.
// ---------------------------------------------------------------------------

export const COBALT_STORM_THEME: ThemeManifest = {
  id: "cobalt-storm",
  name: "Cobalt Storm",
  description: "Firtina oncesi deniz. Neredeyse-siyah lacivert, elektrik kobalt vurgu, keskin gölgeler. Slate'in sakin indigo masasindan farkli — Storm fiyat egrisinin kirildigi an.",
  author: "system",
  version: "1.0.0",
  tone: ["dark", "dramatic", "data", "trading", "cold", "storm"],

  typography: {
    heading: {
      family: "Inter Tight",
      stack: "'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    body: {
      family: "Inter",
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "JetBrains Mono",
      stack: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace",
    },
    size: {
      xs: "0.6875rem", sm: "0.75rem", base: "0.8125rem", md: "0.875rem",
      lg: "1rem", xl: "1.125rem", "2xl": "1.5rem", "3xl": "2rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.12, normal: 1.45, relaxed: 1.6 },
    letterSpacing: { tight: "-0.035em", normal: "-0.01em", wide: "0.14em" },
  },

  colors: {
    brand: {
      // Electric cobalt — bright, dangerous, saturated.
      50: "#e7efff", 100: "#c7d7ff", 200: "#9cb7ff", 300: "#6e91ff",
      400: "#4772fb", 500: "#2f5cf0", 600: "#2049d6", 700: "#1a3aad",
      800: "#152d85", 900: "#0f2160",
    },
    neutral: {
      // Near-black navy → iced blue-white.
      0: "#02040a", 25: "#050810", 50: "#080c16", 100: "#0d1320",
      200: "#131a2c", 300: "#1a2438", 400: "#253048", 500: "#3b4866",
      600: "#5f6d8d", 700: "#8d9ab8", 800: "#bac3d9", 900: "#dce2ee",
      950: "#eff3f9",
    },
    success: { light: "rgba(58,215,146,0.12)", base: "#3ad792", dark: "#27ad72", text: "#7be4b2" },
    warning: { light: "rgba(255,176,60,0.14)", base: "#ffb03c", dark: "#d48b21", text: "#ffc877" },
    error:   { light: "rgba(255,92,96,0.14)", base: "#ff5c60", dark: "#d63b40", text: "#ff8c8f" },
    info:    { light: "rgba(110,145,255,0.14)", base: "#6e91ff", dark: "#4772fb", text: "#9cb7ff" },
    surface: {
      page: "#05080f", card: "#0d1320", elevated: "#131a2c",
      inset: "#02040a", sidebar: "#030611", sidebarHover: "#0d1320",
      sidebarActive: "#142144",
      sidebarText: "#dce2ee", sidebarTextMuted: "#8d9ab8",
      sidebarTextActive: "#6e91ff", sidebarSection: "#8d9ab8",
      sidebarBorder: "#131a2c",
    },
    border: { subtle: "rgba(186, 195, 217, 0.06)", default: "rgba(186, 195, 217, 0.12)", strong: "rgba(186, 195, 217, 0.22)" },
    focus: "#6e91ff",
    chart: ["#2f5cf0", "#3ad792", "#ffb03c", "#ff5c60", "#6e91ff", "#9c7aff", "#ffffff"],
  },

  spacing: {
    0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
    5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "3px", md: "6px", lg: "10px", xl: "14px", full: "9999px" },

  shadow: {
    xs: "0 1px 0 rgba(0, 0, 0, 0.6)",
    sm: "0 2px 4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(47, 92, 240, 0.05)",
    md: "0 8px 24px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(47, 92, 240, 0.08)",
    lg: "0 20px 44px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.45)",
    xl: "0 36px 72px rgba(0, 0, 0, 0.78), 0 6px 12px rgba(0, 0, 0, 0.55)",
    "2xl": "0 56px 110px rgba(0, 0, 0, 0.85), 0 12px 22px rgba(0, 0, 0, 0.65)",
  },

  motion: { fast: "90ms", normal: "160ms", slow: "260ms", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },

  layout: {
    sidebarWidth: "236px", sidebarCollapsedWidth: "56px",
    headerHeight: "44px", pageMaxWidth: "1500px", pagePadding: "1.25rem",
  },

  density: "compact",
};

// ---------------------------------------------------------------------------
// 6. Rose Laboratory — editorial-clinical light, dusty rose + fuchsia
//    Think: biotech monograph × clinical notebook × editorial magazine spread
//    Radical: antique white surfaces with dusty rose, fuchsia accent, deep
//    bordeaux secondary, serif display heads. Opposite of Tokyo Neon's
//    arcade pink — this is clinical, adult, typographic pink.
// ---------------------------------------------------------------------------

export const ROSE_LABORATORY_THEME: ThemeManifest = {
  id: "rose-laboratory",
  name: "Rose Laboratory",
  description: "Editoryal-klinik pembe laboratuvar. Antik beyaz zemin, dusty rose, fuchsia vurgu, derin bordo ikincil, serif display basliklar. Tokyo Neon'un arcade pembesinin tam karsiti — ciddi, yetiskin, tipografik.",
  author: "system",
  version: "1.0.0",
  tone: ["light", "editorial", "clinical", "biotech", "rose", "serif"],

  typography: {
    heading: {
      family: "Fraunces",
      stack: "'Fraunces', 'Playfair Display', Georgia, serif",
    },
    body: {
      family: "Inter",
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    mono: {
      family: "JetBrains Mono",
      stack: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace",
    },
    size: {
      xs: "0.75rem", sm: "0.8125rem", base: "0.9375rem", md: "1rem",
      lg: "1.125rem", xl: "1.3125rem", "2xl": "1.75rem", "3xl": "2.375rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.18, normal: 1.55, relaxed: 1.75 },
    letterSpacing: { tight: "-0.02em", normal: "0em", wide: "0.16em" },
  },

  colors: {
    brand: {
      // Deep fuchsia-rose, not arcade pink.
      50: "#fdf0f3", 100: "#f9dde3", 200: "#f0b7c6", 300: "#e48aa2",
      400: "#d45e7f", 500: "#be3a5f", 600: "#9d2a4c", 700: "#7c2242",
      800: "#5c1a34", 900: "#3e1225",
    },
    neutral: {
      // Antique white → bordeaux-charcoal.
      0: "#fffcfb", 25: "#fcf6f5", 50: "#f8efee", 100: "#f1e2e2",
      200: "#e4cccf", 300: "#c9a7ad", 400: "#9b7480", 500: "#6e4e58",
      600: "#513842", 700: "#3a2830", 800: "#281b22", 900: "#180f14",
      950: "#0b0608",
    },
    success: { light: "#dff3e4", base: "#2a7d4a", dark: "#1e5a35", text: "#0f3c21" },
    warning: { light: "#fbecd1", base: "#a26b13", dark: "#7a4e0a", text: "#4a2f05" },
    error:   { light: "#f8d8d8", base: "#9d2a2a", dark: "#741c1c", text: "#400e0e" },
    info:    { light: "#e1e5f4", base: "#4858a6", dark: "#2f3d7e", text: "#18224f" },
    surface: {
      page: "#fbf5f4", card: "#ffffff", elevated: "#ffffff",
      inset: "#f1e2e2", sidebar: "#1b1216", sidebarHover: "#2a1b20",
      sidebarActive: "#3a252d",
      sidebarText: "#f8efee", sidebarTextMuted: "#a88891",
      sidebarTextActive: "#e48aa2", sidebarSection: "#a88891",
      sidebarBorder: "#3a252d",
    },
    border: { subtle: "#f1e2e2", default: "#e4cccf", strong: "#c9a7ad" },
    focus: "#be3a5f",
    chart: ["#be3a5f", "#7c2242", "#4858a6", "#2a7d4a", "#d45e7f", "#a26b13", "#9d2a2a"],
  },

  spacing: {
    0: "0", 1: "0.1875rem", 2: "0.375rem", 3: "0.625rem", 4: "0.875rem",
    5: "1.125rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "4px", md: "8px", lg: "14px", xl: "22px", full: "9999px" },

  shadow: {
    xs: "0 1px 2px rgba(92, 26, 52, 0.05)",
    sm: "0 2px 5px rgba(92, 26, 52, 0.07), 0 1px 2px rgba(92, 26, 52, 0.04)",
    md: "0 6px 22px rgba(92, 26, 52, 0.12), 0 2px 4px rgba(92, 26, 52, 0.06)",
    lg: "0 14px 36px rgba(92, 26, 52, 0.16), 0 4px 8px rgba(92, 26, 52, 0.08)",
    xl: "0 24px 56px rgba(92, 26, 52, 0.20), 0 8px 16px rgba(92, 26, 52, 0.10)",
    "2xl": "0 40px 88px rgba(92, 26, 52, 0.26), 0 12px 24px rgba(92, 26, 52, 0.12)",
  },

  motion: { fast: "160ms", normal: "260ms", slow: "400ms", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" },

  layout: {
    sidebarWidth: "252px", sidebarCollapsedWidth: "58px",
    headerHeight: "50px", pageMaxWidth: "1240px", pagePadding: "1.625rem",
  },

  density: "comfortable",
};

/** All radical themes in an array for easy registration */
export const RADICAL_THEMES: ThemeManifest[] = [
  TOKYO_NEON_THEME,
  INK_AND_WIRE_THEME,
  EMERALD_GLASS_THEME,
  COPPER_DUNE_THEME,
  COBALT_STORM_THEME,
  ROSE_LABORATORY_THEME,
];
