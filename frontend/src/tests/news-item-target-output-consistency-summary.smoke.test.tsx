import { describe, it, expect } from "vitest";
import { computeNewsItemTargetOutputConsistency } from "../components/news-items/NewsItemTargetOutputConsistencySummary";

describe("computeNewsItemTargetOutputConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when all null", () => {
    expect(computeNewsItemTargetOutputConsistency(null, null, null, null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when all empty and no output", () => {
    expect(computeNewsItemTargetOutputConsistency("  ", "  ", null, 0, false, false)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when title present but no output", () => {
    expect(computeNewsItemTargetOutputConsistency("Breaking News", null, null, 0, false, false)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when url present but no output", () => {
    expect(computeNewsItemTargetOutputConsistency(null, "https://example.com/news", null, null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when summary present but no output", () => {
    expect(computeNewsItemTargetOutputConsistency(null, null, "A short summary", 0, false, false)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when title and url present but no output", () => {
    expect(computeNewsItemTargetOutputConsistency("News Title", "https://example.com", null, 0, false, null)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when no input but used_news_link_count > 0", () => {
    expect(computeNewsItemTargetOutputConsistency(null, null, null, 3, false, false)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when no input but has_published_used_news_link is true", () => {
    expect(computeNewsItemTargetOutputConsistency("  ", null, null, 0, true, false)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when title present and used_news_link_count > 0", () => {
    expect(computeNewsItemTargetOutputConsistency("News Title", null, null, 2, false, false)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when all input fields and has_published_used_news_link true", () => {
    expect(computeNewsItemTargetOutputConsistency("News Title", "https://example.com", "Summary here", 1, true, false)).toBe("Dengeli");
  });
});
