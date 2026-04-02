import { describe, it, expect } from "vitest";
import { computeSourceLinkedNewsStatus } from "../components/sources/SourceLinkedNewsSummary";

describe("computeSourceLinkedNewsStatus smoke tests", () => {
  it("returns 'Bilinmiyor' when linkedNewsCount is undefined", () => {
    expect(computeSourceLinkedNewsStatus(undefined)).toBe("Bilinmiyor");
  });

  it("returns 'İçerik yok' when linkedNewsCount is 0", () => {
    expect(computeSourceLinkedNewsStatus(0)).toBe("İçerik yok");
  });

  it("returns 'İçerik var' when linkedNewsCount is 1", () => {
    expect(computeSourceLinkedNewsStatus(1)).toBe("İçerik var");
  });

  it("returns 'İçerik var' when linkedNewsCount is 5", () => {
    expect(computeSourceLinkedNewsStatus(5)).toBe("İçerik var");
  });

  it("returns 'İçerik var' when linkedNewsCount is 100", () => {
    expect(computeSourceLinkedNewsStatus(100)).toBe("İçerik var");
  });

  it("returns 'İçerik yok' for exactly 0", () => {
    expect(computeSourceLinkedNewsStatus(0)).toBe("İçerik yok");
  });

  it("returns 'İçerik var' for large count", () => {
    expect(computeSourceLinkedNewsStatus(999)).toBe("İçerik var");
  });

  it("returns 'Bilinmiyor' when linkedNewsCount is null-like (undefined)", () => {
    expect(computeSourceLinkedNewsStatus(undefined)).toBe("Bilinmiyor");
  });

  it("returns 'İçerik var' for count 2", () => {
    expect(computeSourceLinkedNewsStatus(2)).toBe("İçerik var");
  });

  it("returns 'İçerik yok' when count is 0 regardless of other params", () => {
    expect(computeSourceLinkedNewsStatus(0)).toBe("İçerik yok");
  });
});
