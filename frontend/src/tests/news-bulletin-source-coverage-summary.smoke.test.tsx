import { describe, it, expect } from "vitest";
import { computeNewsBulletinSourceCoverage } from "../components/news-bulletin/NewsBulletinSourceCoverageSummary";

describe("computeNewsBulletinSourceCoverage smoke tests", () => {
  it("returns 'Kaynak yok' when selectedNewsCount is 0", () => {
    expect(computeNewsBulletinSourceCoverage(0, 0, false)).toBe("Kaynak yok");
  });

  it("returns 'Kaynak yok' when selectedNewsCount is undefined", () => {
    expect(computeNewsBulletinSourceCoverage(undefined, undefined, undefined)).toBe("Kaynak yok");
  });

  it("returns 'Kaynak yok' when selectedNewsCount is null-like (0)", () => {
    expect(computeNewsBulletinSourceCoverage(0, 2, false)).toBe("Kaynak yok");
  });

  it("returns 'Kaynak bilgisi eksik' when news exist but sourceCount is 0", () => {
    expect(computeNewsBulletinSourceCoverage(3, 0, true)).toBe("Kaynak bilgisi eksik");
  });

  it("returns 'Kaynak bilgisi eksik' when news exist but sourceCount is undefined", () => {
    expect(computeNewsBulletinSourceCoverage(2, undefined, false)).toBe("Kaynak bilgisi eksik");
  });

  it("returns 'Tek kaynak' when sourceCount is 1", () => {
    expect(computeNewsBulletinSourceCoverage(3, 1, false)).toBe("Tek kaynak");
  });

  it("returns 'Tek kaynak' when sourceCount is 1 with missing source flag", () => {
    expect(computeNewsBulletinSourceCoverage(5, 1, true)).toBe("Tek kaynak");
  });

  it("returns 'Çoklu kaynak' when sourceCount is 2", () => {
    expect(computeNewsBulletinSourceCoverage(4, 2, false)).toBe("Çoklu kaynak");
  });

  it("returns 'Çoklu kaynak' when sourceCount is 5", () => {
    expect(computeNewsBulletinSourceCoverage(10, 5, false)).toBe("Çoklu kaynak");
  });

  it("returns 'Çoklu kaynak' when sourceCount is 3 and missing source flag true", () => {
    expect(computeNewsBulletinSourceCoverage(8, 3, true)).toBe("Çoklu kaynak");
  });
});
