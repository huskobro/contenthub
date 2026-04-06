/**
 * M23 Frontend Smoke Tests — Operations hardening, readiness updates.
 *
 * M23-A: Publish metadata settings registered
 * M23-B: Analytics trace quality display
 * M23-D: Settings/visibility readiness updated
 * M23-E: Publish readiness updated
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock react-router-dom ──
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/admin", search: "", hash: "", state: null }),
}));

// ── Mock React Query ──
const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useQuery: () => ({ data: undefined, isLoading: false, isError: false }),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── M23: Readiness Status Updates ──────────────────────────

describe("M23: Readiness Status Updates", () => {
  it("publish readiness shows dynamic status (Hazir or Yapilandirilmadi)", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-publish");
    const text = item.textContent || "";
    expect(text.includes("Hazir") || text.includes("Yapilandirilmadi")).toBe(true);
  });

  it("settings readiness shows Hazir", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-settings");
    expect(item.textContent).toContain("Hazir");
  });

  it("analytics readiness shows Hazir", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-analytics");
    expect(item.textContent).toContain("Hazir");
  });

  it("publish detail mentions yayin", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-publish");
    expect(item.textContent).toContain("yayin");
  });

  it("analytics detail mentions analytics", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-analytics");
    expect(item.textContent).toContain("analytics");
  });

  it("settings detail mentions aktif", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-settings");
    expect(item.textContent).toContain("aktif");
  });
});
