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
  it("publish readiness shows M23 aktif", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-publish");
    expect(item.textContent).toContain("M23 aktif");
  });

  it("settings readiness shows M23 aktif", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-settings");
    expect(item.textContent).toContain("M23 aktif");
  });

  it("analytics readiness shows M23 aktif", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-analytics");
    expect(item.textContent).toContain("M23 aktif");
  });

  it("publish detail mentions metadata hardening", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-publish");
    expect(item.textContent).toContain("metadata hardening");
  });

  it("analytics detail mentions trace data quality", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-analytics");
    expect(item.textContent).toContain("trace data quality");
  });

  it("settings detail mentions restore", () => {
    render(<AdminOverviewPage />);
    const item = screen.getByTestId("readiness-settings");
    expect(item.textContent).toContain("restore");
  });
});
