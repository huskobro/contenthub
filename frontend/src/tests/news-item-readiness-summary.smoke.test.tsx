/**
 * Phase 61: News Item Readiness Summary Frontend smoke tests.
 *
 * Covers:
 *   A) computeNewsItemReadiness: no title → Başlangıç
 *   B) computeNewsItemReadiness: status=new + fields → Ham kayıt
 *   C) computeNewsItemReadiness: status=reviewed → Gözden geçirildi
 *   D) computeNewsItemReadiness: status=used → Kullanıldı
 *   E) computeNewsItemReadiness: status=ignored → Hariç
 *   F) NewsItemReadinessBadge renders Ham kayıt
 *   G) NewsItemReadinessBadge renders Kullanıldı
 *   H) NewsItemReadinessSummary shows correct badge
 *   I) NewsItemReadinessSummary shows secondary detail text
 *   J) NewsItemsTable renders Hazırlık column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeNewsItemReadiness } from "../components/news-items/NewsItemReadinessSummary";
import { NewsItemReadinessBadge } from "../components/news-items/NewsItemReadinessBadge";
import { NewsItemReadinessSummary } from "../components/news-items/NewsItemReadinessSummary";
import { NewsItemsTable } from "../components/news-items/NewsItemsTable";

// ── computeNewsItemReadiness ───────────────────────────────────────────────────
describe("computeNewsItemReadiness", () => {
  it("A) no title → Başlangıç", () => {
    expect(computeNewsItemReadiness(null, "https://example.com", "new")).toBe("Başlangıç");
  });

  it("B) status=new + fields → Ham kayıt", () => {
    expect(computeNewsItemReadiness("BTC haberi", "https://example.com", "new")).toBe("Ham kayıt");
  });

  it("C) status=reviewed → Gözden geçirildi", () => {
    expect(computeNewsItemReadiness("BTC haberi", "https://example.com", "reviewed")).toBe("Gözden geçirildi");
  });

  it("D) status=used → Kullanıldı", () => {
    expect(computeNewsItemReadiness("BTC haberi", "https://example.com", "used")).toBe("Kullanıldı");
  });

  it("E) status=ignored → Hariç", () => {
    expect(computeNewsItemReadiness("BTC haberi", "https://example.com", "ignored")).toBe("Hariç");
  });
});

// ── NewsItemReadinessBadge ─────────────────────────────────────────────────────
describe("NewsItemReadinessBadge", () => {
  it("F) renders Ham kayıt", () => {
    render(<NewsItemReadinessBadge level="Ham kayıt" />);
    expect(screen.getByText("Ham kayıt")).toBeTruthy();
  });

  it("G) renders Kullanıldı", () => {
    render(<NewsItemReadinessBadge level="Kullanıldı" />);
    expect(screen.getByText("Kullanıldı")).toBeTruthy();
  });
});

// ── NewsItemReadinessSummary ───────────────────────────────────────────────────
describe("NewsItemReadinessSummary", () => {
  it("H) shows Kullanıldı badge for used status", () => {
    render(
      <NewsItemReadinessSummary
        title="BTC haberi"
        url="https://example.com"
        status="used"
        usageCount={2}
      />
    );
    expect(screen.getByText("Kullanıldı")).toBeTruthy();
  });

  it("I) shows secondary detail text", () => {
    render(
      <NewsItemReadinessSummary
        title="BTC haberi"
        url="https://example.com"
        status="new"
        sourceId="src-123"
        usageCount={0}
      />
    );
    expect(screen.getByText(/Kaynak var/)).toBeTruthy();
  });
});

// ── NewsItemsTable ─────────────────────────────────────────────────────────────
const mockItem = (overrides: object = {}) => ({
  id: "ni-1",
  title: "Test Haber",
  url: "https://example.com/news",
  status: "new",
  source_id: null,
  source_scan_id: null,
  summary: null,
  published_at: null,
  language: null,
  category: null,
  dedupe_key: null,
  raw_payload_json: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  usage_count: 0,
  last_usage_type: null,
  last_target_module: null,
  ...overrides,
});

describe("NewsItemsTable readiness", () => {
  it("J) renders Hazırlık column header", () => {
    render(<NewsItemsTable items={[mockItem()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Hazırlık")).toBeTruthy();
  });
});
