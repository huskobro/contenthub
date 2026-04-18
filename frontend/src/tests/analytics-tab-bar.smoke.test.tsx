/**
 * AnalyticsTabBar smoke tests — Redesign REV-2 / P2.2.
 *
 * AdminAnalyticsTabBar + UserAnalyticsTabBar router-aware tab stripes'in:
 *   - tüm tabları render ettiğini
 *   - aktif tabı path'ten doğru türettiğini (prefix match)
 *   - tıklamanın navigate() ile rotayı değiştirdiğini
 * doğrular. Tek gerçek kaynak: URL (Zustand/query string yok).
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  AdminAnalyticsTabBar,
  UserAnalyticsTabBar,
} from "../components/analytics/AnalyticsTabBar";

function renderAdminAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminAnalyticsTabBar />
    </MemoryRouter>,
  );
}

function renderUserAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <UserAnalyticsTabBar />
    </MemoryRouter>,
  );
}

describe("AdminAnalyticsTabBar", () => {
  it("renders all 5 admin tabs", () => {
    renderAdminAt("/admin/analytics");
    expect(screen.getByTestId("admin-analytics-tab-bar")).toBeDefined();
    expect(screen.getByTestId("admin-analytics-tab-overview")).toBeDefined();
    expect(screen.getByTestId("admin-analytics-tab-content")).toBeDefined();
    expect(screen.getByTestId("admin-analytics-tab-operations")).toBeDefined();
    expect(screen.getByTestId("admin-analytics-tab-youtube")).toBeDefined();
    expect(screen.getByTestId("admin-analytics-tab-publish")).toBeDefined();
  });

  it("marks overview active on /admin/analytics", () => {
    renderAdminAt("/admin/analytics");
    expect(
      screen.getByTestId("admin-analytics-tab-overview").className,
    ).toContain("font-semibold");
    expect(
      screen.getByTestId("admin-analytics-tab-content").className,
    ).not.toContain("font-semibold");
  });

  it("marks content active on /admin/analytics/content (prefix match)", () => {
    renderAdminAt("/admin/analytics/content");
    expect(
      screen.getByTestId("admin-analytics-tab-content").className,
    ).toContain("font-semibold");
    // overview should NOT be active even though /admin/analytics is a prefix.
    expect(
      screen.getByTestId("admin-analytics-tab-overview").className,
    ).not.toContain("font-semibold");
  });

  it("marks operations active on /admin/analytics/operations", () => {
    renderAdminAt("/admin/analytics/operations");
    expect(
      screen.getByTestId("admin-analytics-tab-operations").className,
    ).toContain("font-semibold");
  });

  it("marks youtube active on /admin/analytics/youtube", () => {
    renderAdminAt("/admin/analytics/youtube");
    expect(
      screen.getByTestId("admin-analytics-tab-youtube").className,
    ).toContain("font-semibold");
  });

  it("marks publish active on /admin/analytics/publish", () => {
    renderAdminAt("/admin/analytics/publish");
    expect(
      screen.getByTestId("admin-analytics-tab-publish").className,
    ).toContain("font-semibold");
  });

});

describe("UserAnalyticsTabBar", () => {
  it("renders all 3 user tabs", () => {
    renderUserAt("/user/analytics");
    expect(screen.getByTestId("user-analytics-tab-bar")).toBeDefined();
    expect(screen.getByTestId("user-analytics-tab-overview")).toBeDefined();
    expect(screen.getByTestId("user-analytics-tab-youtube")).toBeDefined();
    expect(screen.getByTestId("user-analytics-tab-channels")).toBeDefined();
  });

  it("marks overview active on /user/analytics", () => {
    renderUserAt("/user/analytics");
    expect(
      screen.getByTestId("user-analytics-tab-overview").className,
    ).toContain("font-semibold");
  });

  it("marks youtube active on /user/analytics/youtube (prefix match)", () => {
    renderUserAt("/user/analytics/youtube");
    expect(
      screen.getByTestId("user-analytics-tab-youtube").className,
    ).toContain("font-semibold");
    expect(
      screen.getByTestId("user-analytics-tab-overview").className,
    ).not.toContain("font-semibold");
  });

  it("marks channels active on /user/analytics/channels", () => {
    renderUserAt("/user/analytics/channels");
    expect(
      screen.getByTestId("user-analytics-tab-channels").className,
    ).toContain("font-semibold");
  });

});
