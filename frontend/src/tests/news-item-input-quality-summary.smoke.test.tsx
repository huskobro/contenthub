import { describe, it, expect } from "vitest";
import { computeNewsItemInputQuality } from "../components/news-items/NewsItemInputQualitySummary";

describe("computeNewsItemInputQuality smoke tests", () => {
  it("returns 'Zayıf giriş' when title null", () => {
    expect(computeNewsItemInputQuality(null, "https://example.com", "summary", "src", null, "tr", null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when url null", () => {
    expect(computeNewsItemInputQuality("Title", null, "summary", null, null, null, null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when title whitespace", () => {
    expect(computeNewsItemInputQuality("  ", "https://example.com", "summary", null, null, null, null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Kısmi giriş' when title + url but no summary", () => {
    expect(computeNewsItemInputQuality("Title", "https://example.com", null, null, null, null, null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when title + url + summary but no extras", () => {
    expect(computeNewsItemInputQuality("Title", "https://example.com", "A summary", null, null, null, null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Güçlü giriş' when title + url + summary + source_id", () => {
    expect(computeNewsItemInputQuality("Title", "https://example.com", "A summary", "src-1", null, null, null, null)).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when title + url + summary + language", () => {
    expect(computeNewsItemInputQuality("Title", "https://example.com", "A summary", null, null, "tr", null, null)).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when title + url + summary + category", () => {
    expect(computeNewsItemInputQuality("Title", "https://example.com", "A summary", null, null, null, "tech", null)).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when title + url + summary + published_at", () => {
    expect(computeNewsItemInputQuality("Title", "https://example.com", "A summary", null, null, null, null, "2026-01-01")).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when all fields present", () => {
    expect(computeNewsItemInputQuality("Title", "https://example.com", "A summary", "src-1", "scan-1", "tr", "politics", "2026-01-01")).toBe("Güçlü giriş");
  });
});
