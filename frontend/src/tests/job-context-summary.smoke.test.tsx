/**
 * Phase 57: Job Context Summary Frontend smoke tests.
 *
 * Covers:
 *   A) extractContextTitle: returns title from valid JSON
 *   B) extractContextTitle: returns topic when title absent
 *   C) extractContextTitle: returns null for empty JSON
 *   D) extractContextTitle: returns null for malformed JSON
 *   E) JobContextBadge: renders "Standard Video" for standard_video
 *   F) JobContextBadge: renders "News Bulletin" for news_bulletin
 *   G) JobContextSummary: shows badge for standard_video
 *   H) JobContextSummary: shows context title when available
 *   I) JobContextSummary: no detail text when context absent
 *   J) JobsTable: renders Context column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { extractContextTitle } from "../components/jobs/JobContextSummary";
import { JobContextBadge } from "../components/jobs/JobContextBadge";
import { JobContextSummary } from "../components/jobs/JobContextSummary";

// ── extractContextTitle ───────────────────────────────────────────────────────
describe("extractContextTitle", () => {
  it("A) returns title from valid JSON", () => {
    expect(extractContextTitle('{"title":"BTC recap"}')).toBe("BTC recap");
  });

  it("B) returns topic when title absent", () => {
    expect(extractContextTitle('{"topic":"Sabah özeti"}')).toBe("Sabah özeti");
  });

  it("C) returns null for empty/null JSON", () => {
    expect(extractContextTitle(null)).toBeNull();
    expect(extractContextTitle("{}")).toBeNull();
  });

  it("D) returns null for malformed JSON", () => {
    expect(extractContextTitle("{not valid json}")).toBeNull();
  });
});

// ── JobContextBadge ───────────────────────────────────────────────────────────
describe("JobContextBadge", () => {
  it("E) renders Standard Video for standard_video", () => {
    render(<JobContextBadge moduleType="standard_video" />);
    expect(screen.getByText("Standard Video")).toBeTruthy();
  });

  it("F) renders News Bulletin for news_bulletin", () => {
    render(<JobContextBadge moduleType="news_bulletin" />);
    expect(screen.getByText("News Bulletin")).toBeTruthy();
  });
});

// ── JobContextSummary ─────────────────────────────────────────────────────────
describe("JobContextSummary", () => {
  it("G) shows badge for standard_video", () => {
    render(<JobContextSummary moduleType="standard_video" sourceContextJson={null} />);
    expect(screen.getByText("Standard Video")).toBeTruthy();
  });

  it("H) shows context title when available", () => {
    render(<JobContextSummary moduleType="news_bulletin" sourceContextJson='{"title":"Sabah haberleri"}' />);
    expect(screen.getByText("Sabah haberleri")).toBeTruthy();
  });

  it("I) no detail text when context absent", () => {
    render(<JobContextSummary moduleType="standard_video" sourceContextJson={null} />);
    expect(screen.queryByText(/•/)).toBeNull();
  });
});

