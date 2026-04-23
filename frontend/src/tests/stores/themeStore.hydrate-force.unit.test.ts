/**
 * Phase Final F4 — themeStore.hydrateFromBackend({force: true}) unit tests.
 *
 * Validates cross-device persistence contract:
 *   * force=true overrides localStorage with backend value when they differ
 *   * force=true is a no-op when values agree
 *   * Default (opportunistic) still respects localStorage as fast path
 *
 * Uses vi.mock to stub the settings API fetch so the test runs fully offline.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../api/effectiveSettingsApi", () => ({
  fetchEffectiveSetting: vi.fn(),
  updateSettingAdminValue: vi.fn(),
}));

import { fetchEffectiveSetting } from "../../api/effectiveSettingsApi";
import { useThemeStore } from "../../stores/themeStore";
import {
  DEFAULT_THEME,
  VOID_TERMINAL_THEME,
} from "../../components/design-system/themeContract";

const STORAGE_KEY = "contenthub:active-theme-id";

describe("themeStore.hydrateFromBackend — force mode (Phase Final F4)", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({
      activeThemeId: DEFAULT_THEME.id,
      themes: [DEFAULT_THEME, VOID_TERMINAL_THEME],
    });
    vi.mocked(fetchEffectiveSetting).mockReset();
  });

  it("force=true overrides localStorage when backend differs", async () => {
    // localStorage already has default, backend says void-terminal — force wins
    localStorage.setItem(STORAGE_KEY, DEFAULT_THEME.id);
    vi.mocked(fetchEffectiveSetting).mockResolvedValue({
      key: "ui.active_theme",
      effective_value: "void-terminal",
      has_personal_value: true,
      user_override_allowed: true,
    } as never);

    useThemeStore.getState().hydrateFromBackend({ force: true });
    // await microtasks
    await new Promise((r) => setTimeout(r, 0));

    expect(useThemeStore.getState().activeThemeId).toBe("void-terminal");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("void-terminal");
  });

  it("force=true is a no-op when backend agrees with localStorage", async () => {
    localStorage.setItem(STORAGE_KEY, "void-terminal");
    useThemeStore.setState({ activeThemeId: "void-terminal" });
    vi.mocked(fetchEffectiveSetting).mockResolvedValue({
      key: "ui.active_theme",
      effective_value: "void-terminal",
      has_personal_value: true,
      user_override_allowed: true,
    } as never);

    useThemeStore.getState().hydrateFromBackend({ force: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(useThemeStore.getState().activeThemeId).toBe("void-terminal");
  });

  it("force=true ignores unknown theme id from backend", async () => {
    localStorage.setItem(STORAGE_KEY, DEFAULT_THEME.id);
    vi.mocked(fetchEffectiveSetting).mockResolvedValue({
      key: "ui.active_theme",
      effective_value: "nonexistent-theme",
      has_personal_value: true,
      user_override_allowed: true,
    } as never);

    useThemeStore.getState().hydrateFromBackend({ force: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(useThemeStore.getState().activeThemeId).toBe(DEFAULT_THEME.id);
  });

  it("default mode still skips backend call when localStorage has a value", async () => {
    localStorage.setItem(STORAGE_KEY, DEFAULT_THEME.id);
    vi.mocked(fetchEffectiveSetting).mockResolvedValue({
      key: "ui.active_theme",
      effective_value: "void-terminal",
      has_personal_value: true,
      user_override_allowed: true,
    } as never);

    useThemeStore.getState().hydrateFromBackend(); // no force
    await new Promise((r) => setTimeout(r, 0));

    expect(useThemeStore.getState().activeThemeId).toBe(DEFAULT_THEME.id);
    expect(fetchEffectiveSetting).not.toHaveBeenCalled();
  });
});
