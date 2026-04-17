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
  EXAMPLE_WARM_EARTH_THEME,
} from "../../components/design-system/themeContract";

const STORAGE_KEY = "contenthub:active-theme-id";

describe("themeStore.hydrateFromBackend — force mode (Phase Final F4)", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({
      activeThemeId: DEFAULT_THEME.id,
      themes: [DEFAULT_THEME, EXAMPLE_WARM_EARTH_THEME],
    });
    vi.mocked(fetchEffectiveSetting).mockReset();
  });

  it("force=true overrides localStorage when backend differs", async () => {
    // localStorage already has default, backend says warm-earth — force wins
    localStorage.setItem(STORAGE_KEY, DEFAULT_THEME.id);
    vi.mocked(fetchEffectiveSetting).mockResolvedValue({
      key: "ui.active_theme",
      effective_value: "warm-earth",
      has_personal_value: true,
      user_override_allowed: true,
    } as never);

    useThemeStore.getState().hydrateFromBackend({ force: true });
    // await microtasks
    await new Promise((r) => setTimeout(r, 0));

    expect(useThemeStore.getState().activeThemeId).toBe("warm-earth");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("warm-earth");
  });

  it("force=true is a no-op when backend agrees with localStorage", async () => {
    localStorage.setItem(STORAGE_KEY, "warm-earth");
    useThemeStore.setState({ activeThemeId: "warm-earth" });
    vi.mocked(fetchEffectiveSetting).mockResolvedValue({
      key: "ui.active_theme",
      effective_value: "warm-earth",
      has_personal_value: true,
      user_override_allowed: true,
    } as never);

    useThemeStore.getState().hydrateFromBackend({ force: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(useThemeStore.getState().activeThemeId).toBe("warm-earth");
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
      effective_value: "warm-earth",
      has_personal_value: true,
      user_override_allowed: true,
    } as never);

    useThemeStore.getState().hydrateFromBackend(); // no force
    await new Promise((r) => setTimeout(r, 0));

    expect(useThemeStore.getState().activeThemeId).toBe(DEFAULT_THEME.id);
    expect(fetchEffectiveSetting).not.toHaveBeenCalled();
  });
});
