/**
 * Phase 55: News Item Usage Summary Frontend smoke tests.
 *
 * Covers:
 *   A) UsageBadge shows "Kullanılmamış" when count=0
 *   B) UsageBadge shows "Nx kullanıldı" for count>0
 *   C) UsageSummary shows "Kullanılmamış" when count=0
 *   D) UsageSummary shows count badge for count>0
 *   E) UsageSummary shows last_usage_type when count>0
 *   F) UsageSummary shows last_target_module when count>0
 *   G) UsageSummary does not show details when count=0
 *   H) NewsItemsTable renders "Kullanım" column header
 *   I) NewsItemsTable shows "Kullanılmamış" for item with usage_count=0
 *   J) NewsItemsTable shows usage badge for item with usage_count>0
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewsItemUsageBadge } from "../components/news-items/NewsItemUsageBadge";
import { NewsItemUsageSummary } from "../components/news-items/NewsItemUsageSummary";
import { NewsItemsTable } from "../components/news-items/NewsItemsTable";

// ── NewsItemUsageBadge ─────────────────────────────────────────────────────────
describe("NewsItemUsageBadge", () => {
  it("A) shows Kullanılmamış when count=0", () => {
    render(<NewsItemUsageBadge usageCount={0} />);
    expect(screen.getByText("Kullanılmamış")).toBeTruthy();
  });

  it("B) shows Nx kullanıldı for count>0", () => {
    render(<NewsItemUsageBadge usageCount={3} />);
    expect(screen.getByText("3x kullanıldı")).toBeTruthy();
  });
});

// ── NewsItemUsageSummary ───────────────────────────────────────────────────────
describe("NewsItemUsageSummary", () => {
  it("C) shows Kullanılmamış when count=0", () => {
    render(<NewsItemUsageSummary usageCount={0} />);
    expect(screen.getByText("Kullanılmamış")).toBeTruthy();
  });

  it("D) shows count badge for count>0", () => {
    render(<NewsItemUsageSummary usageCount={2} />);
    expect(screen.getByText("2x kullanıldı")).toBeTruthy();
  });

  it("E) shows last_usage_type when count>0", () => {
    render(<NewsItemUsageSummary usageCount={1} lastUsageType="bulletin" lastTargetModule="news_bulletin" />);
    expect(screen.getByText(/bulletin/)).toBeTruthy();
  });

  it("F) shows last_target_module when count>0", () => {
    render(<NewsItemUsageSummary usageCount={1} lastUsageType="bulletin" lastTargetModule="news_bulletin" />);
    expect(screen.getByText(/news_bulletin/)).toBeTruthy();
  });

  it("G) does not show detail text when count=0", () => {
    render(<NewsItemUsageSummary usageCount={0} lastUsageType="bulletin" lastTargetModule="news_bulletin" />);
    expect(screen.queryByText(/bulletin/)).toBeNull();
  });
});

// ── NewsItemsTable ────────────────────────────────────────────────────────────
const mockItem = (overrides: object = {}) => ({
  id: "item-1",
  title: "Test Haberi",
  url: "https://example.com/news/1",
  status: "new",
  source_id: null,
  source_scan_id: null,
  summary: null,
  published_at: null,
  language: "tr",
  category: null,
  dedupe_key: null,
  raw_payload_json: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  ...overrides,
});

describe("NewsItemsTable usage summary", () => {
  it("H) renders Kullanım column header", () => {
    render(<NewsItemsTable items={[mockItem()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Kullanım")).toBeTruthy();
  });

  it("I) shows Kullanılmamış for usage_count=0", () => {
    render(<NewsItemsTable items={[mockItem({ usage_count: 0 })]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Kullanılmamış")).toBeTruthy();
  });

  it("J) shows usage badge for usage_count=2", () => {
    render(<NewsItemsTable items={[mockItem({ usage_count: 2, last_usage_type: "bulletin" })]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("2x kullanıldı")).toBeTruthy();
  });
});
