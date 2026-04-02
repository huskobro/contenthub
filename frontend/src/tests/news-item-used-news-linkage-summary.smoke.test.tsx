import { describe, it, expect } from "vitest";
import { computeNewsItemUsedNewsLinkage } from "../components/news-items/NewsItemUsedNewsLinkageSummary";

describe("computeNewsItemUsedNewsLinkage smoke tests", () => {
  it("returns 'Bilinmiyor' when usageCount is null", () => {
    expect(computeNewsItemUsedNewsLinkage(null, false)).toBe("Bilinmiyor");
  });

  it("returns 'Bilinmiyor' when usageCount is undefined", () => {
    expect(computeNewsItemUsedNewsLinkage(undefined, false)).toBe("Bilinmiyor");
  });

  it("returns 'Bağ yok' when usageCount is 0", () => {
    expect(computeNewsItemUsedNewsLinkage(0, false)).toBe("Bağ yok");
  });

  it("returns 'Bağ yok' when usageCount is 0 even if hasPublished is true", () => {
    expect(computeNewsItemUsedNewsLinkage(0, true)).toBe("Bağ yok");
  });

  it("returns 'Yayın bağı var' when usageCount > 0 and hasPublished is true", () => {
    expect(computeNewsItemUsedNewsLinkage(1, true)).toBe("Yayın bağı var");
  });

  it("returns 'Yayın bağı var' when usageCount > 1 and hasPublished is true", () => {
    expect(computeNewsItemUsedNewsLinkage(3, true)).toBe("Yayın bağı var");
  });

  it("returns 'Bağlı' when usageCount > 0 and hasPublished is false", () => {
    expect(computeNewsItemUsedNewsLinkage(1, false)).toBe("Bağlı");
  });

  it("returns 'Bağlı' when usageCount > 0 and hasPublished is null", () => {
    expect(computeNewsItemUsedNewsLinkage(2, null)).toBe("Bağlı");
  });

  it("returns 'Bağlı' when usageCount > 0 and hasPublished is undefined", () => {
    expect(computeNewsItemUsedNewsLinkage(1, undefined)).toBe("Bağlı");
  });

  it("returns 'Bilinmiyor' when usageCount is null regardless of hasPublished", () => {
    expect(computeNewsItemUsedNewsLinkage(null, true)).toBe("Bilinmiyor");
  });
});
