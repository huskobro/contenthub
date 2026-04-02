import { describe, it, expect } from "vitest";
import { computeSourceScanInputSpecificity } from "../components/source-scans/SourceScanInputSpecificitySummary";

describe("computeSourceScanInputSpecificity smoke tests", () => {
  it("returns 'Genel giriş' when all null", () => {
    expect(computeSourceScanInputSpecificity(null, null, null, null)).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when source_id is empty string", () => {
    expect(computeSourceScanInputSpecificity("", "manual", "admin", "note")).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when source_id is whitespace only", () => {
    expect(computeSourceScanInputSpecificity("   ", "manual", "admin", "note")).toBe("Genel giriş");
  });

  it("returns 'Kısmi özgüllük' when source_id present but scan_mode missing", () => {
    expect(computeSourceScanInputSpecificity("src-1", null, "admin", "note")).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when source_id present but requested_by missing", () => {
    expect(computeSourceScanInputSpecificity("src-1", "manual", null, "note")).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when source_id + scan_mode + requested_by present but notes missing", () => {
    expect(computeSourceScanInputSpecificity("src-1", "manual", "admin", null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when source_id + scan_mode + requested_by present but notes empty", () => {
    expect(computeSourceScanInputSpecificity("src-1", "auto", "scheduler", "  ")).toBe("Kısmi özgüllük");
  });

  it("returns 'Belirgin giriş' when source_id + scan_mode + requested_by + notes all present", () => {
    expect(computeSourceScanInputSpecificity("src-1", "manual", "admin", "weekly rescan")).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when all fields present with auto mode", () => {
    expect(computeSourceScanInputSpecificity("src-2", "auto", "scheduler", "nightly run")).toBe("Belirgin giriş");
  });

  it("returns 'Kısmi özgüllük' when source + scan_mode only, no requested_by or notes", () => {
    expect(computeSourceScanInputSpecificity("src-1", "manual", null, null)).toBe("Kısmi özgüllük");
  });
});
