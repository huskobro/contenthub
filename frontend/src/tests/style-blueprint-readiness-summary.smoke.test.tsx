/**
 * Phase 65: Style Blueprint Readiness Summary Frontend smoke tests.
 *
 * Covers:
 *   A) computeStyleBlueprintReadiness: all null → Başlangıç
 *   B) computeStyleBlueprintReadiness: 1 field filled → Taslak
 *   C) computeStyleBlueprintReadiness: 2 fields filled, not active → Kısmen hazır
 *   D) computeStyleBlueprintReadiness: 3+ fields filled, active → Hazır
 *   E) computeStyleBlueprintReadiness: active but all empty → Kısmen hazır
 *   F) StyleBlueprintReadinessBadge renders Başlangıç
 *   G) StyleBlueprintReadinessBadge renders Hazır
 *   H) StyleBlueprintReadinessSummary shows correct badge
 *   I) StyleBlueprintReadinessSummary shows filled count detail
 *   J) StyleBlueprintsTable renders Hazırlık column header
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeStyleBlueprintReadiness } from "../components/style-blueprints/StyleBlueprintReadinessSummary";
import { StyleBlueprintReadinessBadge } from "../components/style-blueprints/StyleBlueprintReadinessBadge";
import { StyleBlueprintReadinessSummary } from "../components/style-blueprints/StyleBlueprintReadinessSummary";
import { StyleBlueprintsTable } from "../components/style-blueprints/StyleBlueprintsTable";

// ── computeStyleBlueprintReadiness ────────────────────────────────────────────
describe("computeStyleBlueprintReadiness", () => {
  it("A) all null → Başlangıç", () => {
    expect(computeStyleBlueprintReadiness("draft", null, null, null, null, null, null)).toBe("Başlangıç");
  });

  it("B) 1 field filled → Taslak", () => {
    expect(computeStyleBlueprintReadiness("draft", '{"color":"red"}', null, null, null, null, null)).toBe("Taslak");
  });

  it("C) 2 fields filled, not active → Kısmen hazır", () => {
    expect(computeStyleBlueprintReadiness("draft", '{"a":1}', '{"b":2}', null, null, null, null)).toBe("Kısmen hazır");
  });

  it("D) 3+ fields filled, active → Hazır", () => {
    expect(computeStyleBlueprintReadiness("active", '{"a":1}', '{"b":2}', '{"c":3}', null, null, null)).toBe("Hazır");
  });

  it("E) active but all empty → Başlangıç", () => {
    expect(computeStyleBlueprintReadiness("active", null, null, null, null, null, null)).toBe("Başlangıç");
  });
});

// ── StyleBlueprintReadinessBadge ──────────────────────────────────────────────
describe("StyleBlueprintReadinessBadge", () => {
  it("F) renders Başlangıç", () => {
    render(<StyleBlueprintReadinessBadge level="Başlangıç" />);
    expect(screen.getByText("Başlangıç")).toBeTruthy();
  });

  it("G) renders Hazır", () => {
    render(<StyleBlueprintReadinessBadge level="Hazır" />);
    expect(screen.getByText("Hazır")).toBeTruthy();
  });
});

// ── StyleBlueprintReadinessSummary ────────────────────────────────────────────
describe("StyleBlueprintReadinessSummary", () => {
  it("H) shows Hazır badge for active with 3+ fields", () => {
    render(
      <StyleBlueprintReadinessSummary
        status="active"
        visualRulesJson='{"a":1}'
        motionRulesJson='{"b":2}'
        layoutRulesJson='{"c":3}'
        subtitleRulesJson={null}
        thumbnailRulesJson={null}
        previewStrategyJson={null}
      />
    );
    expect(screen.getByText("Hazır")).toBeTruthy();
  });

  it("I) shows filled count detail", () => {
    render(
      <StyleBlueprintReadinessSummary
        status="draft"
        visualRulesJson='{"a":1}'
        motionRulesJson='{"b":2}'
        layoutRulesJson={null}
        subtitleRulesJson={null}
        thumbnailRulesJson={null}
        previewStrategyJson={null}
      />
    );
    expect(screen.getByText(/2\/6 alan dolu/)).toBeTruthy();
  });
});

// ── StyleBlueprintsTable ──────────────────────────────────────────────────────
const mockBlueprint = (overrides: object = {}) => ({
  id: "bp-1",
  name: "Test Blueprint",
  module_scope: "news_bulletin",
  status: "draft",
  version: 1,
  visual_rules_json: null,
  motion_rules_json: null,
  layout_rules_json: null,
  subtitle_rules_json: null,
  thumbnail_rules_json: null,
  preview_strategy_json: null,
  notes: null,
  created_at: "2026-04-02T10:00:00Z",
  updated_at: "2026-04-02T10:00:00Z",
  ...overrides,
});

describe("StyleBlueprintsTable readiness summary", () => {
  it("J) renders Hazırlık column header", () => {
    render(<StyleBlueprintsTable blueprints={[mockBlueprint()]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText("Hazırlık")).toBeTruthy();
  });
});
