import { describe, it, expect } from "vitest";
import { computeStandardVideoInputQuality } from "../components/standard-video/StandardVideoInputQualitySummary";

describe("computeStandardVideoInputQuality smoke tests", () => {
  it("returns 'Zayıf giriş' when topic is null", () => {
    expect(computeStandardVideoInputQuality(null, "brief", 60, "tr")).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when topic is undefined", () => {
    expect(computeStandardVideoInputQuality(undefined, "brief", 60, "tr")).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when topic is whitespace only", () => {
    expect(computeStandardVideoInputQuality("   ", "brief", 60, "tr")).toBe("Zayıf giriş");
  });

  it("returns 'Kısmi giriş' when topic is present but brief is missing", () => {
    expect(computeStandardVideoInputQuality("Konu", null, 60, "tr")).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when topic is present but duration is missing", () => {
    expect(computeStandardVideoInputQuality("Konu", "açıklama", null, "tr")).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when topic is present but language is missing", () => {
    expect(computeStandardVideoInputQuality("Konu", "açıklama", 60, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when topic only (no brief/duration/language)", () => {
    expect(computeStandardVideoInputQuality("Konu", null, null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Güçlü giriş' when topic + brief + duration + language all present", () => {
    expect(computeStandardVideoInputQuality("Konu", "açıklama", 120, "tr")).toBe("Güçlü giriş");
  });

  it("returns 'Zayıf giriş' when topic is empty string", () => {
    expect(computeStandardVideoInputQuality("", "açıklama", 60, "tr")).toBe("Zayıf giriş");
  });

  it("returns 'Kısmi giriş' when duration is 0 (invalid)", () => {
    expect(computeStandardVideoInputQuality("Konu", "açıklama", 0, "tr")).toBe("Kısmi giriş");
  });
});
