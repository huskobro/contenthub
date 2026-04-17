/**
 * AdminDigestDashboard smoke tests — Redesign REV-2 / P1.3.
 *
 * Coverage:
 *  1. Non-admin role → renders null (admin-only digest).
 *  2. Unauthenticated → renders null.
 *  3. Admin + mock data → 4 KPI tiles render with expected counts.
 *  4. Admin + empty data → all tiles show "0".
 *  5. Scope label follows adminScopeStore mode (all vs user).
 *  6. Clicking a tile navigates (CTA wrapper fires onClick).
 *
 * CLAUDE.md uyumu:
 *  - Backend authority değişmedi; client-side filtreleme sadece görsel katman.
 *  - Tüm tile'lar testid ile görünür — no hidden behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";

import { AdminDigestDashboard } from "../components/admin/AdminDigestDashboard";
import {
  useAdminScopeStore,
  __resetAdminScopeStoreForTests,
} from "../stores/adminScopeStore";
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

const ADMIN_PROFILE: authApi.UserInfo = {
  id: "a-1",
  email: "admin@test.local",
  display_name: "Admin",
  role: "admin",
  status: "active",
};

const USER_PROFILE: authApi.UserInfo = {
  id: "u-7",
  email: "user@test.local",
  display_name: "User",
  role: "user",
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
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route path="/admin" element={children} />
            <Route path="/admin/jobs" element={<div data-testid="route-jobs" />} />
            <Route path="/admin/inbox" element={<div data-testid="route-inbox" />} />
            <Route path="/admin/publish" element={<div data-testid="route-publish" />} />
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
      <AdminDigestDashboard />
    </Wrapper>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdminDigestDashboard (P1.3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetAdminScopeStoreForTests();
    // Default: empty responses so isLoading resolves quickly.
    vi.spyOn(jobsApi, "fetchJobs").mockResolvedValue([]);
    vi.spyOn(publishApi, "fetchPublishRecords").mockResolvedValue([]);
    vi.spyOn(automationApi, "fetchInboxItems").mockResolvedValue([]);
  });

  afterEach(() => {
    primeAuth(null);
    __resetAdminScopeStoreForTests();
  });

  it("renders nothing for non-admin role (user)", async () => {
    primeAuth(USER_PROFILE);

    const { container } = renderDigest();

    await waitFor(() => {
      expect(container.querySelector("[data-testid='admin-digest-dashboard']"))
        .toBeNull();
    });
  });

  it("renders nothing when unauthenticated", () => {
    primeAuth(null);

    const { container } = renderDigest();

    expect(container.querySelector("[data-testid='admin-digest-dashboard']"))
      .toBeNull();
  });

  it("renders 4 tiles with correct counts for admin (all-users scope)", async () => {
    primeAuth(ADMIN_PROFILE);

    const now = new Date();
    vi.spyOn(jobsApi, "fetchJobs").mockResolvedValue([
      makeJob({ status: "failed", retry_count: 0, finished_at: now.toISOString() }),
      makeJob({ status: "failed", retry_count: 1, finished_at: now.toISOString() }),
      makeJob({ status: "completed", retry_count: 0 }),
    ]);
    vi.spyOn(publishApi, "fetchPublishRecords").mockResolvedValue([
      makePublish({ status: "queued", created_at: now.toISOString() }),
      makePublish({ status: "scheduled", scheduled_at: now.toISOString() }),
    ]);
    vi.spyOn(automationApi, "fetchInboxItems").mockResolvedValue([
      makeInbox({ status: "pending" }),
      makeInbox({ status: "pending" }),
      makeInbox({ status: "pending" }),
    ]);

    renderDigest();

    await waitFor(() => {
      expect(screen.getByTestId("admin-digest-dashboard")).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getByTestId("admin-digest-failed-jobs-value").textContent)
        .toBe("2");
    });
    expect(screen.getByTestId("admin-digest-retry-candidates-value").textContent)
      .toBe("2");
    expect(screen.getByTestId("admin-digest-pending-review-value").textContent)
      .toBe("3");
    expect(screen.getByTestId("admin-digest-publish-queue-value").textContent)
      .toBe("2");
  });

  it("shows zeros when there is no data", async () => {
    primeAuth(ADMIN_PROFILE);

    renderDigest();

    await waitFor(() => {
      expect(screen.getByTestId("admin-digest-dashboard")).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getByTestId("admin-digest-failed-jobs-value").textContent)
        .toBe("0");
    });
    expect(screen.getByTestId("admin-digest-retry-candidates-value").textContent)
      .toBe("0");
    expect(screen.getByTestId("admin-digest-pending-review-value").textContent)
      .toBe("0");
    expect(screen.getByTestId("admin-digest-publish-queue-value").textContent)
      .toBe("0");
  });

  it("scope label reflects 'Tüm Kullanıcılar' in mode=all", async () => {
    primeAuth(ADMIN_PROFILE);

    renderDigest();

    await waitFor(() => {
      const dash = screen.getByTestId("admin-digest-dashboard");
      expect(dash.textContent).toContain("Tüm Kullanıcılar");
    });
  });

  it("scope label reflects 'Odaklı Kullanıcı' when focused on a user", async () => {
    primeAuth(ADMIN_PROFILE);
    useAdminScopeStore.getState().focusUser("u-7");

    renderDigest();

    await waitFor(() => {
      const dash = screen.getByTestId("admin-digest-dashboard");
      expect(dash.textContent).toContain("Odaklı Kullanıcı");
    });
  });

  it("clicking 'Başarısız İşler' tile navigates to /admin/jobs", async () => {
    primeAuth(ADMIN_PROFILE);

    renderDigest();

    await waitFor(() => {
      expect(screen.getByTestId("admin-digest-failed-jobs-cta")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("admin-digest-failed-jobs-cta"));

    await waitFor(() => {
      expect(screen.getByTestId("route-jobs")).toBeDefined();
    });
  });
});
