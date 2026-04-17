/**
 * Phase Final F4 — AutomationDigestWidget smoke test.
 *
 * Covers three contract paths:
 *   1. empty scope (total_projects=0) -> empty-state badge
 *   2. enabled projects -> metric cards rendered
 *   3. error / unauthenticated -> widget hides silently (returns null)
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AutomationDigestWidget } from "../components/dashboard/AutomationDigestWidget";
import { fullAutoApi } from "../api/fullAutoApi";

function renderWidget() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AutomationDigestWidget />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AutomationDigestWidget", () => {
  it("shows empty state when no automation-enabled projects", async () => {
    vi.spyOn(fullAutoApi, "digestToday").mockResolvedValue({
      scope: "user",
      today_date: "2026-04-17",
      total_projects: 0,
      automation_enabled_count: 0,
      schedule_enabled_count: 0,
      runs_today_total: 0,
      runs_today_limit_total: 0,
      at_limit_count: 0,
      next_upcoming_run_at: null,
      projects: [],
    });

    renderWidget();
    await waitFor(() => {
      expect(screen.getByTestId("automation-digest-widget-empty")).toBeTruthy();
    });
  });

  it("renders metric cards when automation is active", async () => {
    vi.spyOn(fullAutoApi, "digestToday").mockResolvedValue({
      scope: "user",
      today_date: "2026-04-17",
      total_projects: 2,
      automation_enabled_count: 2,
      schedule_enabled_count: 1,
      runs_today_total: 3,
      runs_today_limit_total: 10,
      at_limit_count: 0,
      next_upcoming_run_at: null,
      projects: [
        {
          project_id: "p1",
          project_title: "Proje 1",
          channel_profile_id: null,
          automation_enabled: true,
          automation_run_mode: "full_auto",
          automation_schedule_enabled: false,
          automation_cron_expression: null,
          automation_publish_policy: "draft",
          automation_max_runs_per_day: 5,
          runs_today: 2,
          runs_today_date: "2026-04-17",
          last_run_at: null,
          next_run_at: null,
        },
        {
          project_id: "p2",
          project_title: "Proje 2",
          channel_profile_id: null,
          automation_enabled: true,
          automation_run_mode: "full_auto",
          automation_schedule_enabled: true,
          automation_cron_expression: "0 9 * * *",
          automation_publish_policy: "draft",
          automation_max_runs_per_day: 5,
          runs_today: 1,
          runs_today_date: "2026-04-17",
          last_run_at: null,
          next_run_at: "2026-04-18T09:00:00+00:00",
        },
      ],
    });

    renderWidget();
    await waitFor(() => {
      expect(screen.getByTestId("automation-digest-widget")).toBeTruthy();
    });
    expect(screen.getByTestId("digest-metric-enabled").textContent).toContain("2");
    expect(screen.getByTestId("digest-metric-scheduled").textContent).toContain("1");
    expect(screen.getByTestId("digest-metric-runs").textContent).toContain("3/10");
    expect(screen.getByTestId("digest-metric-at-limit").textContent).toContain("0");
    expect(screen.getByTestId("digest-upcoming-p2")).toBeTruthy();
  });

  it("hides silently on API error (unauthenticated or server down)", async () => {
    vi.spyOn(fullAutoApi, "digestToday").mockRejectedValue(new Error("401"));

    const { container } = renderWidget();
    // Loading ilk cikabilir — error fetilmesini bekleyelim
    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="automation-digest-widget-loading"]'),
      ).toBeNull();
    });
    // Final render: hicbir widget variantu DOM'da olmamali
    expect(
      container.querySelector('[data-testid^="automation-digest-widget"]'),
    ).toBeNull();
    expect(screen.queryByTestId("automation-digest-widget")).toBeNull();
    expect(screen.queryByTestId("automation-digest-widget-empty")).toBeNull();
  });
});
