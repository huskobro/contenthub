import { describe, it, expect } from "vitest";
import { computeNewsBulletinArtifactConsistency } from "../components/news-bulletin/NewsBulletinArtifactConsistencySummary";

describe("computeNewsBulletinArtifactConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when both false", () => {
    expect(computeNewsBulletinArtifactConsistency(false, false)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when both null", () => {
    expect(computeNewsBulletinArtifactConsistency(null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when both undefined", () => {
    expect(computeNewsBulletinArtifactConsistency(undefined, undefined)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when script true and metadata false", () => {
    expect(computeNewsBulletinArtifactConsistency(true, false)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when script true and metadata null", () => {
    expect(computeNewsBulletinArtifactConsistency(true, null)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when script false and metadata true", () => {
    expect(computeNewsBulletinArtifactConsistency(false, true)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when script null and metadata true", () => {
    expect(computeNewsBulletinArtifactConsistency(null, true)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when both true", () => {
    expect(computeNewsBulletinArtifactConsistency(true, true)).toBe("Dengeli");
  });

  it("returns 'Artifacts yok' when script false and metadata undefined", () => {
    expect(computeNewsBulletinArtifactConsistency(false, undefined)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when script true and metadata undefined", () => {
    expect(computeNewsBulletinArtifactConsistency(true, undefined)).toBe("Tek taraflı");
  });
});
