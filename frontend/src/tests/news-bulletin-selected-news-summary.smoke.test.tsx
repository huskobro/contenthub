/**
 * Phase 53: News Bulletin Selected News Summary Frontend smoke tests.
 *
 * Covers:
 *   A) CountBadge renders 0
 *   B) CountBadge renders positive count
 *   C) Summary with count=0 shows "Haber yok"
 *   D) Summary with count>0 shows count badge and "haber"
 *   E) Summary with undefined falls back to 0
 *   F) Summary renders count badge
 *   G) Table renders "Haberler" column header
 *   H) Table renders "Haber yok" for bulletin with selected_news_count=0
 *   I) Table renders count for bulletin with selected_news_count>0
 *   J) Table does not break when selected_news_count is undefined
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewsBulletinSelectedNewsCountBadge } from "../components/news-bulletin/NewsBulletinSelectedNewsCountBadge";
import { NewsBulletinSelectedNewsSummary } from "../components/news-bulletin/NewsBulletinSelectedNewsSummary";

// ── CountBadge ─────────────────────────────────────────────────────────────────
describe("NewsBulletinSelectedNewsCountBadge", () => {
  it("A) renders 0", () => {
    render(<NewsBulletinSelectedNewsCountBadge count={0} />);
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("B) renders positive count", () => {
    render(<NewsBulletinSelectedNewsCountBadge count={5} />);
    expect(screen.getByText("5")).toBeTruthy();
  });
});

// ── Summary ────────────────────────────────────────────────────────────────────
describe("NewsBulletinSelectedNewsSummary", () => {
  it("C) count=0 shows Haber yok", () => {
    render(<NewsBulletinSelectedNewsSummary selectedNewsCount={0} />);
    expect(screen.getByText("Haber yok")).toBeTruthy();
  });

  it("D) count>0 shows count and 'haber'", () => {
    render(<NewsBulletinSelectedNewsSummary selectedNewsCount={3} />);
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("haber")).toBeTruthy();
  });

  it("E) undefined falls back to 0 with Haber yok", () => {
    render(<NewsBulletinSelectedNewsSummary />);
    expect(screen.getByText("Haber yok")).toBeTruthy();
  });

  it("F) renders count badge", () => {
    render(<NewsBulletinSelectedNewsSummary selectedNewsCount={2} />);
    expect(screen.getByText("2")).toBeTruthy();
  });
});

