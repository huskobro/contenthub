import { describe, it, expect } from "vitest";
import { computeSourcePublicationOutcome } from "../components/sources/SourcePublicationOutcomeSummary";

describe("computeSourcePublicationOutcome smoke tests", () => {
  it("returns 'Hazırlanıyor' when all null", () => {
    expect(computeSourcePublicationOutcome(null, null, null)).toBe("Hazırlanıyor");
  });

  it("returns 'Hazırlanıyor' when all zero", () => {
    expect(computeSourcePublicationOutcome(0, 0, 0)).toBe("Hazırlanıyor");
  });

  it("returns 'Hazırlanıyor' when all undefined", () => {
    expect(computeSourcePublicationOutcome(undefined, undefined, undefined)).toBe("Hazırlanıyor");
  });

  it("returns 'Ham çıktı' when linked > 0 but reviewed and used are 0", () => {
    expect(computeSourcePublicationOutcome(5, 0, 0)).toBe("Ham çıktı");
  });

  it("returns 'Ham çıktı' when linked > 0, reviewed null, used null", () => {
    expect(computeSourcePublicationOutcome(3, null, null)).toBe("Ham çıktı");
  });

  it("returns 'Aday çıktı' when reviewed > 0 and used is 0", () => {
    expect(computeSourcePublicationOutcome(10, 2, 0)).toBe("Aday çıktı");
  });

  it("returns 'Aday çıktı' when reviewed > 0, used null", () => {
    expect(computeSourcePublicationOutcome(10, 4, null)).toBe("Aday çıktı");
  });

  it("returns 'Yayına yakın çıktı' when used > 0", () => {
    expect(computeSourcePublicationOutcome(10, 5, 1)).toBe("Yayına yakın çıktı");
  });

  it("returns 'Yayına yakın çıktı' when used > 0, reviewed and linked are 0", () => {
    expect(computeSourcePublicationOutcome(0, 0, 3)).toBe("Yayına yakın çıktı");
  });

  it("returns 'Yayına yakın çıktı' when all counts are high", () => {
    expect(computeSourcePublicationOutcome(100, 50, 20)).toBe("Yayına yakın çıktı");
  });
});
