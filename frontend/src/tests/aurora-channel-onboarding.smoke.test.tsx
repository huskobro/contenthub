/**
 * Aurora Channel URL Onboarding smoke tests.
 *
 * Coverage:
 *   1. Step 1 → URL submit calls previewChannelImport with the trimmed URL.
 *   2. After preview success, ConfirmStep shows fetched metadata and
 *      pre-fills the profile name from preview.title / preview.handle.
 *   3. Confirm submit calls confirmChannelImport with preview_token + URL +
 *      profile_name + default_language.
 *   4. After confirm success, DoneStep renders import_status chip and the
 *      "Branding Center'a geç" CTA navigates to the new branding center
 *      route for the created channel.
 *
 * CLAUDE.md uyumu:
 *   - Backend authority: client never invents preview_token; it must come
 *     from the preview response and ride along to confirm.
 *   - is_partial flag from backend triggers a UI badge — not silently
 *     swallowed.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";

import { AuroraChannelOnboardingPage } from "../surfaces/aurora/AuroraChannelOnboardingPage";
import { useAuthStore } from "../stores/authStore";
import * as authApi from "../api/authApi";
import * as channelApi from "../api/channelProfilesApi";
import type {
  ChannelImportPreview,
  ChannelProfileResponse,
} from "../api/channelProfilesApi";

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

function makePreview(
  overrides: Partial<ChannelImportPreview> = {},
): ChannelImportPreview {
  return {
    preview_token: "tok-abc",
    platform: "youtube",
    source_url: "https://www.youtube.com/@example",
    normalized_url: "https://www.youtube.com/@example",
    url_kind: "handle",
    external_channel_id: "UC123",
    handle: "@example",
    title: "Example Channel",
    avatar_url: null,
    description: "A test channel",
    is_partial: false,
    fetch_error: null,
    expires_in_seconds: 600,
    ...overrides,
  };
}

function makeCreated(
  overrides: Partial<ChannelProfileResponse> = {},
): ChannelProfileResponse {
  const now = new Date().toISOString();
  return {
    id: "ch-99",
    user_id: "u-1",
    profile_name: "Example Channel",
    profile_type: null,
    channel_slug: "example-channel",
    default_language: "tr",
    default_content_mode: null,
    brand_profile_id: null,
    automation_policy_id: null,
    status: "active",
    notes: null,
    created_at: now,
    updated_at: now,
    platform: "youtube",
    source_url: "https://www.youtube.com/@example",
    normalized_url: "https://www.youtube.com/@example",
    external_channel_id: "UC123",
    handle: "@example",
    title: "Example Channel",
    avatar_url: null,
    import_status: "success",
    import_error: null,
    last_import_at: now,
    ...overrides,
  };
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

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/user/channels/new"]}>
        <Routes>
          <Route
            path="/user/channels/new"
            element={<AuroraChannelOnboardingPage />}
          />
          <Route
            path="/user/channels/:channelId/branding-center"
            element={<div data-testid="route-branding-center" />}
          />
          <Route
            path="/user/channels"
            element={<div data-testid="route-channels" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuroraChannelOnboardingPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    primeAuth();
  });

  afterEach(() => {
    clearAuth();
  });

  it("submits URL and advances to ConfirmStep with metadata pre-filled", async () => {
    const previewSpy = vi
      .spyOn(channelApi, "previewChannelImport")
      .mockResolvedValue(makePreview());

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("aurora-channel-onboarding")).toBeDefined();
    });

    const urlInput = screen.getByTestId("onb-url-input") as HTMLInputElement;
    fireEvent.change(urlInput, {
      target: { value: "  https://www.youtube.com/@example  " },
    });

    const submit = screen.getByTestId("onb-url-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    await waitFor(() => {
      expect(previewSpy).toHaveBeenCalledTimes(1);
    });
    expect(previewSpy).toHaveBeenCalledWith({
      source_url: "https://www.youtube.com/@example",
    });

    // ConfirmStep visible with profile name pre-filled from preview.title
    await waitFor(() => {
      expect(screen.getByTestId("onb-profile-name")).toBeDefined();
    });
    const profileInput = screen.getByTestId(
      "onb-profile-name",
    ) as HTMLInputElement;
    expect(profileInput.value).toBe("Example Channel");
  });

  it("Confirm submit posts preview_token + URL + profile_name + default_language", async () => {
    vi.spyOn(channelApi, "previewChannelImport").mockResolvedValue(
      makePreview(),
    );
    const confirmSpy = vi
      .spyOn(channelApi, "confirmChannelImport")
      .mockResolvedValue(makeCreated());

    renderPage();

    // Step 1 → submit
    await waitFor(() => {
      expect(screen.getByTestId("onb-url-input")).toBeDefined();
    });
    fireEvent.change(screen.getByTestId("onb-url-input"), {
      target: { value: "https://www.youtube.com/@example" },
    });
    fireEvent.click(screen.getByTestId("onb-url-submit"));

    // Step 2 → confirm
    await waitFor(() => {
      expect(screen.getByTestId("onb-confirm-submit")).toBeDefined();
    });
    fireEvent.click(screen.getByTestId("onb-confirm-submit"));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
    expect(confirmSpy).toHaveBeenCalledWith({
      preview_token: "tok-abc",
      source_url: "https://www.youtube.com/@example",
      default_language: "tr",
      notes: undefined,
      profile_name: "Example Channel",
    });
  });

  it("DoneStep CTA navigates to Branding Center for the created channel", async () => {
    vi.spyOn(channelApi, "previewChannelImport").mockResolvedValue(
      makePreview(),
    );
    vi.spyOn(channelApi, "confirmChannelImport").mockResolvedValue(
      makeCreated({ id: "ch-99" }),
    );

    renderPage();

    fireEvent.change(screen.getByTestId("onb-url-input"), {
      target: { value: "https://www.youtube.com/@example" },
    });
    fireEvent.click(screen.getByTestId("onb-url-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("onb-confirm-submit")).toBeDefined();
    });
    fireEvent.click(screen.getByTestId("onb-confirm-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("onb-go-branding")).toBeDefined();
    });
    fireEvent.click(screen.getByTestId("onb-go-branding"));

    await waitFor(() => {
      expect(screen.getByTestId("route-branding-center")).toBeDefined();
    });
  });

  it("partial preview surfaces a warning chip in ConfirmStep", async () => {
    vi.spyOn(channelApi, "previewChannelImport").mockResolvedValue(
      makePreview({
        is_partial: true,
        title: null,
        fetch_error: "metadata fetch incomplete",
      }),
    );

    renderPage();

    fireEvent.change(screen.getByTestId("onb-url-input"), {
      target: { value: "https://www.youtube.com/@example" },
    });
    fireEvent.click(screen.getByTestId("onb-url-submit"));

    await waitFor(() => {
      expect(screen.getByText("Kısmi metadata")).toBeDefined();
    });
    expect(screen.getByText("metadata fetch incomplete")).toBeDefined();
  });
});
