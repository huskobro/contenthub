import { describe, it, expect } from "vitest";
import { computeStandardVideoTargetOutputConsistency } from "../components/standard-video/StandardVideoTargetOutputConsistencySummary";

describe("computeStandardVideoTargetOutputConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when all null", () => {
    expect(computeStandardVideoTargetOutputConsistency(null, null, null, null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when topic empty and no artifacts", () => {
    expect(computeStandardVideoTargetOutputConsistency("  ", null, 0, null, false, false)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when topic present but no artifacts", () => {
    expect(computeStandardVideoTargetOutputConsistency("AI in education", null, null, null, false, false)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when brief present but no artifacts", () => {
    expect(computeStandardVideoTargetOutputConsistency(null, "Short explainer video", null, null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when target_duration_seconds > 0 but no artifacts", () => {
    expect(computeStandardVideoTargetOutputConsistency(null, null, 120, null, false, false)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when language present but no artifacts", () => {
    expect(computeStandardVideoTargetOutputConsistency(null, null, null, "tr", false, false)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when no input but has_script is true", () => {
    expect(computeStandardVideoTargetOutputConsistency(null, null, null, null, true, false)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when no input but has_metadata is true", () => {
    expect(computeStandardVideoTargetOutputConsistency("  ", null, 0, "  ", false, true)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when topic present and has_script is true", () => {
    expect(computeStandardVideoTargetOutputConsistency("Tech review", null, null, null, true, false)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when all input fields and both artifacts present", () => {
    expect(computeStandardVideoTargetOutputConsistency("Tech review", "Overview of new tech", 180, "en", true, true)).toBe("Dengeli");
  });
});
