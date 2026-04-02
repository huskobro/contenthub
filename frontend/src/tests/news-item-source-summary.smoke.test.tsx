import { describe, it, expect } from "vitest";
import { computeNewsItemSourceStatus } from "../components/news-items/NewsItemSourceSummary";

describe("computeNewsItemSourceStatus smoke tests", () => {
  it("returns 'Kaynak yok' when sourceId is null", () => {
    expect(computeNewsItemSourceStatus(null, null)).toBe("Kaynak yok");
  });

  it("returns 'Kaynak yok' when sourceId is undefined", () => {
    expect(computeNewsItemSourceStatus(undefined, undefined)).toBe("Kaynak yok");
  });

  it("returns 'Kaynak yok' when sourceId is empty string", () => {
    expect(computeNewsItemSourceStatus("", null)).toBe("Kaynak yok");
  });

  it("returns 'Bağlı' when sourceId and sourceName are both present", () => {
    expect(computeNewsItemSourceStatus("src-123", "BBC News")).toBe("Bağlı");
  });

  it("returns 'Bağlı' when sourceId exists and sourceName is a non-empty string", () => {
    expect(computeNewsItemSourceStatus("abc-456", "Reuters")).toBe("Bağlı");
  });

  it("returns 'Bulunamadı' when sourceId exists but sourceName is null", () => {
    expect(computeNewsItemSourceStatus("src-789", null)).toBe("Bulunamadı");
  });

  it("returns 'Bulunamadı' when sourceId exists but sourceName is undefined", () => {
    expect(computeNewsItemSourceStatus("src-999", undefined)).toBe("Bulunamadı");
  });

  it("returns 'Bulunamadı' when sourceId exists but sourceName is empty string", () => {
    expect(computeNewsItemSourceStatus("src-000", "")).toBe("Bulunamadı");
  });

  it("returns 'Bağlı' for a real-looking UUID source with name", () => {
    expect(computeNewsItemSourceStatus("550e8400-e29b-41d4-a716-446655440000", "Al Jazeera")).toBe("Bağlı");
  });

  it("returns 'Kaynak yok' for all-null/undefined inputs", () => {
    expect(computeNewsItemSourceStatus(undefined, undefined)).toBe("Kaynak yok");
  });
});
