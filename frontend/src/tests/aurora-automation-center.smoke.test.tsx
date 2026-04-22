/**
 * Aurora Automation Center smoke tests.
 *
 * Coverage:
 *   1. Renders the canvas with all nodes; each node carries data-status and
 *      data-mode for the dual-badge contract.
 *   2. snapshot_locked === true disables the Run-Now and Save-Flow buttons
 *      and surfaces the lock banner.
 *   3. Admin role sees the "Zorla çalıştır" button; user role does not.
 *   4. Run-Now success with a job_id navigates the user to the job detail.
 *   5. Evaluate fires evaluateAutomation and surfaces blockers in the banner.
 *
 * CLAUDE.md uyumu:
 *   - server-derived `status` is read-only (we never mutate it client-side);
 *     tests confirm the dual-badge contract via data attributes.
 *   - admin-only "force run" is gated by ctx.user.role.
 *   - run-now uses POST /run-now and the resulting job_id triggers a route
 *     change — no fake success.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";

import { AuroraAutomationCenterPage } from "../surfaces/aurora/AuroraAutomationCenterPage";
import { useAuthStore } from "../stores/authStore";
import * as authApi from "../api/authApi";
import * as automationApi from "../api/automationCenterApi";
import type {
  AutomationCenterResponse,
  AutomationNode,
} from "../api/automationCenterApi";

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
  id: "u-1",
  email: "user@test.local",
  display_name: "User",
  role: "user",
  status: "active",
};

function makeNode(overrides: Partial<AutomationNode>): AutomationNode {
  return {
    id: overrides.id ?? "n-1",
    title: overrides.title ?? "Brief",
    description: null,
    scope: overrides.scope ?? "input",
    operation_mode: overrides.operation_mode ?? "manual",
    status: overrides.status ?? "ready",
    badges: overrides.badges ?? [],
    config: overrides.config ?? {},
    last_run_at: null,
    last_run_outcome: null,
  };
}

function makeAutomation(
  overrides: Partial<AutomationCenterResponse> = {},
): AutomationCenterResponse {
  return {
    project: {
      id: "p-1",
      title: "Demo Proje",
      module_type: "standard_video",
      user_id: "u-1",
      channel_profile_id: "ch-1",
      primary_platform: "youtube",
      content_status: "in_progress",
      publish_status: "draft",
    },
    flow: {
      run_mode: "assisted",
      schedule_enabled: false,
      cron_expression: null,
      timezone: "Europe/Istanbul",
      require_review_gate: true,
      publish_policy: "review",
      fallback_on_error: "pause",
      max_runs_per_day: 6,
      default_template_id: null,
      default_blueprint_id: null,
    },
    nodes: [
      makeNode({ id: "n-1", title: "Brief", status: "complete" }),
      makeNode({ id: "n-2", title: "Script", status: "ready", operation_mode: "ai_assist" }),
      makeNode({ id: "n-3", title: "Render", status: "blocked", operation_mode: "automatic" }),
    ],
    edges: [
      { source: "n-1", target: "n-2", kind: "default" },
      { source: "n-2", target: "n-3", kind: "default" },
    ],
    health: { blockers: ["n-3"], warnings: [] },
    last_evaluated_at: new Date().toISOString(),
    snapshot_locked: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function primeAuth(profile: authApi.UserInfo) {
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

function clearAuth() {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
    hasHydrated: true,
  });
}

function renderPage(
  initialEntry = "/user/projects/p-1/automation-center",
  basePath: "user" | "admin" = "user",
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path={`/${basePath}/projects/:projectId/automation-center`}
            element={<AuroraAutomationCenterPage />}
          />
          <Route
            path={`/${basePath}/jobs/:jobId`}
            element={<div data-testid="route-job-detail" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuroraAutomationCenterPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearAuth();
  });

  it("renders canvas with nodes carrying data-status and data-mode", async () => {
    primeAuth(USER_PROFILE);
    vi.spyOn(automationApi, "fetchAutomationCenter").mockResolvedValue(
      makeAutomation(),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("aurora-automation-center")).toBeDefined();
    });

    const canvas = screen.getByTestId("ac-canvas");
    const nodeBtns = canvas.querySelectorAll("[data-node-id]");
    expect(nodeBtns.length).toBe(3);

    const blocked = canvas.querySelector('[data-node-id="n-3"]');
    expect(blocked?.getAttribute("data-status")).toBe("blocked");
    expect(blocked?.getAttribute("data-mode")).toBe("automatic");
  });

  it("snapshot_locked disables Run-Now and Save-Flow buttons", async () => {
    primeAuth(USER_PROFILE);
    vi.spyOn(automationApi, "fetchAutomationCenter").mockResolvedValue(
      makeAutomation({ snapshot_locked: true }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("ac-run-now")).toBeDefined();
    });

    const runNow = screen.getByTestId("ac-run-now") as HTMLButtonElement;
    expect(runNow.disabled).toBe(true);

    // FlowHeaderCard must mount before the save button exists.
    await waitFor(() => {
      expect(screen.getByTestId("ac-save-flow")).toBeDefined();
    });
    const saveFlow = screen.getByTestId("ac-save-flow") as HTMLButtonElement;
    expect(saveFlow.disabled).toBe(true);
  });

  it("admin sees 'Zorla çalıştır'; user does not", async () => {
    primeAuth(USER_PROFILE);
    vi.spyOn(automationApi, "fetchAutomationCenter").mockResolvedValue(
      makeAutomation(),
    );

    const userView = renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("aurora-automation-center")).toBeDefined();
    });
    expect(screen.queryByText("Zorla çalıştır")).toBeNull();

    userView.unmount();
    clearAuth();

    primeAuth(ADMIN_PROFILE);
    vi.spyOn(automationApi, "fetchAutomationCenter").mockResolvedValue(
      makeAutomation(),
    );

    renderPage("/admin/projects/p-1/automation-center", "admin");
    await waitFor(() => {
      expect(screen.getByTestId("aurora-automation-center")).toBeDefined();
    });
    expect(screen.getByText("Zorla çalıştır")).toBeDefined();
  });

  it("Run-Now success with job_id navigates to job detail", async () => {
    primeAuth(USER_PROFILE);
    vi.spyOn(automationApi, "fetchAutomationCenter").mockResolvedValue(
      makeAutomation(),
    );
    vi.spyOn(automationApi, "runAutomationNow").mockResolvedValue({
      ok: true,
      job_id: "job-xyz",
      detail: null,
      blockers: [],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("ac-run-now")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("ac-run-now"));

    await waitFor(() => {
      expect(screen.getByTestId("route-job-detail")).toBeDefined();
    });
  });

  it("Evaluate surfaces blockers in the banner", async () => {
    primeAuth(USER_PROFILE);
    vi.spyOn(automationApi, "fetchAutomationCenter").mockResolvedValue(
      makeAutomation(),
    );
    vi.spyOn(automationApi, "evaluateAutomation").mockResolvedValue({
      ok: false,
      blockers: ["render_target_missing"],
      warnings: [],
      next_run_estimate: null,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("ac-evaluate")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("ac-evaluate"));

    await waitFor(() => {
      expect(screen.getByText(/Engeller:/)).toBeDefined();
    });
    expect(screen.getByText(/render_target_missing/)).toBeDefined();
  });
});
