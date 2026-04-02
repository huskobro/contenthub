import { describe, it, expect } from "vitest";
import { computeStyleBlueprintTargetOutputConsistency } from "../components/style-blueprints/StyleBlueprintTargetOutputConsistencySummary";

describe("computeStyleBlueprintTargetOutputConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when all null", () => {
    expect(computeStyleBlueprintTargetOutputConsistency(null, null, null, null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when all empty strings", () => {
    expect(computeStyleBlueprintTargetOutputConsistency("  ", "", null, "  ", null, null)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when visual rules present but no preview strategy", () => {
    expect(computeStyleBlueprintTargetOutputConsistency('{"color":"red"}', null, null, null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when motion rules present but no preview strategy", () => {
    expect(computeStyleBlueprintTargetOutputConsistency(null, '{"speed":"fast"}', null, null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when layout rules present but no preview strategy", () => {
    expect(computeStyleBlueprintTargetOutputConsistency(null, null, '{"grid":"2col"}', null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when subtitle and thumbnail rules present but no preview strategy", () => {
    expect(computeStyleBlueprintTargetOutputConsistency(null, null, null, '{"font":"bold"}', '{"ratio":"16:9"}', null)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when only preview strategy present with no rule inputs", () => {
    expect(computeStyleBlueprintTargetOutputConsistency(null, null, null, null, null, '{"type":"mock"}')).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when all rule fields empty but preview strategy present", () => {
    expect(computeStyleBlueprintTargetOutputConsistency("", "  ", null, null, null, '{"type":"mock"}')).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when visual rules and preview strategy both present", () => {
    expect(computeStyleBlueprintTargetOutputConsistency('{"color":"blue"}', null, null, null, null, '{"type":"card"}')).toBe("Dengeli");
  });

  it("returns 'Dengeli' when all fields present", () => {
    expect(computeStyleBlueprintTargetOutputConsistency(
      '{"color":"blue"}',
      '{"speed":"slow"}',
      '{"grid":"3col"}',
      '{"font":"light"}',
      '{"ratio":"9:16"}',
      '{"type":"full"}',
    )).toBe("Dengeli");
  });
});
