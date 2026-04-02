import { describe, it, expect } from "vitest";
import { computeNewsItemScanLineage } from "../components/news-items/NewsItemScanLineageSummary";

describe("computeNewsItemScanLineage smoke tests", () => {
  it("returns 'Manuel' when sourceScanId is null", () => {
    expect(computeNewsItemScanLineage(null, null)).toBe("Manuel");
  });

  it("returns 'Manuel' when sourceScanId is undefined", () => {
    expect(computeNewsItemScanLineage(undefined, undefined)).toBe("Manuel");
  });

  it("returns 'Manuel' when sourceScanId is empty string", () => {
    expect(computeNewsItemScanLineage("", null)).toBe("Manuel");
  });

  it("returns 'Scan bağlı' when sourceScanId and status is 'completed'", () => {
    expect(computeNewsItemScanLineage("scan-123", "completed")).toBe("Scan bağlı");
  });

  it("returns 'Scan bağlı' when sourceScanId and status is 'queued'", () => {
    expect(computeNewsItemScanLineage("scan-456", "queued")).toBe("Scan bağlı");
  });

  it("returns 'Scan bağlı' when sourceScanId and status is 'failed'", () => {
    expect(computeNewsItemScanLineage("scan-789", "failed")).toBe("Scan bağlı");
  });

  it("returns 'Scan bulunamadı' when sourceScanId present and status is 'not_found'", () => {
    expect(computeNewsItemScanLineage("scan-000", "not_found")).toBe("Scan bulunamadı");
  });

  it("returns 'Scan referansı' when sourceScanId present but status is null", () => {
    expect(computeNewsItemScanLineage("scan-ref", null)).toBe("Scan referansı");
  });

  it("returns 'Scan referansı' when sourceScanId present but status is undefined", () => {
    expect(computeNewsItemScanLineage("scan-ref-2", undefined)).toBe("Scan referansı");
  });

  it("returns 'Manuel' for both null values", () => {
    expect(computeNewsItemScanLineage(null, undefined)).toBe("Manuel");
  });
});
