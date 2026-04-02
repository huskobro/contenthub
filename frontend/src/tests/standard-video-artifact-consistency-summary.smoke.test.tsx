import { describe, it, expect } from "vitest";
import { computeStandardVideoArtifactConsistency } from "../components/standard-video/StandardVideoArtifactConsistencySummary";

describe("computeStandardVideoArtifactConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when both false", () => {
    expect(computeStandardVideoArtifactConsistency(false, false)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when both null", () => {
    expect(computeStandardVideoArtifactConsistency(null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when both undefined", () => {
    expect(computeStandardVideoArtifactConsistency(undefined, undefined)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when script true and metadata false", () => {
    expect(computeStandardVideoArtifactConsistency(true, false)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when script true and metadata null", () => {
    expect(computeStandardVideoArtifactConsistency(true, null)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when script false and metadata true", () => {
    expect(computeStandardVideoArtifactConsistency(false, true)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when script null and metadata true", () => {
    expect(computeStandardVideoArtifactConsistency(null, true)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when both true", () => {
    expect(computeStandardVideoArtifactConsistency(true, true)).toBe("Dengeli");
  });

  it("returns 'Artifacts yok' when script false and metadata undefined", () => {
    expect(computeStandardVideoArtifactConsistency(false, undefined)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when script true and metadata undefined", () => {
    expect(computeStandardVideoArtifactConsistency(true, undefined)).toBe("Tek taraflı");
  });
});
