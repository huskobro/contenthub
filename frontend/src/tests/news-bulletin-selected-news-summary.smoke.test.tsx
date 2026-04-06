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
import { NewsBulletinsTable } from "../components/news-bulletin/NewsBulletinsTable";

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

// ── Table integration ──────────────────────────────────────────────────────────
const mockBulletin = (overrides: object = {}) => ({
  id: "bul-1",
  title: "Test Bulletin",
  topic: "Ekonomi",
  brief: null,
  target_duration_seconds: null,
  language: "tr",
  tone: null,
  bulletin_style: null,
  source_mode: null,
  selected_news_ids_json: null,
  status: "draft",
  job_id: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  has_script: false,
  has_metadata: false,
  composition_direction: null,
  thumbnail_direction: null,
  template_id: null,
  style_blueprint_id: null,
  render_mode: null,
  subtitle_style: null,
  lower_third_style: null,
  trust_enforcement_level: null,
  ...overrides,
});

describe("NewsBulletinsTable selected news summary", () => {
  it("G) renders Haberler column header", () => {
    render(<NewsBulletinsTable bulletins={[mockBulletin()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Haberler")).toBeTruthy();
  });

  it("H) renders Haber yok for selected_news_count=0", () => {
    render(<NewsBulletinsTable bulletins={[mockBulletin({ selected_news_count: 0 })]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Haber yok")).toBeTruthy();
  });

  it("I) renders count for selected_news_count=4", () => {
    render(<NewsBulletinsTable bulletins={[mockBulletin({ selected_news_count: 4 })]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("haber")).toBeTruthy();
  });

  it("J) does not break when selected_news_count is undefined", () => {
    render(<NewsBulletinsTable bulletins={[mockBulletin()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Test Bulletin")).toBeTruthy();
  });
});
