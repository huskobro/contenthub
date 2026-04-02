import { describe, it, expect } from "vitest";
import { computeNewsItemPublicationLineage } from "../components/news-items/NewsItemPublicationLineageSummary";

describe("computeNewsItemPublicationLineage smoke tests", () => {
  it("returns 'Belirsiz' when usageCount is null", () => {
    expect(computeNewsItemPublicationLineage(null, false)).toBe("Belirsiz");
  });

  it("returns 'Belirsiz' when usageCount is undefined", () => {
    expect(computeNewsItemPublicationLineage(undefined, false)).toBe("Belirsiz");
  });

  it("returns 'Zincir yok' when usageCount is 0", () => {
    expect(computeNewsItemPublicationLineage(0, false)).toBe("Zincir yok");
  });

  it("returns 'Zincir yok' when usageCount is 0 even if hasPublished is true", () => {
    expect(computeNewsItemPublicationLineage(0, true)).toBe("Zincir yok");
  });

  it("returns 'Yayın zincirinde' when usageCount > 0 and hasPublished is true", () => {
    expect(computeNewsItemPublicationLineage(1, true)).toBe("Yayın zincirinde");
  });

  it("returns 'Yayın zincirinde' when usageCount > 1 and hasPublished is true", () => {
    expect(computeNewsItemPublicationLineage(3, true)).toBe("Yayın zincirinde");
  });

  it("returns 'İçerik zincirinde' when usageCount > 0 and hasPublished is false", () => {
    expect(computeNewsItemPublicationLineage(1, false)).toBe("İçerik zincirinde");
  });

  it("returns 'İçerik zincirinde' when usageCount > 0 and hasPublished is false (multi)", () => {
    expect(computeNewsItemPublicationLineage(4, false)).toBe("İçerik zincirinde");
  });

  it("returns 'Kısmi zincir' when usageCount > 0 and hasPublished is null", () => {
    expect(computeNewsItemPublicationLineage(2, null)).toBe("Kısmi zincir");
  });

  it("returns 'Kısmi zincir' when usageCount > 0 and hasPublished is undefined", () => {
    expect(computeNewsItemPublicationLineage(1, undefined)).toBe("Kısmi zincir");
  });
});
