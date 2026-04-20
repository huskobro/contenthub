/**
 * M23 Frontend Smoke Tests — Operations hardening, readiness updates.
 *
 * M23-A: Publish metadata settings registered
 * M23-B: Analytics trace quality display
 * M23-D: Settings/visibility readiness updated
 * M23-E: Publish readiness updated
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";

function renderOverview() {
  // AdminOverviewPage uses useQuery/useSearchParams — supply real providers
  // (no network via mocked fetch returning empty payloads).
  window.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
  ) as unknown as typeof window.fetch;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminOverviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── M23: Readiness Status Updates ──────────────────────────

describe("M23: Readiness Status Updates — overview surface retired", () => {
  // Readiness testid'leri (readiness-publish / readiness-settings /
  // readiness-analytics) AdminOverviewPage'den cikarildi; release-readiness
  // widget'i dedicated release dashboard'a tasindi. Bu dosyada sadece
  // "overview'da yok" negatif dogrulamasi tutulur; pozitif readiness
  // davranisi release dashboard smoke testlerinde dogrulanir.
  it("readiness-* testids are removed from AdminOverviewPage", () => {
    renderOverview();
    expect(screen.queryByTestId("readiness-publish")).toBeNull();
    expect(screen.queryByTestId("readiness-settings")).toBeNull();
    expect(screen.queryByTestId("readiness-analytics")).toBeNull();
  });
});
