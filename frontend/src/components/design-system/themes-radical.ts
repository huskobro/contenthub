/**
 * Radical Theme Collection — 5 completely different design languages
 *
 * Each theme is a radically different visual identity:
 * - Midnight Ultraviolet: Cyberpunk deep-purple, holographic glow
 * - Arctic Frost: Ultra-minimal ice-glass, all-white sidebar, pastel accents
 * - Tokyo Neon: Akihabara night-street pink neon, dark indigo base
 * - Ink & Wire: Editorial gazette, serif headings, cream-paper warmth
 * - Solar Ember: Volcanic obsidian with orange-red ember highlights
 */

import type { ThemeManifest } from "./themeContract";

// ---------------------------------------------------------------------------
// 1. Midnight Ultraviolet — Cyberpunk deep-purple aesthetic
// ---------------------------------------------------------------------------

export const MIDNIGHT_ULTRAVIOLET_THEME: ThemeManifest = {
  id: "midnight-ultraviolet",
  name: "Midnight Ultraviolet",
  description: "Derin mor ve elektrik mavi ile koyu cyberpunk estetiği. Holografik vurgular, gradient gölgeler, dijital katman hissi.",
  author: "system",
  version: "1.0.0",
  tone: ["dark", "cyberpunk", "ultraviolet", "neon", "futuristic"],

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
      xs: "0.6875rem", sm: "0.75rem", base: "0.8125rem", md: "0.875rem",
      lg: "1rem", xl: "1.125rem", "2xl": "1.5rem", "3xl": "2.25rem",
    },
    weight: { normal: 300, medium: 400, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.65 },
    letterSpacing: { tight: "-0.025em", normal: "0", wide: "0.1em" },
  },

  colors: {
    brand: {
      50: "#1a0a2e", 100: "#240f42", 200: "#3b1a6e", 300: "#5b2d9e",
      400: "#7c3aed", 500: "#8b5cf6", 600: "#a78bfa", 700: "#c4b5fd",
      800: "#ddd6fe", 900: "#ede9fe",
    },
    neutral: {
      0: "#09080f", 25: "#0d0b16", 50: "#11101c", 100: "#191726",
      200: "#221f33", 300: "#2e2b42", 400: "#433f5b", 500: "#5c577a",
      600: "#7f7a9c", 700: "#a5a0c0", 800: "#c8c4de", 900: "#e6e4f0",
      950: "#f4f3f9",
    },
    success: { light: "#0d2618", base: "#10b981", dark: "#059669", text: "#6ee7b7" },
    warning: { light: "#2a1a05", base: "#f59e0b", dark: "#d97706", text: "#fcd34d" },
    error: { light: "#2d0a12", base: "#ef4444", dark: "#dc2626", text: "#fca5a5" },
    info: { light: "#0c1a33", base: "#6366f1", dark: "#4f46e5", text: "#a5b4fc" },
    surface: {
      page: "#09080f", card: "#11101c", elevated: "#191726",
      inset: "#0d0b16", sidebar: "#0d0b16", sidebarHover: "#191726",
      sidebarActive: "#221f33",
    },
    border: { subtle: "#221f33", default: "#2e2b42", strong: "#433f5b" },
    focus: "#8b5cf6",
    chart: ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#f97316"],
  },

  spacing: {
    0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
    5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "4px", md: "6px", lg: "10px", xl: "14px", full: "9999px" },

  shadow: {
    xs: "0 1px 3px rgba(139,92,246,0.06), 0 1px 2px rgba(0,0,0,0.4)",
    sm: "0 2px 6px rgba(139,92,246,0.08), 0 1px 3px rgba(0,0,0,0.5)",
    md: "0 4px 14px rgba(139,92,246,0.10), 0 2px 6px rgba(0,0,0,0.5)",
    lg: "0 8px 28px rgba(139,92,246,0.12), 0 4px 10px rgba(0,0,0,0.6)",
    xl: "0 20px 50px rgba(139,92,246,0.15), 0 8px 20px rgba(0,0,0,0.7)",
    "2xl": "0 30px 70px rgba(139,92,246,0.18), 0 14px 30px rgba(0,0,0,0.8)",
  },

  motion: { fast: "100ms", normal: "160ms", slow: "260ms", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },

  layout: {
    sidebarWidth: "230px", sidebarCollapsedWidth: "54px",
    headerHeight: "48px", pageMaxWidth: "1360px", pagePadding: "1.5rem",
  },

  density: "comfortable",
};

// ---------------------------------------------------------------------------
// 2. Arctic Frost — Ultra-minimal ice-glass, all-white sidebar
// ---------------------------------------------------------------------------

export const ARCTIC_FROST_THEME: ThemeManifest = {
  id: "arctic-frost",
  name: "Arctic Frost",
  description: "Buz beyazı yüzeyler, cam efektli kartlar, ultra-minimal detay. Kuzey ışıkları pastel vurguları. Beyaz sidebar.",
  author: "system",
  version: "1.0.0",
  tone: ["minimal", "frost", "glass", "clean", "arctic", "light"],

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
      xs: "0.6875rem", sm: "0.75rem", base: "0.8125rem", md: "0.875rem",
      lg: "1rem", xl: "1.125rem", "2xl": "1.375rem", "3xl": "1.875rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.3, normal: 1.55, relaxed: 1.7 },
    letterSpacing: { tight: "-0.015em", normal: "0", wide: "0.08em" },
  },

  colors: {
    brand: {
      50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc",
      400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1",
      800: "#075985", 900: "#0c4a6e",
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
      page: "#f9fafb", card: "#ffffff", elevated: "#ffffff",
      inset: "#f3f4f6", sidebar: "#ffffff", sidebarHover: "#f3f4f6",
      sidebarActive: "#e0f2fe",
    },
    border: { subtle: "#e5e7eb", default: "#d1d5db", strong: "#9ca3af" },
    focus: "#0ea5e9",
    chart: ["#0ea5e9", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"],
  },

  spacing: {
    0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
    5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "8px", md: "12px", lg: "16px", xl: "20px", full: "9999px" },

  shadow: {
    xs: "0 1px 2px rgba(0,0,0,0.03)",
    sm: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
    md: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03)",
    lg: "0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.03)",
    xl: "0 20px 25px -5px rgba(0,0,0,0.07), 0 8px 10px -6px rgba(0,0,0,0.04)",
    "2xl": "0 25px 50px -12px rgba(0,0,0,0.10)",
  },

  motion: { fast: "150ms", normal: "250ms", slow: "400ms", easing: "cubic-bezier(0.4, 0, 0.2, 1)" },

  layout: {
    sidebarWidth: "260px", sidebarCollapsedWidth: "60px",
    headerHeight: "56px", pageMaxWidth: "1200px", pagePadding: "2rem",
  },

  density: "spacious",
};

// ---------------------------------------------------------------------------
// 3. Tokyo Neon — Akihabara night-street aesthetic
// ---------------------------------------------------------------------------

export const TOKYO_NEON_THEME: ThemeManifest = {
  id: "tokyo-neon",
  name: "Tokyo Neon",
  description: "Akihabara gece sokaklarından ilham. Sıcak pembe neon, koyu arka plan, Japon tipografi ruhu. Canlı, cesur, enerjik.",
  author: "system",
  version: "1.0.0",
  tone: ["dark", "neon", "pink", "tokyo", "vibrant", "nightlife"],

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
      xs: "0.6875rem", sm: "0.75rem", base: "0.8125rem", md: "0.875rem",
      lg: "1rem", xl: "1.125rem", "2xl": "1.5rem", "3xl": "2.25rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 800 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.65 },
    letterSpacing: { tight: "-0.02em", normal: "0", wide: "0.15em" },
  },

  colors: {
    brand: {
      50: "#1f0a1e", 100: "#2e0e2d", 200: "#4d1648", 300: "#7a2472",
      400: "#be3bab", 500: "#ec4899", 600: "#f472b6", 700: "#f9a8d4",
      800: "#fbcfe8", 900: "#fce7f3",
    },
    neutral: {
      0: "#0c0a14", 25: "#100e1a", 50: "#15121f", 100: "#1c1929",
      200: "#252237", 300: "#332e4a", 400: "#4a4466", 500: "#655e85",
      600: "#8580a4", 700: "#a9a5c2", 800: "#ccc8df", 900: "#e8e6f0",
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
    },
    border: { subtle: "#252237", default: "#332e4a", strong: "#4a4466" },
    focus: "#ec4899",
    chart: ["#ec4899", "#818cf8", "#fbbf24", "#f87171", "#34d399", "#fb923c", "#a78bfa"],
  },

  spacing: {
    0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
    5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },

  shadow: {
    xs: "0 1px 3px rgba(236,72,153,0.05), 0 1px 2px rgba(0,0,0,0.4)",
    sm: "0 2px 6px rgba(236,72,153,0.08), 0 1px 3px rgba(0,0,0,0.5)",
    md: "0 4px 14px rgba(236,72,153,0.10), 0 2px 6px rgba(0,0,0,0.5)",
    lg: "0 8px 28px rgba(236,72,153,0.12), 0 4px 10px rgba(0,0,0,0.6)",
    xl: "0 20px 50px rgba(236,72,153,0.14), 0 8px 20px rgba(0,0,0,0.7)",
    "2xl": "0 30px 70px rgba(236,72,153,0.18), 0 14px 30px rgba(0,0,0,0.8)",
  },

  motion: { fast: "90ms", normal: "150ms", slow: "240ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },

  layout: {
    sidebarWidth: "225px", sidebarCollapsedWidth: "52px",
    headerHeight: "46px", pageMaxWidth: "1380px", pagePadding: "1.5rem",
  },

  density: "compact",
};

// ---------------------------------------------------------------------------
// 4. Ink & Wire — Editorial gazette aesthetic
// ---------------------------------------------------------------------------

export const INK_AND_WIRE_THEME: ThemeManifest = {
  id: "ink-and-wire",
  name: "Ink & Wire",
  description: "Gazete editöryal estetiği. Serif başlıklar, krem kağıt tonu, siyah mürekkep kontrastı. Basılı medya ruhu.",
  author: "system",
  version: "1.0.0",
  tone: ["editorial", "gazette", "serif", "ink", "classic", "typographic"],

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
      xs: "0.6875rem", sm: "0.75rem", base: "0.8125rem", md: "0.9rem",
      lg: "1.0625rem", xl: "1.25rem", "2xl": "1.625rem", "3xl": "2.375rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.2, normal: 1.6, relaxed: 1.75 },
    letterSpacing: { tight: "-0.01em", normal: "0.005em", wide: "0.14em" },
  },

  colors: {
    brand: {
      50: "#faf7f2", 100: "#f0eae0", 200: "#ddd3c0", 300: "#c4b49a",
      400: "#a89070", 500: "#8c7050", 600: "#745a3e", 700: "#5e4832",
      800: "#4a382a", 900: "#3a2c22",
    },
    neutral: {
      0: "#faf8f4", 25: "#f7f4ef", 50: "#f2efe8", 100: "#e8e4db",
      200: "#d8d3c8", 300: "#c2bcae", 400: "#a49e8f", 500: "#857f70",
      600: "#6b665a", 700: "#4a463d", 800: "#2d2a24", 900: "#1a1814",
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
    },
    border: { subtle: "#d8d3c8", default: "#c2bcae", strong: "#a49e8f" },
    focus: "#5e4832",
    chart: ["#5e4832", "#558b2f", "#3949ab", "#c62828", "#ff8f00", "#7b1fa2", "#00838f"],
  },

  spacing: {
    0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
    5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "2px", md: "3px", lg: "4px", xl: "6px", full: "9999px" },

  shadow: {
    xs: "0 1px 1px rgba(26,24,20,0.05)",
    sm: "0 1px 2px rgba(26,24,20,0.06), 0 1px 1px rgba(26,24,20,0.04)",
    md: "0 2px 4px rgba(26,24,20,0.06), 0 1px 2px rgba(26,24,20,0.04)",
    lg: "0 4px 8px rgba(26,24,20,0.08), 0 2px 4px rgba(26,24,20,0.04)",
    xl: "0 8px 16px rgba(26,24,20,0.10), 0 4px 8px rgba(26,24,20,0.06)",
    "2xl": "0 16px 32px rgba(26,24,20,0.14), 0 8px 16px rgba(26,24,20,0.08)",
  },

  motion: { fast: "140ms", normal: "220ms", slow: "360ms", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" },

  layout: {
    sidebarWidth: "250px", sidebarCollapsedWidth: "58px",
    headerHeight: "54px", pageMaxWidth: "1240px", pagePadding: "2rem",
  },

  density: "comfortable",
};

// ---------------------------------------------------------------------------
// 5. Solar Ember — Volcanic fire on dark obsidian
// ---------------------------------------------------------------------------

export const SOLAR_EMBER_THEME: ThemeManifest = {
  id: "solar-ember",
  name: "Solar Ember",
  description: "Volkanik ateş estetiği. Koyu obsidyen üzerinde turuncu-kırmızı kor renkleri. Güçlü, cesur, sıcak.",
  author: "system",
  version: "1.0.0",
  tone: ["dark", "volcanic", "fire", "bold", "warm", "intense"],

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
      xs: "0.6875rem", sm: "0.75rem", base: "0.8125rem", md: "0.875rem",
      lg: "1rem", xl: "1.125rem", "2xl": "1.5rem", "3xl": "2.125rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.65 },
    letterSpacing: { tight: "-0.02em", normal: "0", wide: "0.08em" },
  },

  colors: {
    brand: {
      50: "#1f0c05", 100: "#2e1208", 200: "#4d1e0e", 300: "#7c3118",
      400: "#b84a20", 500: "#ea580c", 600: "#f97316", 700: "#fb923c",
      800: "#fdba74", 900: "#fed7aa",
    },
    neutral: {
      0: "#0c0a08", 25: "#110e0b", 50: "#161310", 100: "#1e1a16",
      200: "#292420", 300: "#38322c", 400: "#504840", 500: "#6b6259",
      600: "#8a8078", 700: "#ada49b", 800: "#cec7be", 900: "#e9e4de",
      950: "#f5f2ee",
    },
    success: { light: "#0d2a14", base: "#22c55e", dark: "#16a34a", text: "#86efac" },
    warning: { light: "#2a2005", base: "#facc15", dark: "#eab308", text: "#fef08a" },
    error: { light: "#2e0e0e", base: "#ef4444", dark: "#dc2626", text: "#fca5a5" },
    info: { light: "#0c1a2e", base: "#38bdf8", dark: "#0ea5e9", text: "#7dd3fc" },
    surface: {
      page: "#0c0a08", card: "#161310", elevated: "#1e1a16",
      inset: "#110e0b", sidebar: "#110e0b", sidebarHover: "#1e1a16",
      sidebarActive: "#292420",
    },
    border: { subtle: "#292420", default: "#38322c", strong: "#504840" },
    focus: "#ea580c",
    chart: ["#ea580c", "#22c55e", "#38bdf8", "#ef4444", "#facc15", "#a855f7", "#ec4899"],
  },

  spacing: {
    0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
    5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem",
  },

  radius: { sm: "3px", md: "5px", lg: "8px", xl: "12px", full: "9999px" },

  shadow: {
    xs: "0 1px 3px rgba(234,88,12,0.06), 0 1px 2px rgba(0,0,0,0.4)",
    sm: "0 2px 6px rgba(234,88,12,0.08), 0 1px 3px rgba(0,0,0,0.5)",
    md: "0 4px 14px rgba(234,88,12,0.10), 0 2px 6px rgba(0,0,0,0.5)",
    lg: "0 8px 28px rgba(234,88,12,0.14), 0 4px 10px rgba(0,0,0,0.6)",
    xl: "0 20px 50px rgba(234,88,12,0.16), 0 8px 20px rgba(0,0,0,0.7)",
    "2xl": "0 30px 70px rgba(234,88,12,0.20), 0 14px 30px rgba(0,0,0,0.8)",
  },

  motion: { fast: "100ms", normal: "160ms", slow: "250ms", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },

  layout: {
    sidebarWidth: "230px", sidebarCollapsedWidth: "52px",
    headerHeight: "48px", pageMaxWidth: "1360px", pagePadding: "1.5rem",
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
