/**
 * Phase 69: News Bulletin Enforcement Summary Frontend smoke tests.
 *
 * Covers:
 *   A) computeNewsBulletinEnforcement: no selected news → Temiz
 *   B) computeNewsBulletinEnforcement: selected, no warnings → Temiz
 *   C) computeNewsBulletinEnforcement: has_warning = true → Uyarı var
 *   D) computeNewsBulletinEnforcement: warning_count > 0 → Uyarı var
 *   E) computeNewsBulletinEnforcement: null count → Bilinmiyor
 *   F) NewsBulletinEnforcementStatusBadge renders Temiz
 *   G) NewsBulletinEnforcementStatusBadge renders Uyarı var
 *   H) NewsBulletinEnforcementSummary shows correct badge
 *   I) NewsBulletinEnforcementSummary shows warning count in detail
 *   J) NewsBulletinsTable renders Enforcement column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeNewsBulletinEnforcement } from "../components/news-bulletin/NewsBulletinEnforcementSummary";
import { NewsBulletinEnforcementStatusBadge } from "../components/news-bulletin/NewsBulletinEnforcementStatusBadge";
import { NewsBulletinEnforcementSummary } from "../components/news-bulletin/NewsBulletinEnforcementSummary";
import { NewsBulletinsTable } from "../components/news-bulletin/NewsBulletinsTable";

// ── computeNewsBulletinEnforcement ────────────────────────────────────────────
describe("computeNewsBulletinEnforcement", () => {
  it("A) no selected news → Temiz", () => {
    expect(computeNewsBulletinEnforcement(0, false, 0)).toBe("Temiz");
  });

  it("B) selected, no warnings → Temiz", () => {
    expect(computeNewsBulletinEnforcement(3, false, 0)).toBe("Temiz");
  });

  it("C) has_warning = true → Uyarı var", () => {
    expect(computeNewsBulletinEnforcement(3, true, 1)).toBe("Uyarı var");
  });

  it("D) warning_count > 0 → Uyarı var", () => {
    expect(computeNewsBulletinEnforcement(5, false, 2)).toBe("Uyarı var");
  });

  it("E) null count → Bilinmiyor", () => {
    expect(computeNewsBulletinEnforcement(null, null, null)).toBe("Bilinmiyor");
  });
});

// ── NewsBulletinEnforcementStatusBadge ───────────────────────────────────────
describe("NewsBulletinEnforcementStatusBadge", () => {
  it("F) renders Temiz", () => {
    render(<NewsBulletinEnforcementStatusBadge status="Temiz" />);
    expect(screen.getByText("Temiz")).toBeTruthy();
  });

  it("G) renders Uyarı var", () => {
    render(<NewsBulletinEnforcementStatusBadge status="Uyarı var" />);
    expect(screen.getByText("Uyarı var")).toBeTruthy();
  });
});

// ── NewsBulletinEnforcementSummary ────────────────────────────────────────────
describe("NewsBulletinEnforcementSummary", () => {
  it("H) shows Uyarı var badge when warnings present", () => {
    render(
      <NewsBulletinEnforcementSummary
        selectedNewsCount={3}
        hasSelectedNewsWarning={true}
        selectedNewsWarningCount={2}
      />
    );
    expect(screen.getByText("Uyarı var")).toBeTruthy();
  });

  it("I) shows warning count in detail", () => {
    render(
      <NewsBulletinEnforcementSummary
        selectedNewsCount={3}
        hasSelectedNewsWarning={true}
        selectedNewsWarningCount={2}
      />
    );
    expect(screen.getByText(/2 uyarı/)).toBeTruthy();
  });
});

// ── NewsBulletinsTable ─────────────────────────────────────────────────────────
const mockBulletin = (overrides: object = {}) => ({
  id: "nb-1",
  title: "Test Bülten",
  topic: "Test konu",
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
  selected_news_count: 0,
  has_selected_news_warning: false,
  selected_news_warning_count: 0,
  composition_direction: null,
  thumbnail_direction: null,
  template_id: null,
  style_blueprint_id: null,
  ...overrides,
});

describe("NewsBulletinsTable enforcement summary", () => {
  it("J) renders Enforcement column header", () => {
    render(<NewsBulletinsTable bulletins={[mockBulletin()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Uygunluk")).toBeTruthy();
  });
});
