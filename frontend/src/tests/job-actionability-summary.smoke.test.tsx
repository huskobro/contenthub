/**
 * Phase 67: Job Actionability Summary Frontend smoke tests.
 *
 * Covers:
 *   A) computeJobActionability: failed → Dikkat gerekli
 *   B) computeJobActionability: last_error filled → Dikkat gerekli
 *   C) computeJobActionability: queued → Bekliyor
 *   D) computeJobActionability: running → Çalışıyor
 *   E) computeJobActionability: completed → Tamamlandı
 *   F) JobActionabilityBadge renders Dikkat gerekli
 *   G) JobActionabilityBadge renders Tamamlandı
 *   H) JobActionabilitySummary shows correct badge
 *   I) JobActionabilitySummary shows retry info in detail
 *   J) JobsTable renders Aksiyon Özeti column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeJobActionability } from "../components/jobs/JobActionabilitySummary";
import { JobActionabilityBadge } from "../components/jobs/JobActionabilityBadge";
import { JobActionabilitySummary } from "../components/jobs/JobActionabilitySummary";
import { JobsTable } from "../components/jobs/JobsTable";

// ── computeJobActionability ───────────────────────────────────────────────────
describe("computeJobActionability", () => {
  it("A) failed → Dikkat gerekli", () => {
    expect(computeJobActionability("failed", null)).toBe("Dikkat gerekli");
  });

  it("B) last_error filled → Dikkat gerekli", () => {
    expect(computeJobActionability("completed", "some error")).toBe("Dikkat gerekli");
  });

  it("C) queued → Bekliyor", () => {
    expect(computeJobActionability("queued", null)).toBe("Bekliyor");
  });

  it("D) running → Çalışıyor", () => {
    expect(computeJobActionability("running", null)).toBe("Çalışıyor");
  });

  it("E) completed → Tamamlandı", () => {
    expect(computeJobActionability("completed", null)).toBe("Tamamlandı");
  });
});

// ── JobActionabilityBadge ─────────────────────────────────────────────────────
describe("JobActionabilityBadge", () => {
  it("F) renders Dikkat gerekli", () => {
    render(<JobActionabilityBadge level="Dikkat gerekli" />);
    expect(screen.getByText("Dikkat gerekli")).toBeTruthy();
  });

  it("G) renders Tamamlandı", () => {
    render(<JobActionabilityBadge level="Tamamlandı" />);
    expect(screen.getByText("Tamamlandı")).toBeTruthy();
  });
});

// ── JobActionabilitySummary ───────────────────────────────────────────────────
describe("JobActionabilitySummary", () => {
  it("H) shows Çalışıyor badge for running status", () => {
    render(
      <JobActionabilitySummary
        status="running"
        lastError={null}
        retryCount={0}
        currentStepKey="tts_step"
        estimatedRemainingSeconds={null}
      />
    );
    expect(screen.getByText("Çalışıyor")).toBeTruthy();
  });

  it("I) shows retry count in detail", () => {
    render(
      <JobActionabilitySummary
        status="queued"
        lastError={null}
        retryCount={2}
        currentStepKey={null}
        estimatedRemainingSeconds={null}
      />
    );
    expect(screen.getByText(/2x retry/)).toBeTruthy();
  });
});

// ── JobsTable ─────────────────────────────────────────────────────────────────
const mockJob = (overrides: object = {}) => ({
  id: "job-1",
  module_type: "news_bulletin",
  status: "queued",
  owner_id: null,
  template_id: null,
  source_context_json: null,
  current_step_key: null,
  retry_count: 0,
  elapsed_total_seconds: null,
  estimated_remaining_seconds: null,
  workspace_path: null,
  last_error: null,
  created_at: "2026-04-02T10:00:00Z",
  started_at: null,
  finished_at: null,
  updated_at: "2026-04-02T10:00:00Z",
  ...overrides,
});

describe("JobsTable actionability summary", () => {
  it("J) renders Aksiyon Özeti column header", () => {
    render(<JobsTable jobs={[mockJob()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Aksiyon Özeti")).toBeTruthy();
  });
});
