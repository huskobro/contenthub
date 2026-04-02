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
import { SourcesTable } from "../components/sources/SourcesTable";

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

// ── SourcesTable ──────────────────────────────────────────────────────────────
const mockSource = (overrides: object = {}) => ({
  id: "src-1",
  name: "Test Source",
  source_type: "rss",
  status: "active",
  base_url: null,
  feed_url: "https://example.com/feed.xml",
  api_endpoint: null,
  trust_level: "high",
  scan_mode: "manual",
  language: "tr",
  category: null,
  notes: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  ...overrides,
});

describe("SourcesTable scan summary", () => {
  it("H) renders Scans column header", () => {
    render(<SourcesTable sources={[mockSource()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Scans")).toBeTruthy();
  });

  it("I) shows Scan yok for source with no scans", () => {
    render(<SourcesTable sources={[mockSource({ scan_count: 0 })]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Scan yok")).toBeTruthy();
  });

  it("J) shows scan status for source with scans", () => {
    render(<SourcesTable sources={[mockSource({ scan_count: 3, last_scan_status: "completed" })]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("completed")).toBeTruthy();
    expect(screen.getByText("(3x)")).toBeTruthy();
  });
});
