import { describe, it, expect } from "vitest";
import { computeSourcePublicationSupply } from "../components/sources/SourcePublicationSupplySummary";

describe("computeSourcePublicationSupply smoke tests", () => {
  it("returns 'Bilinmiyor' when linkedNewsCount is null", () => {
    expect(computeSourcePublicationSupply(null, 0, 0)).toBe("Bilinmiyor");
  });

  it("returns 'İçerik yok' when linkedNewsCount is 0", () => {
    expect(computeSourcePublicationSupply(0, 0, 0)).toBe("İçerik yok");
  });

  it("returns 'Ham içerik' when linked but no reviewed or used", () => {
    expect(computeSourcePublicationSupply(5, 0, 0)).toBe("Ham içerik");
  });

  it("returns 'Ham içerik' when linked and reviewed/used null", () => {
    expect(computeSourcePublicationSupply(3, null, null)).toBe("Ham içerik");
  });

  it("returns 'Aday içerik var' when reviewed > 0 but used = 0", () => {
    expect(computeSourcePublicationSupply(5, 2, 0)).toBe("Aday içerik var");
  });

  it("returns 'Aday içerik var' when reviewed > 0 but used null", () => {
    expect(computeSourcePublicationSupply(5, 3, null)).toBe("Aday içerik var");
  });

  it("returns 'Kullanılmış içerik var' when used > 0", () => {
    expect(computeSourcePublicationSupply(5, 0, 1)).toBe("Kullanılmış içerik var");
  });

  it("returns 'Kullanılmış içerik var' when both reviewed and used > 0", () => {
    expect(computeSourcePublicationSupply(10, 3, 2)).toBe("Kullanılmış içerik var");
  });

  it("returns 'İçerik yok' when linkedNewsCount negative treated as 0", () => {
    expect(computeSourcePublicationSupply(0, 1, 1)).toBe("İçerik yok");
  });

  it("returns 'Bilinmiyor' when linkedNewsCount undefined", () => {
    expect(computeSourcePublicationSupply(undefined, 0, 0)).toBe("Bilinmiyor");
  });
});
