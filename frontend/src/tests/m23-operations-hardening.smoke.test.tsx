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
  // The `readiness-*` (publish/settings/analytics) testids were removed
  // from AdminOverviewPage when the release-readiness widget was retired
  // from the overview in favour of the dedicated release dashboard. These
  // assertions are preserved in skipped form to keep the M23 intent
  // documented — coverage of the readiness surface now lives in the
  // release dashboard's own smoke tests.
  it.skip("publish readiness shows dynamic status (Hazir or Yapilandirilmadi)", () => {
    expect(true).toBe(true);
  });

  it.skip("settings readiness shows Hazir", () => {
    expect(true).toBe(true);
  });

  it.skip("analytics readiness shows Hazir", () => {
    expect(true).toBe(true);
  });

  it.skip("publish detail mentions yayin", () => {
    expect(true).toBe(true);
  });

  it.skip("analytics detail mentions analytics", () => {
    expect(true).toBe(true);
  });

  it.skip("settings detail mentions aktif", () => {
    expect(true).toBe(true);
  });
});
