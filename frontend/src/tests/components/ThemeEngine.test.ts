import { describe, it, expect } from "vitest";
import { generateCSSVariables, resolveTokens } from "../../components/design-system/themeEngine";
import { DEFAULT_THEME, EXAMPLE_WARM_EARTH_THEME } from "../../components/design-system/themeContract";

describe("generateCSSVariables", () => {
  it("generates CSS variables from default theme", () => {
    const vars = generateCSSVariables(DEFAULT_THEME);
    expect(vars["--ch-font-body"]).toContain("Inter");
    expect(vars["--ch-font-mono"]).toContain("JetBrains Mono");
    expect(vars["--ch-brand-500"]).toBe("#4f6fff");
    expect(vars["--ch-neutral-900"]).toBe("#212529");
    expect(vars["--ch-success-base"]).toBe("#37b24d");
    expect(vars["--ch-surface-page"]).toBe("#f5f6fa");
    expect(vars["--ch-border-default"]).toBe("#d5d9e5");
    expect(vars["--ch-focus"]).toBe("#3d5afe");
    expect(vars["--ch-space-4"]).toBe("1rem");
    expect(vars["--ch-radius-md"]).toBe("8px");
    expect(vars["--ch-shadow-sm"]).toBeTruthy();
    expect(vars["--ch-motion-fast"]).toContain("120ms");
    expect(vars["--ch-sidebar-width"]).toBe("240px");
  });

  it("generates different variables for warm earth theme", () => {
    const vars = generateCSSVariables(EXAMPLE_WARM_EARTH_THEME);
    expect(vars["--ch-font-body"]).toContain("DM Sans");
    expect(vars["--ch-brand-500"]).toBe("#d4882a");
    expect(vars["--ch-neutral-900"]).toBe("#252119");
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
    expect(tokens.colors.brand[600]).toBe("#3d5afe");
    expect(tokens.typography.fontFamily).toContain("Inter");
    expect(tokens.typography.headingFamily).toContain("Inter");
    expect(tokens.typography.monoFamily).toContain("JetBrains Mono");
    expect(tokens.spacing[4]).toBe("1rem");
    expect(tokens.radius.md).toBe("8px");
    expect(tokens.transition.fast).toContain("120ms");
  });

  it("resolves different tokens for warm earth theme", () => {
    const tokens = resolveTokens(EXAMPLE_WARM_EARTH_THEME);
    expect(tokens.colors.brand[600]).toBe("#b87022");
    expect(tokens.typography.fontFamily).toContain("DM Sans");
  });
});
