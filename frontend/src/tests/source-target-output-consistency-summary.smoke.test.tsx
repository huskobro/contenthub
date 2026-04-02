import { describe, it, expect } from "vitest";
import { computeSourceTargetOutputConsistency } from "../components/sources/SourceTargetOutputConsistencySummary";

describe("computeSourceTargetOutputConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when all null", () => {
    expect(computeSourceTargetOutputConsistency(null, null, null, null, null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when rss type with no feed_url and no output", () => {
    expect(computeSourceTargetOutputConsistency("rss", null, null, null, 0, 0, 0)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when rss type with feed_url but no output", () => {
    expect(computeSourceTargetOutputConsistency("rss", "https://example.com/feed", null, null, 0, 0, 0)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when manual_url type with base_url but no output", () => {
    expect(computeSourceTargetOutputConsistency("manual_url", null, "https://example.com", null, null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when api type with api_endpoint but no output", () => {
    expect(computeSourceTargetOutputConsistency("api", null, null, "https://api.example.com", 0, 0, 0)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when unknown type with no config but linked_news_count > 0", () => {
    expect(computeSourceTargetOutputConsistency(null, null, null, null, 5, 0, 0)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when rss type with empty feed_url but reviewed_news_count > 0", () => {
    expect(computeSourceTargetOutputConsistency("rss", "  ", null, null, 0, 3, 0)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when rss type with feed_url and linked_news_count > 0", () => {
    expect(computeSourceTargetOutputConsistency("rss", "https://example.com/feed", null, null, 10, 0, 0)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when manual_url type with base_url and used_news_count > 0", () => {
    expect(computeSourceTargetOutputConsistency("manual_url", null, "https://example.com", null, 0, 0, 2)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when api type with endpoint and all output counts positive", () => {
    expect(computeSourceTargetOutputConsistency("api", null, null, "https://api.example.com", 8, 5, 3)).toBe("Dengeli");
  });
});
