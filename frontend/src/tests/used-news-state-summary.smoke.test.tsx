/**
 * Phase 62: Used News State Summary Frontend smoke tests.
 *
 * Covers:
 *   A) computeUsedNewsState: reserved → Rezerve
 *   B) computeUsedNewsState: scheduled → Planlandı
 *   C) computeUsedNewsState: draft → Taslakta
 *   D) computeUsedNewsState: published → Yayınlandı
 *   E) computeUsedNewsState: null → Belirsiz
 *   F) UsedNewsStateBadge renders Rezerve
 *   G) UsedNewsStateBadge renders Yayınlandı
 *   H) UsedNewsStateSummary shows correct badge
 *   I) UsedNewsStateSummary shows secondary detail text
 *   J) UsedNewsTable renders Durum column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeUsedNewsState } from "../components/used-news/UsedNewsStateSummary";
import { UsedNewsStateBadge } from "../components/used-news/UsedNewsStateBadge";
import { UsedNewsStateSummary } from "../components/used-news/UsedNewsStateSummary";
import { UsedNewsTable } from "../components/used-news/UsedNewsTable";

// ── computeUsedNewsState ───────────────────────────────────────────────────────
describe("computeUsedNewsState", () => {
  it("A) reserved → Rezerve", () => {
    expect(computeUsedNewsState("reserved", "news_bulletin")).toBe("Rezerve");
  });

  it("B) scheduled → Planlandı", () => {
    expect(computeUsedNewsState("scheduled", "news_bulletin")).toBe("Planlandı");
  });

  it("C) draft → Taslakta", () => {
    expect(computeUsedNewsState("draft", "news_bulletin")).toBe("Taslakta");
  });

  it("D) published → Yayınlandı", () => {
    expect(computeUsedNewsState("published", "news_bulletin")).toBe("Yayınlandı");
  });

  it("E) null → Belirsiz", () => {
    expect(computeUsedNewsState(null, null)).toBe("Belirsiz");
  });
});

// ── UsedNewsStateBadge ─────────────────────────────────────────────────────────
describe("UsedNewsStateBadge", () => {
  it("F) renders Rezerve", () => {
    render(<UsedNewsStateBadge level="Rezerve" />);
    expect(screen.getByText("Rezerve")).toBeTruthy();
  });

  it("G) renders Yayınlandı", () => {
    render(<UsedNewsStateBadge level="Yayınlandı" />);
    expect(screen.getByText("Yayınlandı")).toBeTruthy();
  });
});

// ── UsedNewsStateSummary ───────────────────────────────────────────────────────
describe("UsedNewsStateSummary", () => {
  it("H) shows Yayınlandı badge for published", () => {
    render(
      <UsedNewsStateSummary
        usageType="published"
        targetModule="news_bulletin"
        targetEntityId="abc-123"
      />
    );
    expect(screen.getByText("Yayınlandı")).toBeTruthy();
  });

  it("I) shows secondary detail text with targetModule", () => {
    render(
      <UsedNewsStateSummary
        usageType="draft"
        targetModule="news_bulletin"
        targetEntityId={null}
      />
    );
    expect(screen.getByText(/news_bulletin/)).toBeTruthy();
  });
});

// ── UsedNewsTable ──────────────────────────────────────────────────────────────
const mockRecord = (overrides: object = {}) => ({
  id: "un-1",
  news_item_id: "ni-abc",
  usage_type: "published",
  usage_context: null,
  target_module: "news_bulletin",
  target_entity_id: null,
  notes: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  has_news_item_source: false,
  has_news_item_scan_reference: false,
  has_target_resolved: false,
  ...overrides,
});

describe("UsedNewsTable state summary", () => {
  it("J) renders Durum column header", () => {
    render(<UsedNewsTable records={[mockRecord()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Durum")).toBeTruthy();
  });
});
