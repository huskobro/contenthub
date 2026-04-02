import { describe, it, expect } from "vitest";
import { computeUsedNewsInputSpecificity } from "../components/used-news/UsedNewsInputSpecificitySummary";

describe("computeUsedNewsInputSpecificity smoke tests", () => {
  it("returns 'Genel giriş' when all null", () => {
    expect(computeUsedNewsInputSpecificity(null, null, null, null, null, null)).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when news_item_id missing", () => {
    expect(computeUsedNewsInputSpecificity(null, "primary", "job", "job-1", "context", "note")).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when usage_type missing", () => {
    expect(computeUsedNewsInputSpecificity("news-1", null, "job", "job-1", "context", "note")).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when both news_item_id and usage_type empty strings", () => {
    expect(computeUsedNewsInputSpecificity("  ", "", "job", "job-1", "context", "note")).toBe("Genel giriş");
  });

  it("returns 'Kısmi özgüllük' when news_item_id+usage_type but target_module missing", () => {
    expect(computeUsedNewsInputSpecificity("news-1", "primary", null, "job-1", null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when news_item_id+usage_type but target_entity_id missing", () => {
    expect(computeUsedNewsInputSpecificity("news-1", "primary", "job", null, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when all four core fields present but no usage_context or notes", () => {
    expect(computeUsedNewsInputSpecificity("news-1", "primary", "job", "job-1", null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Belirgin giriş' when all four + usage_context present", () => {
    expect(computeUsedNewsInputSpecificity("news-1", "primary", "job", "job-1", "breaking context", null)).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when all four + notes present", () => {
    expect(computeUsedNewsInputSpecificity("news-1", "primary", "job", "job-1", null, "some notes")).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when all fields present", () => {
    expect(computeUsedNewsInputSpecificity("news-1", "primary", "job", "job-1", "context detail", "extra notes")).toBe("Belirgin giriş");
  });
});
