import { describe, it, expect } from "vitest";
import { computeSourceScanResultRichness } from "../components/source-scans/SourceScanResultRichnessSummary";

describe("computeSourceScanResultRichness smoke tests", () => {
  it("returns 'Sorunlu' when status is failed", () => {
    expect(computeSourceScanResultRichness("failed", 5, null, null)).toBe("Sorunlu");
  });

  it("returns 'Sorunlu' when error_summary is non-empty", () => {
    expect(computeSourceScanResultRichness("completed", 0, "timeout error", null)).toBe("Sorunlu");
  });

  it("returns 'Sorunlu' when status failed and error present", () => {
    expect(computeSourceScanResultRichness("failed", null, "network error", null)).toBe("Sorunlu");
  });

  it("returns 'Boş çıktı' when result_count 0 and no preview", () => {
    expect(computeSourceScanResultRichness("completed", 0, null, null)).toBe("Boş çıktı");
  });

  it("returns 'Boş çıktı' when result_count 0 and preview whitespace only", () => {
    expect(computeSourceScanResultRichness("completed", 0, null, "   ")).toBe("Boş çıktı");
  });

  it("returns 'Çıktı var' when result_count > 0 and no preview", () => {
    expect(computeSourceScanResultRichness("completed", 3, null, null)).toBe("Çıktı var");
  });

  it("returns 'Zengin çıktı' when result_count > 0 and preview present", () => {
    expect(computeSourceScanResultRichness("completed", 3, null, '{"items":[]}')).toBe("Zengin çıktı");
  });

  it("returns 'Zengin çıktı' when result_count null but preview present", () => {
    expect(computeSourceScanResultRichness("completed", null, null, '{"items":[]}')).toBe("Zengin çıktı");
  });

  it("returns 'Belirsiz' when all fields null", () => {
    expect(computeSourceScanResultRichness(null, null, null, null)).toBe("Belirsiz");
  });

  it("returns 'Belirsiz' when status unknown and no result data", () => {
    expect(computeSourceScanResultRichness("queued", null, null, null)).toBe("Belirsiz");
  });
});
