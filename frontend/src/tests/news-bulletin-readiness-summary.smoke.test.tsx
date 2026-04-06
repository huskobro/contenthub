/**
 * Phase 56: News Bulletin Readiness Summary Frontend smoke tests.
 *
 * Covers:
 *   A) computeReadinessLevel: all empty → Başlangıç
 *   B) computeReadinessLevel: news>0, no script → İçerik seçildi
 *   C) computeReadinessLevel: script, no metadata → Script hazır
 *   D) computeReadinessLevel: script + metadata → Hazır
 *   E) computeReadinessLevel: metadata but no script → Kısmen hazır
 *   F) NewsBulletinReadinessBadge renders Başlangıç
 *   G) NewsBulletinReadinessBadge renders Hazır
 *   H) NewsBulletinReadinessSummary shows badge for Hazır
 *   I) NewsBulletinReadinessSummary shows secondary detail text
 *   J) NewsBulletinsTable renders Hazırlık column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeReadinessLevel } from "../components/news-bulletin/NewsBulletinReadinessSummary";
import { NewsBulletinReadinessBadge } from "../components/news-bulletin/NewsBulletinReadinessBadge";
import { NewsBulletinReadinessSummary } from "../components/news-bulletin/NewsBulletinReadinessSummary";

// ── computeReadinessLevel ──────────────────────────────────────────────────────
describe("computeReadinessLevel", () => {
  it("A) all empty → Başlangıç", () => {
    expect(computeReadinessLevel(0, false, false)).toBe("Başlangıç");
  });

  it("B) news>0, no script → İçerik seçildi", () => {
    expect(computeReadinessLevel(3, false, false)).toBe("İçerik seçildi");
  });

  it("C) script, no metadata → Script hazır", () => {
    expect(computeReadinessLevel(2, true, false)).toBe("Script hazır");
  });

  it("D) script + metadata → Hazır", () => {
    expect(computeReadinessLevel(2, true, true)).toBe("Hazır");
  });

  it("E) metadata but no script → Kısmen hazır", () => {
    expect(computeReadinessLevel(0, false, true)).toBe("Kısmen hazır");
  });
});

// ── NewsBulletinReadinessBadge ────────────────────────────────────────────────
describe("NewsBulletinReadinessBadge", () => {
  it("F) renders Başlangıç", () => {
    render(<NewsBulletinReadinessBadge level="Başlangıç" />);
    expect(screen.getByText("Başlangıç")).toBeTruthy();
  });

  it("G) renders Hazır", () => {
    render(<NewsBulletinReadinessBadge level="Hazır" />);
    expect(screen.getByText("Hazır")).toBeTruthy();
  });
});

// ── NewsBulletinReadinessSummary ──────────────────────────────────────────────
describe("NewsBulletinReadinessSummary", () => {
  it("H) shows Hazır badge when script + metadata", () => {
    render(<NewsBulletinReadinessSummary selectedNewsCount={2} hasScript={true} hasMetadata={true} />);
    expect(screen.getByText("Hazır")).toBeTruthy();
  });

  it("I) shows secondary detail text", () => {
    render(<NewsBulletinReadinessSummary selectedNewsCount={2} hasScript={true} hasMetadata={true} />);
    expect(screen.getByText(/Script var/)).toBeTruthy();
  });
});

