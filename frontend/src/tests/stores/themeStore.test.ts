import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "../../stores/themeStore";
import { DEFAULT_THEME, VOID_TERMINAL_THEME, validateThemeManifest } from "../../components/design-system/themeContract";
import {
  EMERALD_GLASS_THEME,
  COPPER_DUNE_THEME,
  COBALT_STORM_THEME,
  ROSE_LABORATORY_THEME,
} from "../../components/design-system/themes-radical";

describe("themeStore", () => {
  beforeEach(() => {
    // Reset store state
    localStorage.clear();
    const { setState } = useThemeStore;
    setState({
      activeThemeId: DEFAULT_THEME.id,
      themes: [DEFAULT_THEME, VOID_TERMINAL_THEME],
    });
  });

  it("starts with default theme active", () => {
    const { activeThemeId } = useThemeStore.getState();
    expect(activeThemeId).toBe("obsidian-slate");
  });

  it("lists built-in themes", () => {
    const { themes } = useThemeStore.getState();
    expect(themes.length).toBeGreaterThanOrEqual(2);
    expect(themes.some((t) => t.id === "obsidian-slate")).toBe(true);
    expect(themes.some((t) => t.id === "void-terminal")).toBe(true);
  });

  it("switches active theme", () => {
    useThemeStore.getState().setActiveTheme("void-terminal");
    expect(useThemeStore.getState().activeThemeId).toBe("void-terminal");
  });

  it("does not switch to unknown theme", () => {
    useThemeStore.getState().setActiveTheme("nonexistent");
    expect(useThemeStore.getState().activeThemeId).toBe("obsidian-slate");
  });

  it("returns active theme manifest", () => {
    const theme = useThemeStore.getState().activeTheme();
    expect(theme.id).toBe("obsidian-slate");
    expect(theme.name).toBe("Obsidian Slate");
  });

  it("imports a valid custom theme", () => {
    const custom = {
      ...DEFAULT_THEME,
      id: "custom-test",
      name: "Custom Test",
      author: "test",
    };
    const errors = useThemeStore.getState().importTheme(custom);
    expect(errors).toEqual([]);
    expect(useThemeStore.getState().themes.some((t) => t.id === "custom-test")).toBe(true);
  });

  it("rejects invalid theme manifest", () => {
    const errors = useThemeStore.getState().importTheme({ id: "" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("prevents overwriting built-in themes", () => {
    const errors = useThemeStore.getState().importTheme({
      ...DEFAULT_THEME,
      name: "Hacked",
    });
    expect(errors.some((e) => e.message.includes("Yerlesik"))).toBe(true);
  });

  it("removes custom themes", () => {
    const custom = { ...DEFAULT_THEME, id: "removable", name: "Removable", author: "test" };
    useThemeStore.getState().importTheme(custom);
    expect(useThemeStore.getState().themes.some((t) => t.id === "removable")).toBe(true);

    const removed = useThemeStore.getState().removeTheme("removable");
    expect(removed).toBe(true);
    expect(useThemeStore.getState().themes.some((t) => t.id === "removable")).toBe(false);
  });

  it("cannot remove built-in themes", () => {
    const removed = useThemeStore.getState().removeTheme("obsidian-slate");
    expect(removed).toBe(false);
    expect(useThemeStore.getState().themes.some((t) => t.id === "obsidian-slate")).toBe(true);
  });

  it("exports theme as JSON", () => {
    const json = useThemeStore.getState().exportTheme("obsidian-slate");
    expect(json).toBeTruthy();
    const parsed = JSON.parse(json!);
    expect(parsed.id).toBe("obsidian-slate");
  });

  it("identifies built-in themes", () => {
    expect(useThemeStore.getState().isBuiltin("obsidian-slate")).toBe(true);
    expect(useThemeStore.getState().isBuiltin("nonexistent")).toBe(false);
  });

  it("falls back to default when removing active custom theme", () => {
    const custom = { ...DEFAULT_THEME, id: "temp-active", name: "Temp", author: "test" };
    useThemeStore.getState().importTheme(custom);
    useThemeStore.getState().setActiveTheme("temp-active");
    expect(useThemeStore.getState().activeThemeId).toBe("temp-active");

    useThemeStore.getState().removeTheme("temp-active");
    expect(useThemeStore.getState().activeThemeId).toBe("obsidian-slate");
  });
});

describe("validateThemeManifest", () => {
  it("passes for the default theme", () => {
    expect(validateThemeManifest(DEFAULT_THEME)).toEqual([]);
  });

  it("passes for the void terminal theme", () => {
    expect(validateThemeManifest(VOID_TERMINAL_THEME)).toEqual([]);
  });

  it("passes for the emerald glass theme", () => {
    expect(validateThemeManifest(EMERALD_GLASS_THEME)).toEqual([]);
  });

  it("passes for the copper dune theme", () => {
    expect(validateThemeManifest(COPPER_DUNE_THEME)).toEqual([]);
  });

  it("passes for the cobalt storm theme", () => {
    expect(validateThemeManifest(COBALT_STORM_THEME)).toEqual([]);
  });

  it("passes for the rose laboratory theme", () => {
    expect(validateThemeManifest(ROSE_LABORATORY_THEME)).toEqual([]);
  });

  it("fails for null", () => {
    const errors = validateThemeManifest(null);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("fails for missing required fields", () => {
    const errors = validateThemeManifest({ id: "test" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("fails for invalid density", () => {
    const invalid = { ...DEFAULT_THEME, density: "invalid" };
    const errors = validateThemeManifest(invalid);
    expect(errors.some((e) => e.path === "density")).toBe(true);
  });

  it("fails for missing typography", () => {
    const { typography, ...rest } = DEFAULT_THEME;
    const errors = validateThemeManifest(rest);
    expect(errors.some((e) => e.path === "typography")).toBe(true);
  });

  it("fails for missing colors", () => {
    const { colors, ...rest } = DEFAULT_THEME;
    const errors = validateThemeManifest(rest);
    expect(errors.some((e) => e.path === "colors")).toBe(true);
  });
});
