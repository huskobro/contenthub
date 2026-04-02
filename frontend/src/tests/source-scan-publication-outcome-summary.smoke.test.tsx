import { describe, it, expect } from "vitest";
import { computeSourceScanPublicationOutcome } from "../components/source-scans/SourceScanPublicationOutcomeSummary";

describe("computeSourceScanPublicationOutcome smoke tests", () => {
  it("returns 'Sorunlu' when status is failed", () => {
    expect(computeSourceScanPublicationOutcome("failed", 10, 5, 2, 1, null)).toBe("Sorunlu");
  });

  it("returns 'Sorunlu' when error_summary is present", () => {
    expect(computeSourceScanPublicationOutcome("completed", 0, 0, 0, 0, "connection timeout")).toBe("Sorunlu");
  });

  it("returns 'Yayına yakın çıktı' when used_news_count > 0", () => {
    expect(computeSourceScanPublicationOutcome("completed", 10, 5, 3, 2, null)).toBe("Yayına yakın çıktı");
  });

  it("returns 'Aday çıktı' when reviewed > 0 and used = 0", () => {
    expect(computeSourceScanPublicationOutcome("completed", 10, 5, 3, 0, null)).toBe("Aday çıktı");
  });

  it("returns 'Ham çıktı' when linked > 0 and reviewed/used = 0", () => {
    expect(computeSourceScanPublicationOutcome("completed", 10, 5, 0, 0, null)).toBe("Ham çıktı");
  });

  it("returns 'Ham çıktı' when only result_count > 0 (no linked/reviewed/used)", () => {
    expect(computeSourceScanPublicationOutcome("completed", 8, 0, 0, 0, null)).toBe("Ham çıktı");
  });

  it("returns 'Hazırlanıyor' when status queued and no output", () => {
    expect(computeSourceScanPublicationOutcome("queued", 0, 0, 0, 0, null)).toBe("Hazırlanıyor");
  });

  it("returns 'Hazırlanıyor' when status running and no output", () => {
    expect(computeSourceScanPublicationOutcome("running", null, null, null, null, null)).toBe("Hazırlanıyor");
  });

  it("returns 'Belirsiz' when all null/zero and status completed", () => {
    expect(computeSourceScanPublicationOutcome("completed", 0, 0, 0, 0, null)).toBe("Belirsiz");
  });

  it("returns 'Belirsiz' when everything null", () => {
    expect(computeSourceScanPublicationOutcome(null, null, null, null, null, null)).toBe("Belirsiz");
  });
});
