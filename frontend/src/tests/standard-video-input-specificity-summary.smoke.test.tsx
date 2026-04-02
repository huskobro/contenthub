import { describe, it, expect } from "vitest";
import { computeStandardVideoInputSpecificity } from "../components/standard-video/StandardVideoInputSpecificitySummary";

describe("computeStandardVideoInputSpecificity smoke tests", () => {
  it("returns 'Genel giriş' when all null", () => {
    expect(computeStandardVideoInputSpecificity(null, null, null, null)).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when topic is empty string", () => {
    expect(computeStandardVideoInputSpecificity("", "A brief", 120, "tr")).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when topic is whitespace only", () => {
    expect(computeStandardVideoInputSpecificity("   ", "A brief", 120, "tr")).toBe("Genel giriş");
  });

  it("returns 'Kısmi özgüllük' when topic only, no other fields", () => {
    expect(computeStandardVideoInputSpecificity("Tech Overview", null, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when topic + brief but no duration or language", () => {
    expect(computeStandardVideoInputSpecificity("Tech Overview", "A detailed brief", null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when topic + duration but no brief or language", () => {
    expect(computeStandardVideoInputSpecificity("Tech Overview", null, 180, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when topic + brief + duration but no language", () => {
    expect(computeStandardVideoInputSpecificity("Tech Overview", "A brief", 120, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when topic + brief + language but duration is zero", () => {
    expect(computeStandardVideoInputSpecificity("Tech Overview", "A brief", 0, "tr")).toBe("Kısmi özgüllük");
  });

  it("returns 'Belirgin giriş' when topic + brief + duration + language all present", () => {
    expect(computeStandardVideoInputSpecificity("Tech Overview", "A detailed brief", 300, "tr")).toBe("Belirgin giriş");
  });

  it("returns 'Kısmi özgüllük' when topic + language only", () => {
    expect(computeStandardVideoInputSpecificity("Tech Overview", null, null, "en")).toBe("Kısmi özgüllük");
  });
});
