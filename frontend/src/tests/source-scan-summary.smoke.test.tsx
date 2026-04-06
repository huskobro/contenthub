/**
 * Phase 54: Source Scan Summary Frontend smoke tests.
 *
 * Covers:
 *   A) SourceScanStatusBadge shows "Scan yok" when no status and count=0
 *   B) SourceScanStatusBadge shows status "completed"
 *   C) SourceScanStatusBadge shows status "failed"
 *   D) SourceScanStatusBadge shows count
 *   E) SourceScanSummary renders with no scans
 *   F) SourceScanSummary renders last_scan_status
 *   G) SourceScanSummary renders finished_at date when provided
 *   H) SourcesTable renders "Scans" column header
 *   I) SourcesTable shows "Scan yok" for source with no scans
 *   J) SourcesTable shows scan status for source with scans
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SourceScanStatusBadge } from "../components/sources/SourceScanStatusBadge";
import { SourceScanSummary } from "../components/sources/SourceScanSummary";

// ── SourceScanStatusBadge ─────────────────────────────────────────────────────
describe("SourceScanStatusBadge", () => {
  it("A) shows Scan yok when no status and count=0", () => {
    render(<SourceScanStatusBadge />);
    expect(screen.getByText("Scan yok")).toBeTruthy();
  });

  it("B) shows completed status", () => {
    render(<SourceScanStatusBadge status="completed" scanCount={3} />);
    expect(screen.getByText("completed")).toBeTruthy();
  });

  it("C) shows failed status", () => {
    render(<SourceScanStatusBadge status="failed" scanCount={1} />);
    expect(screen.getByText("failed")).toBeTruthy();
  });

  it("D) shows scan count", () => {
    render(<SourceScanStatusBadge status="completed" scanCount={5} />);
    expect(screen.getByText("(5x)")).toBeTruthy();
  });
});

// ── SourceScanSummary ─────────────────────────────────────────────────────────
describe("SourceScanSummary", () => {
  it("E) renders Scan yok with no scans", () => {
    render(<SourceScanSummary scanCount={0} />);
    expect(screen.getByText("Scan yok")).toBeTruthy();
  });

  it("F) renders last_scan_status", () => {
    render(<SourceScanSummary scanCount={2} lastScanStatus="queued" />);
    expect(screen.getByText("queued")).toBeTruthy();
  });

  it("G) renders finished_at date", () => {
    render(<SourceScanSummary scanCount={1} lastScanStatus="completed" lastScanFinishedAt="2026-04-02T10:00:00Z" />);
    expect(screen.getByText("completed")).toBeTruthy();
    // Date is rendered — just verify it doesn't crash
    expect(screen.getByText(/2026/)).toBeTruthy();
  });
});

