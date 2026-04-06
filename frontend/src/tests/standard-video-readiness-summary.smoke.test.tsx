/**
 * Phase 63: Standard Video Readiness Summary Frontend smoke tests.
 *
 * Covers:
 *   A) computeStandardVideoReadiness: null topic → Başlangıç
 *   B) computeStandardVideoReadiness: topic + draft → Taslak
 *   C) computeStandardVideoReadiness: topic + script_ready → Script hazır
 *   D) computeStandardVideoReadiness: topic + metadata_ready → Hazır
 *   E) computeStandardVideoReadiness: topic + ready → Hazır
 *   F) StandardVideoReadinessBadge renders Başlangıç
 *   G) StandardVideoReadinessBadge renders Hazır
 *   H) StandardVideoReadinessSummary shows correct badge for script_ready
 *   I) StandardVideoReadinessSummary shows secondary detail text
 *   J) StandardVideosTable renders Hazırlık column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeStandardVideoReadiness } from "../components/standard-video/StandardVideoReadinessSummary";
import { StandardVideoReadinessBadge } from "../components/standard-video/StandardVideoReadinessBadge";
import { StandardVideoReadinessSummary } from "../components/standard-video/StandardVideoReadinessSummary";
import { StandardVideosTable } from "../components/standard-video/StandardVideosTable";

// ── computeStandardVideoReadiness ────────────────────────────────────────────
describe("computeStandardVideoReadiness", () => {
  it("A) null topic → Başlangıç", () => {
    expect(computeStandardVideoReadiness(null, "draft")).toBe("Başlangıç");
  });

  it("B) topic + draft → Taslak", () => {
    expect(computeStandardVideoReadiness("Test konu", "draft")).toBe("Taslak");
  });

  it("C) topic + script_ready → Script hazır", () => {
    expect(computeStandardVideoReadiness("Test konu", "script_ready")).toBe("Script hazır");
  });

  it("D) topic + metadata_ready → Hazır", () => {
    expect(computeStandardVideoReadiness("Test konu", "metadata_ready")).toBe("Hazır");
  });

  it("E) topic + ready → Hazır", () => {
    expect(computeStandardVideoReadiness("Test konu", "ready")).toBe("Hazır");
  });
});

// ── StandardVideoReadinessBadge ───────────────────────────────────────────────
describe("StandardVideoReadinessBadge", () => {
  it("F) renders Başlangıç", () => {
    render(<StandardVideoReadinessBadge level="Başlangıç" />);
    expect(screen.getByText("Başlangıç")).toBeTruthy();
  });

  it("G) renders Hazır", () => {
    render(<StandardVideoReadinessBadge level="Hazır" />);
    expect(screen.getByText("Hazır")).toBeTruthy();
  });
});

// ── StandardVideoReadinessSummary ─────────────────────────────────────────────
describe("StandardVideoReadinessSummary", () => {
  it("H) shows Script hazır badge for script_ready", () => {
    render(
      <StandardVideoReadinessSummary
        topic="Test konu"
        status="script_ready"
      />
    );
    expect(screen.getByText("Script hazır")).toBeTruthy();
  });

  it("I) shows secondary detail text with status", () => {
    render(
      <StandardVideoReadinessSummary
        topic="Test konu"
        status="draft"
      />
    );
    expect(screen.getByText(/draft/)).toBeTruthy();
  });
});

// ── StandardVideosTable ───────────────────────────────────────────────────────
const mockVideo = (overrides: object = {}) => ({
  id: "sv-1",
  title: "Test Video",
  topic: "Test konu",
  brief: null,
  target_duration_seconds: 120,
  tone: null,
  language: "tr",
  visual_direction: null,
  subtitle_style: null,
  status: "draft",
  job_id: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  template_id: null,
  style_blueprint_id: null,
  ...overrides,
});

describe("StandardVideosTable readiness summary", () => {
  it("J) renders Hazırlık column header", () => {
    render(<StandardVideosTable videos={[mockVideo()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Hazırlık")).toBeTruthy();
  });
});
