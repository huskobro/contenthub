import { describe, it, expect } from "vitest";
import { computeSourceArtifactConsistency } from "../components/sources/SourceArtifactConsistencySummary";

describe("computeSourceArtifactConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when all null", () => {
    expect(computeSourceArtifactConsistency(null, null, null, null, 0)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when no config and no linked news", () => {
    expect(computeSourceArtifactConsistency("rss", null, null, null, 0)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when rss type has feed_url but no linked news", () => {
    expect(computeSourceArtifactConsistency("rss", null, "https://feed.url/rss", null, 0)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when manual_url has base_url but no linked news", () => {
    expect(computeSourceArtifactConsistency("manual_url", "https://site.com", null, null, 0)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when api type has endpoint but no linked news", () => {
    expect(computeSourceArtifactConsistency("api", null, null, "https://api.url/v1", 0)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when no config but has linked news", () => {
    expect(computeSourceArtifactConsistency("rss", null, null, null, 5)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when rss has feed_url and linked news", () => {
    expect(computeSourceArtifactConsistency("rss", null, "https://feed.url/rss", null, 3)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when manual_url has base_url and linked news", () => {
    expect(computeSourceArtifactConsistency("manual_url", "https://site.com", null, null, 10)).toBe("Dengeli");
  });

  it("returns 'Artifacts yok' when feed_url is whitespace and no linked news", () => {
    expect(computeSourceArtifactConsistency("rss", null, "   ", null, 0)).toBe("Artifacts yok");
  });

  it("returns 'Dengeli' when unknown type has any url and linked news", () => {
    expect(computeSourceArtifactConsistency(null, "https://site.com", null, null, 2)).toBe("Dengeli");
  });
});
