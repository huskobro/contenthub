import { describe, it, expect } from "vitest";
import { computeNewsItemInputSpecificity } from "../components/news-items/NewsItemInputSpecificitySummary";

describe("computeNewsItemInputSpecificity smoke tests", () => {
  it("returns 'Genel giriş' when all null", () => {
    expect(computeNewsItemInputSpecificity(null, null, null, null, null, null, null, null)).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when title and url both empty", () => {
    expect(computeNewsItemInputSpecificity("", "   ", null, null, null, null, null, null)).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when title and url both whitespace", () => {
    expect(computeNewsItemInputSpecificity("  ", "  ", null, "src-1", "scan-1", "tr", "news", "2026-01-01")).toBe("Genel giriş");
  });

  it("returns 'Kısmi özgüllük' when only title present", () => {
    expect(computeNewsItemInputSpecificity("Breaking News", null, null, null, null, null, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when only url present", () => {
    expect(computeNewsItemInputSpecificity(null, "https://example.com/news", null, null, null, null, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when title+url but no summary", () => {
    expect(computeNewsItemInputSpecificity("News", "https://example.com", null, "src-1", "scan-1", "tr", "news", null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when title+url+summary but no source refs", () => {
    expect(computeNewsItemInputSpecificity("News", "https://example.com", "A summary", null, null, null, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Belirgin giriş' when title+url+summary+sourceId", () => {
    expect(computeNewsItemInputSpecificity("News", "https://example.com", "A summary", "src-1", null, null, null, null)).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when title+url+summary+sourceScanId", () => {
    expect(computeNewsItemInputSpecificity("News", "https://example.com", "A summary", null, "scan-1", null, null, null)).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when all fields present", () => {
    expect(computeNewsItemInputSpecificity("Breaking News", "https://example.com/news", "Detailed summary", "src-1", "scan-1", "tr", "news", "2026-04-01T10:00:00")).toBe("Belirgin giriş");
  });
});
