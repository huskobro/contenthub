import { describe, it, expect } from "vitest";
import { computeSourceConfigCoverage } from "../components/sources/SourceConfigCoverageSummary";

describe("computeSourceConfigCoverage smoke tests", () => {
  it("returns 'Tür belirsiz' when sourceType is null", () => {
    expect(computeSourceConfigCoverage(null, null, null, null)).toBe("Tür belirsiz");
  });

  it("returns 'Tür belirsiz' when sourceType is undefined", () => {
    expect(computeSourceConfigCoverage(undefined, null, null, null)).toBe("Tür belirsiz");
  });

  it("returns 'Tür belirsiz' when sourceType is empty string", () => {
    expect(computeSourceConfigCoverage("", null, null, null)).toBe("Tür belirsiz");
  });

  it("returns 'Feed tanımlı' when sourceType is rss and feedUrl is set", () => {
    expect(computeSourceConfigCoverage("rss", null, "https://example.com/feed", null)).toBe("Feed tanımlı");
  });

  it("returns 'Feed eksik' when sourceType is rss and feedUrl is null", () => {
    expect(computeSourceConfigCoverage("rss", null, null, null)).toBe("Feed eksik");
  });

  it("returns 'Feed eksik' when sourceType is rss and feedUrl is whitespace", () => {
    expect(computeSourceConfigCoverage("rss", null, "   ", null)).toBe("Feed eksik");
  });

  it("returns 'URL tanımlı' when sourceType is manual_url and baseUrl is set", () => {
    expect(computeSourceConfigCoverage("manual_url", "https://example.com", null, null)).toBe("URL tanımlı");
  });

  it("returns 'URL eksik' when sourceType is manual_url and baseUrl is null", () => {
    expect(computeSourceConfigCoverage("manual_url", null, null, null)).toBe("URL eksik");
  });

  it("returns 'API tanımlı' when sourceType is api and apiEndpoint is set", () => {
    expect(computeSourceConfigCoverage("api", null, null, "https://api.example.com/v1")).toBe("API tanımlı");
  });

  it("returns 'API eksik' when sourceType is api and apiEndpoint is null", () => {
    expect(computeSourceConfigCoverage("api", null, null, null)).toBe("API eksik");
  });
});
