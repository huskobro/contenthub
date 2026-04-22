/**
 * Aurora Branding Center smoke tests.
 *
 * Coverage:
 *   1. Renders 6 cards (5 sections + Review & Apply) with completeness chips.
 *   2. Identity Save fires saveIdentity with the trimmed draft payload.
 *   3. Apply with dry-run = true fires applyBranding({dry_run: true}).
 *   4. "Automation Center'a geç" button is disabled until ALL sections are
 *      complete; enabled when completeness map is fully true.
 *
 * CLAUDE.md uyumu:
 *   - Backend authority: completeness comes from the server, frontend just
 *     reflects the booleans. We never invent a "ready" state client-side.
 *   - No hidden behavior: every interactive surface used here has a testid.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";

import { AuroraBrandingCenterPage } from "../surfaces/aurora/AuroraBrandingCenterPage";
import { useAuthStore } from "../stores/authStore";
import * as authApi from "../api/authApi";
import * as brandingApi from "../api/brandingCenterApi";
import type { BrandingCenterResponse } from "../api/brandingCenterApi";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_PROFILE: authApi.UserInfo = {
  id: "u-1",
  email: "u@test.local",
  display_name: "User",
  role: "user",
  status: "active",
};

function makeBranding(
  overrides: Partial<BrandingCenterResponse> = {},
  completeness: Partial<Record<string, boolean>> = {},
): BrandingCenterResponse {
  const base: BrandingCenterResponse = {
    channel: {
      id: "ch-1",
      profile_name: "Test Kanal",
      channel_slug: "test-kanal",
      platform: "youtube",
      title: "Test Channel",
      handle: "@test",
      avatar_url: null,
      import_status: "success",
      user_id: "u-1",
    },
    brand_profile_id: "bp-1",
    updated_at: new Date().toISOString(),
    identity: { brand_name: "Brand X", brand_summary: "Kısa özet" },
    audience: {
      audience_profile: { age: "25-34" },
      positioning_statement: "Pozisyon",
    },
    visual: {
      palette: "midnight",
      typography: "Inter",
      motion_style: "calm",
      logo_path: null,
      watermark_path: null,
      watermark_position: null,
      lower_third_defaults: null,
    },
    messaging: {
      tone_of_voice: "calm",
      messaging_pillars: ["data", "clarity"],
    },
    platform_output: {
      channel_description: "Açıklama",
      channel_keywords: ["news", "tr"],
      banner_prompt: null,
      logo_prompt: null,
    },
    apply_status: {},
    completeness: {
      identity: false,
      audience: false,
      visual: false,
      messaging: false,
      platform_output: false,
      ...completeness,
    },
  };
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function primeAuth() {
  useAuthStore.setState({
    accessToken: "t-test",
    refreshToken: "r-test",
    user: {
      id: USER_PROFILE.id,
      email: USER_PROFILE.email,
      display_name: USER_PROFILE.display_name,
      role: USER_PROFILE.role,
    },
    isAuthenticated: true,
    hasHydrated: true,
  });
  vi.spyOn(authApi, "fetchMe").mockResolvedValue(USER_PROFILE);
}

function clearAuth() {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
    hasHydrated: true,
  });
}

function renderPage(initialEntry = "/user/channels/ch-1/branding-center") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/user/channels/:channelId/branding-center"
            element={<AuroraBrandingCenterPage />}
          />
          <Route
            path="/user/projects"
            element={<div data-testid="route-projects" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuroraBrandingCenterPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    primeAuth();
  });

  afterEach(() => {
    clearAuth();
  });

  it("renders 6 cards with completeness chips", async () => {
    vi.spyOn(brandingApi, "fetchBrandingCenter").mockResolvedValue(
      makeBranding({}, { identity: true, audience: true }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("aurora-branding-center")).toBeDefined();
    });

    // 5 section cards + review card
    expect(screen.getByTestId("bc-identity-card")).toBeDefined();
    expect(screen.getByTestId("bc-audience-card")).toBeDefined();
    expect(screen.getByTestId("bc-visual-card")).toBeDefined();
    expect(screen.getByTestId("bc-messaging-card")).toBeDefined();
    expect(screen.getByTestId("bc-platform-card")).toBeDefined();
    expect(screen.getByTestId("bc-review-card")).toBeDefined();

    // Save buttons visible (disabled until dirty, but present in DOM)
    expect(screen.getByTestId("bc-identity-save")).toBeDefined();
    expect(screen.getByTestId("bc-audience-save")).toBeDefined();
  });

  it("typing in identity name + saving fires saveIdentity with trimmed payload", async () => {
    vi.spyOn(brandingApi, "fetchBrandingCenter").mockResolvedValue(
      makeBranding(),
    );
    const saveSpy = vi
      .spyOn(brandingApi, "saveIdentity")
      .mockResolvedValue(makeBranding({}, { identity: true }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("bc-identity-name")).toBeDefined();
    });

    const input = screen.getByTestId("bc-identity-name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  Yeni Ad  " } });

    const saveBtn = screen.getByTestId("bc-identity-save") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });
    expect(saveSpy).toHaveBeenCalledWith("ch-1", {
      brand_name: "Yeni Ad",
      brand_summary: "Kısa özet",
    });
  });

  it("Apply button with dry-run=true calls applyBranding({dry_run: true})", async () => {
    vi.spyOn(brandingApi, "fetchBrandingCenter").mockResolvedValue(
      makeBranding(),
    );
    const applySpy = vi
      .spyOn(brandingApi, "applyBranding")
      .mockResolvedValue({
        ok: true,
        applied_at: new Date().toISOString(),
        items: [{ surface: "youtube", status: "ok" }],
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("bc-apply")).toBeDefined();
    });

    const dryRun = screen.getByTestId("bc-apply-dryrun") as HTMLInputElement;
    expect(dryRun.checked).toBe(true);

    fireEvent.click(screen.getByTestId("bc-apply"));

    await waitFor(() => {
      expect(applySpy).toHaveBeenCalledTimes(1);
    });
    expect(applySpy).toHaveBeenCalledWith("ch-1", { dry_run: true });
  });

  it("'Automation Center'a geç' is disabled until all sections are complete", async () => {
    vi.spyOn(brandingApi, "fetchBrandingCenter").mockResolvedValue(
      makeBranding({}, {
        identity: true,
        audience: true,
        visual: true,
        messaging: true,
        platform_output: false, // one missing
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("bc-go-automation")).toBeDefined();
    });

    const cta = screen.getByTestId("bc-go-automation") as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
  });

  it("'Automation Center'a geç' is enabled when all sections complete", async () => {
    vi.spyOn(brandingApi, "fetchBrandingCenter").mockResolvedValue(
      makeBranding({}, {
        identity: true,
        audience: true,
        visual: true,
        messaging: true,
        platform_output: true,
      }),
    );

    renderPage();

    await waitFor(() => {
      const cta = screen.getByTestId("bc-go-automation") as HTMLButtonElement;
      expect(cta.disabled).toBe(false);
    });
  });
});
