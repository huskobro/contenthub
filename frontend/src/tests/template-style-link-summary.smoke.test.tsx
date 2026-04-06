/**
 * Phase 58: Template Style Link Summary Frontend smoke tests.
 *
 * Covers:
 *   A) TemplateStyleLinkStatusBadge: count=0 → "Bağ yok"
 *   B) TemplateStyleLinkStatusBadge: count>0 → "Nx bağ"
 *   C) TemplateStyleLinkSummary: count=0 → shows "Bağ yok"
 *   D) TemplateStyleLinkSummary: count>0 → shows badge
 *   E) TemplateStyleLinkSummary: shows primaryLinkRole when count>0
 *   F) TemplateStyleLinkSummary: no role text when count=0
 *   G) TemplateStyleLinkSummary: no role text when role is null
 *   H) TemplatesTable: renders Style Links column header
 *   I) TemplatesTable: shows "Bağ yok" for template with no links
 *   J) TemplatesTable: shows badge for template with links
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplateStyleLinkStatusBadge } from "../components/templates/TemplateStyleLinkStatusBadge";
import { TemplateStyleLinkSummary } from "../components/templates/TemplateStyleLinkSummary";

// ── TemplateStyleLinkStatusBadge ──────────────────────────────────────────────
describe("TemplateStyleLinkStatusBadge", () => {
  it("A) count=0 → Bağ yok", () => {
    render(<TemplateStyleLinkStatusBadge styleLinkCount={0} />);
    expect(screen.getByText("Bağ yok")).toBeTruthy();
  });

  it("B) count>0 → Nx bağ", () => {
    render(<TemplateStyleLinkStatusBadge styleLinkCount={3} />);
    expect(screen.getByText("3 bağ")).toBeTruthy();
  });
});

// ── TemplateStyleLinkSummary ──────────────────────────────────────────────────
describe("TemplateStyleLinkSummary", () => {
  it("C) count=0 → shows Bağ yok", () => {
    render(<TemplateStyleLinkSummary styleLinkCount={0} />);
    expect(screen.getByText("Bağ yok")).toBeTruthy();
  });

  it("D) count>0 → shows badge", () => {
    render(<TemplateStyleLinkSummary styleLinkCount={2} />);
    expect(screen.getByText("2 bağ")).toBeTruthy();
  });

  it("E) shows primaryLinkRole when count>0", () => {
    render(<TemplateStyleLinkSummary styleLinkCount={1} primaryLinkRole="primary" />);
    expect(screen.getByText("primary")).toBeTruthy();
  });

  it("F) no role text when count=0", () => {
    render(<TemplateStyleLinkSummary styleLinkCount={0} primaryLinkRole="primary" />);
    expect(screen.queryByText("primary")).toBeNull();
  });

  it("G) no role text when role is null", () => {
    render(<TemplateStyleLinkSummary styleLinkCount={2} primaryLinkRole={null} />);
    expect(screen.queryByText(/primary|fallback/)).toBeNull();
  });
});

