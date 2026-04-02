import { describe, it, expect } from "vitest";
import { computeNewsItemArtifactConsistency } from "../components/news-items/NewsItemArtifactConsistencySummary";

describe("computeNewsItemArtifactConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when sourceId null and no publication", () => {
    expect(computeNewsItemArtifactConsistency(null, null, 0, false)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when all undefined/null", () => {
    expect(computeNewsItemArtifactConsistency(undefined, undefined, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when sourceId whitespace and usage 0", () => {
    expect(computeNewsItemArtifactConsistency("   ", "  ", 0, false)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when sourceId present but no publication", () => {
    expect(computeNewsItemArtifactConsistency("src-1", null, 0, false)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when sourceScanId present but no publication", () => {
    expect(computeNewsItemArtifactConsistency(null, "scan-1", null, false)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when no source but usageCount > 0", () => {
    expect(computeNewsItemArtifactConsistency(null, null, 3, false)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when no source but hasPublishedUsedNewsLink true", () => {
    expect(computeNewsItemArtifactConsistency(null, null, 0, true)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when sourceId present and usageCount > 0", () => {
    expect(computeNewsItemArtifactConsistency("src-1", null, 2, false)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when sourceId and hasPublishedUsedNewsLink true", () => {
    expect(computeNewsItemArtifactConsistency("src-1", null, 0, true)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when sourceScanId and usageCount and published link all present", () => {
    expect(computeNewsItemArtifactConsistency(null, "scan-5", 10, true)).toBe("Dengeli");
  });
});
