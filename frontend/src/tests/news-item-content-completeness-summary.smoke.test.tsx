import { describe, it, expect } from "vitest";
import { computeNewsItemCompleteness } from "../components/news-items/NewsItemContentCompletenessSummary";

describe("computeNewsItemCompleteness smoke tests", () => {
  it("returns 'Eksik' when title is null", () => {
    expect(computeNewsItemCompleteness(null, "https://example.com", "summary", "en", "tech", "2026-01-01")).toBe("Eksik");
  });

  it("returns 'Eksik' when url is null", () => {
    expect(computeNewsItemCompleteness("Title", null, "summary", "en", "tech", "2026-01-01")).toBe("Eksik");
  });

  it("returns 'Eksik' when title is empty string", () => {
    expect(computeNewsItemCompleteness("", "https://example.com", "summary", "en", "tech", "2026-01-01")).toBe("Eksik");
  });

  it("returns 'Eksik' when title is whitespace", () => {
    expect(computeNewsItemCompleteness("   ", "https://example.com", null, null, null, null)).toBe("Eksik");
  });

  it("returns 'Kısmi' when title and url present but summary is null", () => {
    expect(computeNewsItemCompleteness("Title", "https://example.com", null, null, null, null)).toBe("Kısmi");
  });

  it("returns 'Kısmi' when title and url present but summary is empty", () => {
    expect(computeNewsItemCompleteness("Title", "https://example.com", "", null, null, null)).toBe("Kısmi");
  });

  it("returns 'Kısmi' when title + url + summary present but no extra fields", () => {
    expect(computeNewsItemCompleteness("Title", "https://example.com", "Summary text", null, null, null)).toBe("Kısmi");
  });

  it("returns 'Dolu' when all main fields + language present", () => {
    expect(computeNewsItemCompleteness("Title", "https://example.com", "Summary", "en", null, null)).toBe("Dolu");
  });

  it("returns 'Dolu' when title + url + summary + category present", () => {
    expect(computeNewsItemCompleteness("Title", "https://example.com", "Summary", null, "tech", null)).toBe("Dolu");
  });

  it("returns 'Dolu' when all fields present", () => {
    expect(computeNewsItemCompleteness("Title", "https://example.com", "Summary", "en", "tech", "2026-01-01")).toBe("Dolu");
  });
});
