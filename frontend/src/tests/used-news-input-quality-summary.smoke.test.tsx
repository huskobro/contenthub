import { describe, it, expect } from "vitest";
import { computeUsedNewsInputQuality } from "../components/used-news/UsedNewsInputQualitySummary";

describe("computeUsedNewsInputQuality smoke tests", () => {
  it("returns 'Zayıf giriş' when news_item_id is null", () => {
    expect(computeUsedNewsInputQuality(null, "published", "news_bulletin", "abc", "some context", null)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when usage_type is null", () => {
    expect(computeUsedNewsInputQuality("item-1", null, "news_bulletin", "abc", null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when news_item_id is whitespace", () => {
    expect(computeUsedNewsInputQuality("   ", "published", "news_bulletin", "abc", null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when usage_type is whitespace", () => {
    expect(computeUsedNewsInputQuality("item-1", "  ", "news_bulletin", "abc", null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Kısmi giriş' when news_item_id + usage_type present but target_module missing", () => {
    expect(computeUsedNewsInputQuality("item-1", "published", null, "abc", null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when news_item_id + usage_type present but target_entity_id missing", () => {
    expect(computeUsedNewsInputQuality("item-1", "published", "news_bulletin", null, null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when base + target present but no helper fields", () => {
    expect(computeUsedNewsInputQuality("item-1", "published", "news_bulletin", "abc", null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Güçlü giriş' when base + target + usage_context", () => {
    expect(computeUsedNewsInputQuality("item-1", "published", "news_bulletin", "abc", "morning edition", null)).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when base + target + notes", () => {
    expect(computeUsedNewsInputQuality("item-1", "published", "news_bulletin", "abc", null, "approved by editor")).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when all fields present", () => {
    expect(computeUsedNewsInputQuality("item-1", "published", "news_bulletin", "abc", "context", "note")).toBe("Güçlü giriş");
  });
});
