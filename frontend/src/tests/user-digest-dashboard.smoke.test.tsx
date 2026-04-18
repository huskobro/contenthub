/**
 * UserDigestDashboard smoke tests — Redesign REV-2 / P1.4.
 *
 * Coverage:
 *  1. Admin role → renders null (panel user bakışı için).
 *  2. Unauthenticated → renders null.
 *  3. User + mock data → 4 KPI tiles render with expected counts.
 *  4. User + empty data → all tiles show "0".
 *  5. Clicking "Onayımı Bekleyen" tile navigates to /user/publish.
 *  6. Clicking "Başarısız İş" tile navigates to /user/jobs.
 *  7. Clicking "Gelen Kutusu" tile navigates to /user/inbox.
 *
 * CLAUDE.md uyumu:
 *  - Backend authority: user rolü zaten kendi scope'una bağlı; client-side
 *    filtreleme sadece görsel katman.
 *  - Tüm tile'lar testid ile görünür — no hidden behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";

import { UserDigestDashboard } from "../components/user/UserDigestDashboard";
import { useAuthStore } from "../stores/authStore";
import * as authApi from "../api/authApi";
import * as jobsApi from "../api/jobsApi";
import * as publishApi from "../api/publishApi";
import * as automationApi from "../api/automationApi";
import type { JobResponse } from "../api/jobsApi";
import type { PublishRecordSummary } from "../api/publishApi";
import type { InboxItemResponse } from "../api/automationApi";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_PROFILE: authApi.UserInfo = {
  id: "u-7",
  email: "user7@test.local",
  display_name: "Hüseyin",
  role: "user",
  status: "active",
};

const ADMIN_PROFILE: authApi.UserInfo = {
  id: "a-1",
  email: "admin@test.local",
  display_name: "Admin",
  role: "admin",
  status: "active",
};

function makeJob(overrides: Partial<JobResponse>): JobResponse {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? `j-${Math.random().toString(36).slice(2, 8)}`,
    module_type: "standard_video",
    status: "completed",
    owner_id: "u-7",
    template_id: null,
    source_context_json: null,
    current_step_key: null,
    retry_count: 0,
    elapsed_total_seconds: 10,
    estimated_remaining_seconds: null,
    elapsed_seconds: null,
    eta_seconds: null,
    workspace_path: null,
    last_error: null,
    created_at: now,
    started_at: now,
    finished_at: now,
    updated_at: now,
    steps: [],
    ...overrides,
  };
}

function makePublish(overrides: Partial<PublishRecordSummary>): PublishRecordSummary {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? `p-${Math.random().toString(36).slice(2, 8)}`,
    job_id: "j-1",
    content_ref_type: "video",
    content_ref_id: "v-1",
    platform: "youtube",
    status: "completed",
    review_state: "approved",
    publish_attempt_count: 0,
    scheduled_at: null,
    published_at: null,
    platform_url: null,
    content_project_id: null,
    platform_connection_id: null,
    last_error_category: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeInbox(overrides: Partial<InboxItemResponse>): InboxItemResponse {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? `i-${Math.random().toString(36).slice(2, 8)}`,
    item_type: "review",
    channel_profile_id: null,
    owner_user_id: "u-7",
    related_project_id: null,
    related_entity_type: null,
    related_entity_id: null,
    title: "Review item",
    reason: null,
    status: "pending",
    priority: "normal",
    action_url: null,
    metadata_json: null,
    resolved_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/user"]}>
          <Routes>
            <Route path="/user" element={children} />
            <Route path="/user/jobs" element={<div data-testid="route-user-jobs" />} />
            <Route path="/user/inbox" element={<div data-testid="route-user-inbox" />} />
            <Route path="/user/publish" element={<div data-testid="route-user-publish" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function primeAuth(profile: authApi.UserInfo | null) {
  if (!profile) {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: true,
    });
    return;
  }
  useAuthStore.setState({
    accessToken: "t-test",
    refreshToken: "r-test",
    user: {
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      role: profile.role,
    },
    isAuthenticated: true,
    hasHydrated: true,
  });
  vi.spyOn(authApi, "fetchMe").mockResolvedValue(profile);
}

function renderDigest() {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <UserDigestDashboard />
    </Wrapper>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UserDigestDashboard (P1.4)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(jobsApi, "fetchJobs").mockResolvedValue([]);
    vi.spyOn(publishApi, "fetchPublishRecords").mockResolvedValue([]);
    vi.spyOn(automationApi, "fetchInboxItems").mockResolvedValue([]);
  });

  afterEach(() => {
    primeAuth(null);
  });

  it("renders nothing for admin role (user-panel digest only)", async () => {
    primeAuth(ADMIN_PROFILE);

    const { container } = renderDigest();

    await waitFor(() => {
      expect(container.querySelector("[data-testid='user-digest-dashboard']"))
        .toBeNull();
    });
  });

  it("renders nothing when unauthenticated", () => {
    primeAuth(null);

    const { container } = renderDigest();

    expect(container.querySelector("[data-testid='user-digest-dashboard']"))
      .toBeNull();
  });

  it("renders 4 tiles with correct counts for user", async () => {
    primeAuth(USER_PROFILE);

    const now = new Date();
    vi.spyOn(jobsApi, "fetchJobs").mockResolvedValue([
      makeJob({ status: "failed", finished_at: now.toISOString() }),
      makeJob({ status: "failed", finished_at: now.toISOString() }),
      makeJob({ status: "completed" }),
    ]);
    vi.spyOn(publishApi, "fetchPublishRecords").mockResolvedValue([
      makePublish({ review_state: "pending_review" }),
      makePublish({ review_state: "pending_review" }),
      makePublish({ review_state: "approved", status: "scheduled", scheduled_at: now.toISOString() }),
    ]);
    vi.spyOn(automationApi, "fetchInboxItems").mockResolvedValue([
      makeInbox({ status: "pending" }),
      makeInbox({ status: "pending" }),
      makeInbox({ status: "pending" }),
      makeInbox({ status: "pending" }),
    ]);

    renderDigest();

    await waitFor(() => {
      expect(screen.getByTestId("user-digest-dashboard")).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-digest-pending-review-value").textContent)
        .toBe("2");
    });
    expect(screen.getByTestId("user-digest-this-week-value").textContent)
      .toBe("1");
    expect(screen.getByTestId("user-digest-failed-jobs-value").textContent)
      .toBe("2");
    expect(screen.getByTestId("user-digest-inbox-value").textContent)
      .toBe("4");
  });

  it("shows zeros when there is no data", async () => {
    primeAuth(USER_PROFILE);

    renderDigest();

    await waitFor(() => {
      expect(screen.getByTestId("user-digest-dashboard")).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-digest-pending-review-value").textContent)
        .toBe("0");
    });
    expect(screen.getByTestId("user-digest-this-week-value").textContent)
      .toBe("0");
    expect(screen.getByTestId("user-digest-failed-jobs-value").textContent)
      .toBe("0");
    expect(screen.getByTestId("user-digest-inbox-value").textContent)
      .toBe("0");
  });

  it("clicking 'Onayımı Bekleyen' navigates to /user/publish", async () => {
    primeAuth(USER_PROFILE);

    renderDigest();

    await waitFor(() => {
      expect(screen.getByTestId("user-digest-pending-review-cta")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("user-digest-pending-review-cta"));

    await waitFor(() => {
      expect(screen.getByTestId("route-user-publish")).toBeDefined();
    });
  });

  it("clicking 'Başarısız İş' navigates to /user/jobs", async () => {
    primeAuth(USER_PROFILE);

    renderDigest();

    await waitFor(() => {
      expect(screen.getByTestId("user-digest-failed-jobs-cta")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("user-digest-failed-jobs-cta"));

    await waitFor(() => {
      expect(screen.getByTestId("route-user-jobs")).toBeDefined();
    });
  });

  it("clicking 'Gelen Kutusu' navigates to /user/inbox", async () => {
    primeAuth(USER_PROFILE);

    renderDigest();

    await waitFor(() => {
      expect(screen.getByTestId("user-digest-inbox-cta")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("user-digest-inbox-cta"));

    await waitFor(() => {
      expect(screen.getByTestId("route-user-inbox")).toBeDefined();
    });
  });
});
