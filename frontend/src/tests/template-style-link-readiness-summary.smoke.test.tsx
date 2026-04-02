/**
 * Phase 66: Template Style Link Readiness Summary Frontend smoke tests.
 *
 * Covers:
 *   A) computeTemplateStyleLinkReadiness: active + primary → Ana bağ
 *   B) computeTemplateStyleLinkReadiness: active + fallback → Yedek bağ
 *   C) computeTemplateStyleLinkReadiness: active + experimental → Deneysel
 *   D) computeTemplateStyleLinkReadiness: inactive → Pasif
 *   E) computeTemplateStyleLinkReadiness: missing template_id → Belirsiz
 *   F) TemplateStyleLinkReadinessBadge renders Ana bağ
 *   G) TemplateStyleLinkReadinessBadge renders Arşiv
 *   H) TemplateStyleLinkReadinessSummary shows correct badge
 *   I) TemplateStyleLinkReadinessSummary shows secondary detail text
 *   J) TemplateStyleLinksTable renders Bağ Durumu column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeTemplateStyleLinkReadiness } from "../components/template-style-links/TemplateStyleLinkReadinessSummary";
import { TemplateStyleLinkReadinessBadge } from "../components/template-style-links/TemplateStyleLinkReadinessBadge";
import { TemplateStyleLinkReadinessSummary } from "../components/template-style-links/TemplateStyleLinkReadinessSummary";
import { TemplateStyleLinksTable } from "../components/template-style-links/TemplateStyleLinksTable";

// ── computeTemplateStyleLinkReadiness ─────────────────────────────────────────
describe("computeTemplateStyleLinkReadiness", () => {
  it("A) active + primary → Ana bağ", () => {
    expect(computeTemplateStyleLinkReadiness("active", "primary", "t-1", "bp-1")).toBe("Ana bağ");
  });

  it("B) active + fallback → Yedek bağ", () => {
    expect(computeTemplateStyleLinkReadiness("active", "fallback", "t-1", "bp-1")).toBe("Yedek bağ");
  });

  it("C) active + experimental → Deneysel", () => {
    expect(computeTemplateStyleLinkReadiness("active", "experimental", "t-1", "bp-1")).toBe("Deneysel");
  });

  it("D) inactive → Pasif", () => {
    expect(computeTemplateStyleLinkReadiness("inactive", "primary", "t-1", "bp-1")).toBe("Pasif");
  });

  it("E) missing template_id → Belirsiz", () => {
    expect(computeTemplateStyleLinkReadiness("active", "primary", null, "bp-1")).toBe("Belirsiz");
  });
});

// ── TemplateStyleLinkReadinessBadge ───────────────────────────────────────────
describe("TemplateStyleLinkReadinessBadge", () => {
  it("F) renders Ana bağ", () => {
    render(<TemplateStyleLinkReadinessBadge level="Ana bağ" />);
    expect(screen.getByText("Ana bağ")).toBeTruthy();
  });

  it("G) renders Arşiv", () => {
    render(<TemplateStyleLinkReadinessBadge level="Arşiv" />);
    expect(screen.getByText("Arşiv")).toBeTruthy();
  });
});

// ── TemplateStyleLinkReadinessSummary ─────────────────────────────────────────
describe("TemplateStyleLinkReadinessSummary", () => {
  it("H) shows Ana bağ badge for active primary", () => {
    render(
      <TemplateStyleLinkReadinessSummary
        status="active"
        linkRole="primary"
        templateId="t-1"
        styleBlueprintId="bp-1"
      />
    );
    expect(screen.getByText("Ana bağ")).toBeTruthy();
  });

  it("I) shows secondary detail text with link_role", () => {
    render(
      <TemplateStyleLinkReadinessSummary
        status="active"
        linkRole="fallback"
        templateId="t-1"
        styleBlueprintId="bp-1"
      />
    );
    expect(screen.getByText(/fallback/)).toBeTruthy();
  });
});

// ── TemplateStyleLinksTable ───────────────────────────────────────────────────
const mockLink = (overrides: object = {}) => ({
  id: "tsl-1",
  template_id: "tmpl-abc-123",
  style_blueprint_id: "bp-xyz-456",
  link_role: "primary",
  status: "active",
  notes: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  ...overrides,
});

describe("TemplateStyleLinksTable readiness summary", () => {
  it("J) renders Bağ Durumu column header", () => {
    render(<TemplateStyleLinksTable links={[mockLink()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Bağ Durumu")).toBeTruthy();
  });
});
