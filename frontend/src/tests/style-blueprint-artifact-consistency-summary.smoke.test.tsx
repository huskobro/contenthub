import { describe, it, expect } from "vitest";
import { computeStyleBlueprintArtifactConsistency } from "../components/style-blueprints/StyleBlueprintArtifactConsistencySummary";

describe("computeStyleBlueprintArtifactConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when all null", () => {
    expect(computeStyleBlueprintArtifactConsistency(null, null, null, null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when all undefined", () => {
    expect(computeStyleBlueprintArtifactConsistency(undefined, undefined, undefined, undefined, undefined, undefined)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when visual rules present but no preview strategy", () => {
    expect(computeStyleBlueprintArtifactConsistency('{"color":"red"}', null, null, null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when motion rules present but no preview strategy", () => {
    expect(computeStyleBlueprintArtifactConsistency(null, '{"speed":1}', null, null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when multiple rules present but no preview strategy", () => {
    expect(computeStyleBlueprintArtifactConsistency('{"v":1}', '{"m":1}', null, null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when no rules but preview strategy present", () => {
    expect(computeStyleBlueprintArtifactConsistency(null, null, null, null, null, '{"mode":"card"}')).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when rules and preview strategy both present", () => {
    expect(computeStyleBlueprintArtifactConsistency('{"v":1}', null, null, null, null, '{"mode":"card"}')).toBe("Dengeli");
  });

  it("returns 'Dengeli' when all fields present", () => {
    expect(computeStyleBlueprintArtifactConsistency('{}', '{}', '{}', '{}', '{}', '{}')).toBe("Dengeli");
  });

  it("returns 'Artifacts yok' when all whitespace strings", () => {
    expect(computeStyleBlueprintArtifactConsistency("  ", "  ", null, null, null, "  ")).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when thumbnail rules present but no preview", () => {
    expect(computeStyleBlueprintArtifactConsistency(null, null, null, null, '{"style":"square"}', null)).toBe("Tek taraflı");
  });
});
