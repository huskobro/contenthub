import { describe, it, expect } from "vitest";
import { computeUsedNewsTargetResolution } from "../components/used-news/UsedNewsTargetResolutionSummary";

describe("computeUsedNewsTargetResolution smoke tests", () => {
  it("returns 'Belirsiz' when targetModule is null", () => {
    expect(computeUsedNewsTargetResolution(null, "entity-1", true)).toBe("Belirsiz");
  });

  it("returns 'Belirsiz' when targetModule is empty string", () => {
    expect(computeUsedNewsTargetResolution("", "entity-1", true)).toBe("Belirsiz");
  });

  it("returns 'Belirsiz' when targetModule is undefined", () => {
    expect(computeUsedNewsTargetResolution(undefined, "entity-1", true)).toBe("Belirsiz");
  });

  it("returns 'Hedef eksik' when targetModule present but entityId is null", () => {
    expect(computeUsedNewsTargetResolution("news_bulletin", null, false)).toBe("Hedef eksik");
  });

  it("returns 'Hedef eksik' when targetModule present but entityId is empty string", () => {
    expect(computeUsedNewsTargetResolution("news_bulletin", "", false)).toBe("Hedef eksik");
  });

  it("returns 'Hedef bağlı' when both present and resolved is true", () => {
    expect(computeUsedNewsTargetResolution("news_bulletin", "entity-1", true)).toBe("Hedef bağlı");
  });

  it("returns 'Hedef bulunamadı' when both present but resolved is false", () => {
    expect(computeUsedNewsTargetResolution("news_bulletin", "entity-1", false)).toBe("Hedef bulunamadı");
  });

  it("returns 'Hedef bağlı' for standard_video module resolved", () => {
    expect(computeUsedNewsTargetResolution("standard_video", "entity-42", true)).toBe("Hedef bağlı");
  });

  it("returns 'Hedef bulunamadı' for job module not resolved", () => {
    expect(computeUsedNewsTargetResolution("job", "entity-99", false)).toBe("Hedef bulunamadı");
  });

  it("returns 'Belirsiz' when hasTargetResolved is null and entity is present", () => {
    expect(computeUsedNewsTargetResolution("news_bulletin", "entity-1", null)).toBe("Belirsiz");
  });
});
