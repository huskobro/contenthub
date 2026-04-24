import { describe, it, expect } from "vitest";
import { generateCSSVariables, resolveTokens } from "../../components/design-system/themeEngine";
import { DEFAULT_THEME, VOID_TERMINAL_THEME, AURORA_DUSK_THEME } from "../../components/design-system/themeContract";
import { EMERALD_GLASS_THEME } from "../../components/design-system/themes-radical";

describe("generateCSSVariables", () => {
  it("generates CSS variables from default theme", () => {
    const vars = generateCSSVariables(DEFAULT_THEME);
    expect(vars["--ch-font-body"]).toContain("Plus Jakarta Sans");
    expect(vars["--ch-font-mono"]).toContain("Geist Mono");
    expect(vars["--ch-brand-500"]).toBe("#4f68f7");
    expect(vars["--ch-neutral-900"]).toBe("#1a1f2b");
    expect(vars["--ch-success-base"]).toBe("#34b849");
    expect(vars["--ch-surface-page"]).toBe("#f0f2f7");
    expect(vars["--ch-border-default"]).toBe("#d0d5e0");
    expect(vars["--ch-focus"]).toBe("#3b50e6");
    expect(vars["--ch-space-4"]).toBe("1rem");
    expect(vars["--ch-radius-md"]).toBe("10px");
    expect(vars["--ch-shadow-sm"]).toBeTruthy();
    expect(vars["--ch-motion-fast"]).toContain("100ms");
    expect(vars["--ch-sidebar-width"]).toBe("248px");
  });

  it("generates different variables for aurora dusk theme", () => {
    const vars = generateCSSVariables(AURORA_DUSK_THEME);
    expect(vars["--ch-font-body"]).toContain("Geist");
    expect(vars["--ch-brand-500"]).toBe("#26b6a6");
    expect(vars["--ch-neutral-900"]).toBe("#c9c0d8");
  });

  it("generates dark variables for void terminal theme", () => {
    const vars = generateCSSVariables(VOID_TERMINAL_THEME);
    expect(vars["--ch-font-body"]).toContain("Outfit");
    expect(vars["--ch-font-mono"]).toContain("IBM Plex Mono");
    expect(vars["--ch-brand-500"]).toBe("#2dd55b");
    expect(vars["--ch-surface-page"]).toBe("#0a0a0c");
    expect(vars["--ch-neutral-900"]).toBe("#dddff0");
    expect(vars["--ch-focus"]).toBe("#2dd55b");
  });

  it("generates petrol-teal translucent variables for emerald glass theme", () => {
    const vars = generateCSSVariables(EMERALD_GLASS_THEME);
    expect(vars["--ch-font-body"]).toContain("Inter");
    expect(vars["--ch-font-mono"]).toContain("JetBrains Mono");
    expect(vars["--ch-brand-500"]).toBe("#20a88b");
    expect(vars["--ch-brand-600"]).toBe("#168a70");
    expect(vars["--ch-surface-page"]).toBe("#071512");
    expect(vars["--ch-focus"]).toBe("#4fd2b8");
    expect(vars["--ch-radius-md"]).toBe("14px");
  });

  it("includes all typography size variables", () => {
    const vars = generateCSSVariables(DEFAULT_THEME);
    expect(vars["--ch-text-xs"]).toBeTruthy();
    expect(vars["--ch-text-sm"]).toBeTruthy();
    expect(vars["--ch-text-base"]).toBeTruthy();
    expect(vars["--ch-text-md"]).toBeTruthy();
    expect(vars["--ch-text-lg"]).toBeTruthy();
    expect(vars["--ch-text-xl"]).toBeTruthy();
    expect(vars["--ch-text-2xl"]).toBeTruthy();
    expect(vars["--ch-text-3xl"]).toBeTruthy();
  });

  it("includes weight variables", () => {
    const vars = generateCSSVariables(DEFAULT_THEME);
    expect(vars["--ch-weight-normal"]).toBe("400");
    expect(vars["--ch-weight-bold"]).toBe("700");
  });
});

describe("resolveTokens", () => {
  it("resolves token structure from default theme", () => {
    const tokens = resolveTokens(DEFAULT_THEME);
    expect(tokens.colors.brand[600]).toBe("#3b50e6");
    expect(tokens.typography.fontFamily).toContain("Plus Jakarta Sans");
    expect(tokens.typography.headingFamily).toContain("Instrument Sans");
    expect(tokens.typography.monoFamily).toContain("Geist Mono");
    expect(tokens.spacing[4]).toBe("1rem");
    expect(tokens.radius.md).toBe("10px");
    expect(tokens.transition.fast).toContain("100ms");
  });

  it("resolves different tokens for aurora dusk theme", () => {
    const tokens = resolveTokens(AURORA_DUSK_THEME);
    expect(tokens.colors.brand[600]).toBe("#1a9a8c");
    expect(tokens.typography.fontFamily).toContain("Geist");
  });

  it("resolves dark tokens for void terminal theme", () => {
    const tokens = resolveTokens(VOID_TERMINAL_THEME);
    expect(tokens.colors.brand[500]).toBe("#2dd55b");
    expect(tokens.colors.surface.page).toBe("#0a0a0c");
    expect(tokens.typography.fontFamily).toContain("Outfit");
    expect(tokens.typography.monoFamily).toContain("IBM Plex Mono");
    expect(tokens.radius.sm).toBe("3px");
  });
});
