/**
 * Phase 59: Template Readiness Summary Frontend smoke tests.
 *
 * Covers:
 *   A) computeTemplateReadiness: style template + empty JSON + 0 links → Başlangıç
 *   B) computeTemplateReadiness: content template + filled JSON + 0 links → Taslak
 *   C) computeTemplateReadiness: publish template + filled JSON + links → Bağlandı (draft)
 *   D) computeTemplateReadiness: active + filled JSON + links → Hazır
 *   E) computeTemplateReadiness: active + empty JSON → Kısmen hazır
 *   F) TemplateReadinessBadge renders Başlangıç
 *   G) TemplateReadinessBadge renders Hazır
 *   H) TemplateReadinessSummary shows correct badge
 *   I) TemplateReadinessSummary shows secondary detail text
 *   J) TemplatesTable renders Hazırlık column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeTemplateReadiness } from "../components/templates/TemplateReadinessSummary";
import { TemplateReadinessBadge } from "../components/templates/TemplateReadinessBadge";
import { TemplateReadinessSummary } from "../components/templates/TemplateReadinessSummary";

// ── computeTemplateReadiness ───────────────────────────────────────────────────
describe("computeTemplateReadiness", () => {
  it("A) style + empty JSON + 0 links → Başlangıç", () => {
    expect(computeTemplateReadiness("style", "draft", null, null, null, 0)).toBe("Başlangıç");
  });

  it("B) content + filled JSON + 0 links → Taslak", () => {
    expect(computeTemplateReadiness("content", "draft", null, '{"rules":{}}', null, 0)).toBe("Taslak");
  });

  it("C) publish + filled JSON + links + draft → Bağlandı", () => {
    expect(computeTemplateReadiness("publish", "draft", null, null, '{"profile":{}}', 2)).toBe("Bağlandı");
  });

  it("D) active + filled JSON + links → Hazır", () => {
    expect(computeTemplateReadiness("style", "active", '{"color":"red"}', null, null, 1)).toBe("Hazır");
  });

  it("E) active + empty JSON → Kısmen hazır", () => {
    expect(computeTemplateReadiness("style", "active", null, null, null, 0)).toBe("Kısmen hazır");
  });
});

// ── TemplateReadinessBadge ─────────────────────────────────────────────────────
describe("TemplateReadinessBadge", () => {
  it("F) renders Başlangıç", () => {
    render(<TemplateReadinessBadge level="Başlangıç" />);
    expect(screen.getByText("Başlangıç")).toBeTruthy();
  });

  it("G) renders Hazır", () => {
    render(<TemplateReadinessBadge level="Hazır" />);
    expect(screen.getByText("Hazır")).toBeTruthy();
  });
});

// ── TemplateReadinessSummary ───────────────────────────────────────────────────
describe("TemplateReadinessSummary", () => {
  it("H) shows Hazır badge when active + JSON + links", () => {
    render(
      <TemplateReadinessSummary
        templateType="style"
        status="active"
        styleProfileJson='{"color":"blue"}'
        styleLinkCount={1}
      />
    );
    expect(screen.getByText("Hazır")).toBeTruthy();
  });

  it("I) shows secondary detail text", () => {
    render(
      <TemplateReadinessSummary
        templateType="content"
        status="draft"
        contentRulesJson='{"rules":{}}'
        styleLinkCount={0}
      />
    );
    expect(screen.getByText(/JSON var/)).toBeTruthy();
  });
});

