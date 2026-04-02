import { describe, it, expect } from "vitest";
import { computeSourceScanTargetOutputConsistency } from "../components/source-scans/SourceScanTargetOutputConsistencySummary";

describe("computeSourceScanTargetOutputConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when source_id null and no output", () => {
    expect(computeSourceScanTargetOutputConsistency(null, 0, 0, 0)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when source_id whitespace and no output", () => {
    expect(computeSourceScanTargetOutputConsistency("  ", null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when source_id present but no output counts", () => {
    expect(computeSourceScanTargetOutputConsistency("src-1", 0, 0, 0)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when source_id present but all counts null", () => {
    expect(computeSourceScanTargetOutputConsistency("src-1", null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when source_id null but result_count > 0", () => {
    expect(computeSourceScanTargetOutputConsistency(null, 5, 0, 0)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when source_id null but linked_news_count > 0", () => {
    expect(computeSourceScanTargetOutputConsistency(null, 0, 3, 0)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when source_id present and result_count > 0", () => {
    expect(computeSourceScanTargetOutputConsistency("src-1", 10, 0, 0)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when source_id present and linked_news_count > 0", () => {
    expect(computeSourceScanTargetOutputConsistency("src-1", 0, 4, 0)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when source_id present and used_news_count > 0", () => {
    expect(computeSourceScanTargetOutputConsistency("src-1", 0, 0, 2)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when all fields present with positive counts", () => {
    expect(computeSourceScanTargetOutputConsistency("src-1", 10, 4, 2)).toBe("Dengeli");
  });
});
