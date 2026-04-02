import { describe, it, expect } from "vitest";
import { computeSourceScanInputQuality } from "../components/source-scans/SourceScanInputQualitySummary";

describe("computeSourceScanInputQuality smoke tests", () => {
  it("returns 'Zayıf giriş' when sourceId null", () => {
    expect(computeSourceScanInputQuality(null, "manual", "admin")).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when sourceId undefined", () => {
    expect(computeSourceScanInputQuality(undefined, "auto", "system")).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when sourceId whitespace", () => {
    expect(computeSourceScanInputQuality("   ", "manual", "admin")).toBe("Zayıf giriş");
  });

  it("returns 'Kısmi giriş' when sourceId present but scanMode null", () => {
    expect(computeSourceScanInputQuality("src-1", null, "admin")).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when sourceId present but requestedBy null", () => {
    expect(computeSourceScanInputQuality("src-1", "manual", null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when sourceId present but both scanMode and requestedBy null", () => {
    expect(computeSourceScanInputQuality("src-1", null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when sourceId present but requestedBy whitespace", () => {
    expect(computeSourceScanInputQuality("src-1", "auto", "  ")).toBe("Kısmi giriş");
  });

  it("returns 'Güçlü giriş' when sourceId + scanMode + requestedBy all present", () => {
    expect(computeSourceScanInputQuality("src-1", "manual", "admin")).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when all fields non-empty strings", () => {
    expect(computeSourceScanInputQuality("src-abc", "auto", "system")).toBe("Güçlü giriş");
  });

  it("returns 'Kısmi giriş' when sourceId present but scanMode whitespace", () => {
    expect(computeSourceScanInputQuality("src-1", "  ", "admin")).toBe("Kısmi giriş");
  });
});
