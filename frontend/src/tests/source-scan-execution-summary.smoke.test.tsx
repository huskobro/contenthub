/**
 * Phase 64: Source Scan Execution Summary Frontend smoke tests.
 *
 * Covers:
 *   A) computeSourceScanExecution: queued → Bekliyor
 *   B) computeSourceScanExecution: failed → Hata aldı
 *   C) computeSourceScanExecution: completed + result_count > 0 → Sonuç üretti
 *   D) computeSourceScanExecution: completed + result_count = 0 → Tamamlandı
 *   E) computeSourceScanExecution: null → Belirsiz
 *   F) SourceScanExecutionBadge renders Bekliyor
 *   G) SourceScanExecutionBadge renders Hata aldı
 *   H) SourceScanExecutionSummary shows Sonuç üretti badge
 *   I) SourceScanExecutionSummary shows secondary detail text
 *   J) SourceScansTable renders Çalışma Özeti column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeSourceScanExecution } from "../components/source-scans/SourceScanExecutionSummary";
import { SourceScanExecutionBadge } from "../components/source-scans/SourceScanExecutionBadge";
import { SourceScanExecutionSummary } from "../components/source-scans/SourceScanExecutionSummary";
import { SourceScansTable } from "../components/source-scans/SourceScansTable";

// ── computeSourceScanExecution ────────────────────────────────────────────────
describe("computeSourceScanExecution", () => {
  it("A) queued → Bekliyor", () => {
    expect(computeSourceScanExecution("queued", null)).toBe("Bekliyor");
  });

  it("B) failed → Hata aldı", () => {
    expect(computeSourceScanExecution("failed", 0)).toBe("Hata aldı");
  });

  it("C) completed + result_count > 0 → Sonuç üretti", () => {
    expect(computeSourceScanExecution("completed", 5)).toBe("Sonuç üretti");
  });

  it("D) completed + result_count = 0 → Tamamlandı", () => {
    expect(computeSourceScanExecution("completed", 0)).toBe("Tamamlandı");
  });

  it("E) null → Belirsiz", () => {
    expect(computeSourceScanExecution(null, null)).toBe("Belirsiz");
  });
});

// ── SourceScanExecutionBadge ──────────────────────────────────────────────────
describe("SourceScanExecutionBadge", () => {
  it("F) renders Bekliyor", () => {
    render(<SourceScanExecutionBadge level="Bekliyor" />);
    expect(screen.getByText("Bekliyor")).toBeTruthy();
  });

  it("G) renders Hata aldı", () => {
    render(<SourceScanExecutionBadge level="Hata aldı" />);
    expect(screen.getByText("Hata aldı")).toBeTruthy();
  });
});

// ── SourceScanExecutionSummary ────────────────────────────────────────────────
describe("SourceScanExecutionSummary", () => {
  it("H) shows Sonuç üretti badge for completed with results", () => {
    render(
      <SourceScanExecutionSummary
        status="completed"
        resultCount={10}
        errorSummary={null}
      />
    );
    expect(screen.getByText("Sonuç üretti")).toBeTruthy();
  });

  it("I) shows secondary detail text with result count", () => {
    render(
      <SourceScanExecutionSummary
        status="completed"
        resultCount={3}
        errorSummary={null}
      />
    );
    expect(screen.getByText(/3 sonuç/)).toBeTruthy();
  });
});

// ── SourceScansTable ──────────────────────────────────────────────────────────
const mockScan = (overrides: object = {}) => ({
  id: "sc-1",
  source_id: "src-abc-123",
  scan_mode: "manual",
  status: "completed",
  requested_by: null,
  started_at: null,
  finished_at: null,
  result_count: 5,
  error_summary: null,
  raw_result_preview_json: null,
  notes: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  ...overrides,
});

describe("SourceScansTable execution summary", () => {
  it("J) renders Çalışma Özeti column header", () => {
    render(<SourceScansTable scans={[mockScan()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Çalışma Özeti")).toBeTruthy();
  });
});
