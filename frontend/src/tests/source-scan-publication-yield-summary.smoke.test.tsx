import { describe, it, expect } from "vitest";
import { computeSourceScanPublicationYield } from "../components/source-scans/SourceScanPublicationYieldSummary";

describe("computeSourceScanPublicationYield smoke tests", () => {
  it("returns 'Bilinmiyor' when linkedCount is null", () => {
    expect(computeSourceScanPublicationYield(null, null, null)).toBe("Bilinmiyor");
  });

  it("returns 'Bilinmiyor' when linkedCount is undefined", () => {
    expect(computeSourceScanPublicationYield(undefined, 0, 0)).toBe("Bilinmiyor");
  });

  it("returns 'İçerik yok' when linkedCount is 0", () => {
    expect(computeSourceScanPublicationYield(0, 0, 0)).toBe("İçerik yok");
  });

  it("returns 'İçerik yok' when linkedCount is negative", () => {
    expect(computeSourceScanPublicationYield(-1, 0, 0)).toBe("İçerik yok");
  });

  it("returns 'Ham çıktı' when linked > 0, reviewed = 0, used = 0", () => {
    expect(computeSourceScanPublicationYield(5, 0, 0)).toBe("Ham çıktı");
  });

  it("returns 'Ham çıktı' when linked > 0, reviewed null, used null", () => {
    expect(computeSourceScanPublicationYield(3, null, null)).toBe("Ham çıktı");
  });

  it("returns 'Aday çıktı' when linked > 0, reviewed > 0, used = 0", () => {
    expect(computeSourceScanPublicationYield(5, 2, 0)).toBe("Aday çıktı");
  });

  it("returns 'Aday çıktı' when linked > 0, reviewed > 0, used null", () => {
    expect(computeSourceScanPublicationYield(5, 2, null)).toBe("Aday çıktı");
  });

  it("returns 'Kullanılmış çıktı' when used > 0", () => {
    expect(computeSourceScanPublicationYield(5, 2, 1)).toBe("Kullanılmış çıktı");
  });

  it("returns 'Kullanılmış çıktı' when used > 0 and reviewed is 0", () => {
    expect(computeSourceScanPublicationYield(5, 0, 3)).toBe("Kullanılmış çıktı");
  });
});
