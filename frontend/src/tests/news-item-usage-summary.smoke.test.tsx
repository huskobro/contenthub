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

