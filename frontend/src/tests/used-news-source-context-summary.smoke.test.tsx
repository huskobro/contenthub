import { describe, it, expect } from "vitest";
import { computeUsedNewsSourceContext } from "../components/used-news/UsedNewsSourceContextSummary";

describe("computeUsedNewsSourceContext smoke tests", () => {
  it("returns 'News item bulunamadı' when newsItemId is null", () => {
    expect(computeUsedNewsSourceContext(null, false, false)).toBe("News item bulunamadı");
  });

  it("returns 'News item bulunamadı' when newsItemId is undefined", () => {
    expect(computeUsedNewsSourceContext(undefined, true, true)).toBe("News item bulunamadı");
  });

  it("returns 'News item bulunamadı' when newsItemId is empty string", () => {
    expect(computeUsedNewsSourceContext("", false, false)).toBe("News item bulunamadı");
  });

  it("returns 'Scan kökenli' when has scan reference", () => {
    expect(computeUsedNewsSourceContext("item-1", false, true)).toBe("Scan kökenli");
  });

  it("returns 'Scan kökenli' when has both source and scan reference (scan wins)", () => {
    expect(computeUsedNewsSourceContext("item-1", true, true)).toBe("Scan kökenli");
  });

  it("returns 'Kaynaklı' when has source but no scan reference", () => {
    expect(computeUsedNewsSourceContext("item-1", true, false)).toBe("Kaynaklı");
  });

  it("returns 'Kaynak yok' when news item exists but source and scan are both false", () => {
    expect(computeUsedNewsSourceContext("item-1", false, false)).toBe("Kaynak yok");
  });

  it("returns 'Belirsiz' when source is null and scan is null", () => {
    expect(computeUsedNewsSourceContext("item-1", null, null)).toBe("Belirsiz");
  });

  it("returns 'Belirsiz' when source is undefined and scan is undefined", () => {
    expect(computeUsedNewsSourceContext("item-1", undefined, undefined)).toBe("Belirsiz");
  });

  it("returns 'Kaynaklı' when source is true and scan is null", () => {
    expect(computeUsedNewsSourceContext("item-1", true, null)).toBe("Kaynaklı");
  });
});
