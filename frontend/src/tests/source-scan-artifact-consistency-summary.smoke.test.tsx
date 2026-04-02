import { describe, it, expect } from "vitest";
import { computeSourceScanArtifactConsistency } from "../components/source-scans/SourceScanArtifactConsistencySummary";

describe("computeSourceScanArtifactConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when sourceId is null and no linked news", () => {
    expect(computeSourceScanArtifactConsistency(null, 0)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when sourceId is undefined and no linked news", () => {
    expect(computeSourceScanArtifactConsistency(undefined, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when sourceId is empty string and no linked news", () => {
    expect(computeSourceScanArtifactConsistency("", 0)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when sourceId present but no linked news", () => {
    expect(computeSourceScanArtifactConsistency("src-123", 0)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when sourceId present and linked news null", () => {
    expect(computeSourceScanArtifactConsistency("src-123", null)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when sourceId is null but has linked news", () => {
    expect(computeSourceScanArtifactConsistency(null, 3)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when sourceId is empty string but has linked news", () => {
    expect(computeSourceScanArtifactConsistency("", 5)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when sourceId present and has linked news", () => {
    expect(computeSourceScanArtifactConsistency("src-123", 1)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when sourceId present and many linked news", () => {
    expect(computeSourceScanArtifactConsistency("src-abc", 42)).toBe("Dengeli");
  });

  it("returns 'Artifacts yok' when sourceId is whitespace and no linked news", () => {
    expect(computeSourceScanArtifactConsistency("   ", 0)).toBe("Artifacts yok");
  });
});
