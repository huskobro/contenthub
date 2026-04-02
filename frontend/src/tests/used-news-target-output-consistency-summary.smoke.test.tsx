import { describe, it, expect } from "vitest";
import { computeUsedNewsTargetOutputConsistency } from "../components/used-news/UsedNewsTargetOutputConsistencySummary";

describe("computeUsedNewsTargetOutputConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when all null", () => {
    expect(computeUsedNewsTargetOutputConsistency(null, null, null, null, null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when all empty and target not resolved", () => {
    expect(computeUsedNewsTargetOutputConsistency("  ", "  ", null, null, false, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when news_item_id present but no target", () => {
    expect(computeUsedNewsTargetOutputConsistency("news-123", null, null, null, false, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when usage_type present but no target", () => {
    expect(computeUsedNewsTargetOutputConsistency(null, "bulletin", null, null, null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when usage_context present but no target", () => {
    expect(computeUsedNewsTargetOutputConsistency(null, null, "primary source", null, false, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when notes present but no target", () => {
    expect(computeUsedNewsTargetOutputConsistency(null, null, null, "verified", false, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when no input but has_target_resolved is true", () => {
    expect(computeUsedNewsTargetOutputConsistency(null, null, null, null, true, null, null)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when no input but target_module and target_entity_id present", () => {
    expect(computeUsedNewsTargetOutputConsistency(null, null, null, null, false, "bulletin", "entity-456")).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when news_item_id present and has_target_resolved is true", () => {
    expect(computeUsedNewsTargetOutputConsistency("news-123", "bulletin", null, null, true, null, null)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when all input fields and target_module + target_entity_id present", () => {
    expect(computeUsedNewsTargetOutputConsistency("news-123", "bulletin", "main story", "verified", false, "bulletin", "entity-456")).toBe("Dengeli");
  });
});
