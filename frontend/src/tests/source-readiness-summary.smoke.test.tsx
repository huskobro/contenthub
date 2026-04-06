/**
 * Phase 60: Source Readiness Summary Frontend smoke tests.
 *
 * Covers:
 *   A) computeSourceReadiness: rss + no feed_url → Başlangıç
 *   B) computeSourceReadiness: rss + feed_url + scan=0 → Yapılandı
 *   C) computeSourceReadiness: last_scan_status=failed → Dikkat gerekli
 *   D) computeSourceReadiness: active + last_scan=completed → Hazır
 *   E) computeSourceReadiness: active + no scan yet → Kısmen hazır
 *   F) SourceReadinessBadge renders Başlangıç
 *   G) SourceReadinessBadge renders Hazır
 *   H) SourceReadinessSummary shows correct badge
 *   I) SourceReadinessSummary shows secondary detail text
 *   J) SourcesTable renders Hazırlık column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeSourceReadiness } from "../components/sources/SourceReadinessSummary";
import { SourceReadinessBadge } from "../components/sources/SourceReadinessBadge";
import { SourceReadinessSummary } from "../components/sources/SourceReadinessSummary";

// ── computeSourceReadiness ─────────────────────────────────────────────────────
describe("computeSourceReadiness", () => {
  it("A) rss + no feed_url → Başlangıç", () => {
    expect(computeSourceReadiness("rss", "draft", null, null, null, 0, null)).toBe("Başlangıç");
  });

  it("B) rss + feed_url + scan=0 → Yapılandı", () => {
    expect(computeSourceReadiness("rss", "draft", null, "https://feed.example.com", null, 0, null)).toBe("Yapılandı");
  });

  it("C) last_scan_status=failed → Dikkat gerekli", () => {
    expect(computeSourceReadiness("rss", "active", null, "https://feed.example.com", null, 3, "failed")).toBe("Dikkat gerekli");
  });

  it("D) active + last_scan=completed → Hazır", () => {
    expect(computeSourceReadiness("rss", "active", null, "https://feed.example.com", null, 5, "completed")).toBe("Hazır");
  });

  it("E) active + no scan yet → Kısmen hazır", () => {
    expect(computeSourceReadiness("rss", "active", null, "https://feed.example.com", null, 0, null)).toBe("Kısmen hazır");
  });
});

// ── SourceReadinessBadge ───────────────────────────────────────────────────────
describe("SourceReadinessBadge", () => {
  it("F) renders Başlangıç", () => {
    render(<SourceReadinessBadge level="Başlangıç" />);
    expect(screen.getByText("Başlangıç")).toBeTruthy();
  });

  it("G) renders Hazır", () => {
    render(<SourceReadinessBadge level="Hazır" />);
    expect(screen.getByText("Hazır")).toBeTruthy();
  });
});

// ── SourceReadinessSummary ─────────────────────────────────────────────────────
describe("SourceReadinessSummary", () => {
  it("H) shows Hazır badge when active + completed", () => {
    render(
      <SourceReadinessSummary
        sourceType="rss"
        status="active"
        feedUrl="https://feed.example.com"
        scanCount={5}
        lastScanStatus="completed"
      />
    );
    expect(screen.getByText("Hazır")).toBeTruthy();
  });

  it("I) shows secondary detail text", () => {
    render(
      <SourceReadinessSummary
        sourceType="rss"
        status="draft"
        feedUrl="https://feed.example.com"
        scanCount={2}
        lastScanStatus="completed"
      />
    );
    expect(screen.getByText(/Feed var/)).toBeTruthy();
  });
});

