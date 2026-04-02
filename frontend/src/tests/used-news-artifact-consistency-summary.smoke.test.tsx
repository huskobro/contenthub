import { describe, it, expect } from "vitest";
import { computeUsedNewsArtifactConsistency } from "../components/used-news/UsedNewsArtifactConsistencySummary";

describe("computeUsedNewsArtifactConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when all null/false", () => {
    expect(computeUsedNewsArtifactConsistency(false, false, false, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when all undefined", () => {
    expect(computeUsedNewsArtifactConsistency(undefined, undefined, undefined, undefined, undefined)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when source false and target module whitespace", () => {
    expect(computeUsedNewsArtifactConsistency(false, false, false, "  ", "  ")).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when hasNewsItemSource true but no target", () => {
    expect(computeUsedNewsArtifactConsistency(true, false, false, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when hasNewsItemScanReference true but no target", () => {
    expect(computeUsedNewsArtifactConsistency(false, true, false, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when no source but hasTargetResolved true", () => {
    expect(computeUsedNewsArtifactConsistency(false, false, true, null, null)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when no source but targetModule and targetEntityId present", () => {
    expect(computeUsedNewsArtifactConsistency(false, false, false, "news_bulletin", "entity-1")).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when source and hasTargetResolved both true", () => {
    expect(computeUsedNewsArtifactConsistency(true, false, true, null, null)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when source and target module+entity present", () => {
    expect(computeUsedNewsArtifactConsistency(true, false, false, "standard_video", "vid-1")).toBe("Dengeli");
  });

  it("returns 'Dengeli' when all source and target fields present", () => {
    expect(computeUsedNewsArtifactConsistency(true, true, true, "news_bulletin", "nb-5")).toBe("Dengeli");
  });
});
