import { describe, it, expect } from "vitest";
import { computeSourceScanSourceStatus } from "../components/source-scans/SourceScanSourceSummary";

describe("computeSourceScanSourceStatus smoke tests", () => {
  it("returns 'Kaynak yok' when sourceId is null", () => {
    expect(computeSourceScanSourceStatus(null, null)).toBe("Kaynak yok");
  });

  it("returns 'Kaynak yok' when sourceId is undefined", () => {
    expect(computeSourceScanSourceStatus(undefined, undefined)).toBe("Kaynak yok");
  });

  it("returns 'Kaynak yok' when sourceId is empty string", () => {
    expect(computeSourceScanSourceStatus("", null)).toBe("Kaynak yok");
  });

  it("returns 'Bağlı' when sourceId and sourceName both present", () => {
    expect(computeSourceScanSourceStatus("src-123", "BBC News")).toBe("Bağlı");
  });

  it("returns 'Bağlı' when sourceId and sourceName are non-empty", () => {
    expect(computeSourceScanSourceStatus("abc-456", "Reuters")).toBe("Bağlı");
  });

  it("returns 'Kaynak bulunamadı' when sourceId exists but sourceName is null", () => {
    expect(computeSourceScanSourceStatus("src-789", null)).toBe("Kaynak bulunamadı");
  });

  it("returns 'Kaynak bulunamadı' when sourceId exists but sourceName is undefined", () => {
    expect(computeSourceScanSourceStatus("src-999", undefined)).toBe("Kaynak bulunamadı");
  });

  it("returns 'Kaynak bulunamadı' when sourceId exists but sourceName is empty string", () => {
    expect(computeSourceScanSourceStatus("src-000", "")).toBe("Kaynak bulunamadı");
  });

  it("returns 'Bağlı' for UUID source with a name", () => {
    expect(computeSourceScanSourceStatus("550e8400-e29b-41d4-a716-446655440000", "Al Jazeera")).toBe("Bağlı");
  });

  it("returns 'Kaynak yok' for all-null inputs", () => {
    expect(computeSourceScanSourceStatus(undefined, undefined)).toBe("Kaynak yok");
  });
});
