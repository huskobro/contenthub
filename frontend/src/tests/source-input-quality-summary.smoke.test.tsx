import { describe, it, expect } from "vitest";
import { computeSourceInputQuality } from "../components/sources/SourceInputQualitySummary";

describe("computeSourceInputQuality smoke tests", () => {
  it("returns 'Zayıf giriş' when rss type and feed_url null", () => {
    expect(computeSourceInputQuality("rss", "My Source", null, null, null, "tr")).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when manual_url type and base_url empty", () => {
    expect(computeSourceInputQuality("manual_url", "Source", null, "", null, "en")).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when api type and api_endpoint null", () => {
    expect(computeSourceInputQuality("api", "My API", null, null, null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when unknown type and all config null", () => {
    expect(computeSourceInputQuality(null, "Source", null, null, null, "tr")).toBe("Zayıf giriş");
  });

  it("returns 'Kısmi giriş' when rss with feed_url but no language", () => {
    expect(computeSourceInputQuality("rss", "My Source", null, "https://example.com/feed", null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when manual_url with base_url but no name", () => {
    expect(computeSourceInputQuality("manual_url", null, "https://example.com", null, null, "tr")).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when api with api_endpoint but no language", () => {
    expect(computeSourceInputQuality("api", "My API", null, null, "https://api.example.com", null)).toBe("Kısmi giriş");
  });

  it("returns 'Güçlü giriş' when rss with feed_url + name + language", () => {
    expect(computeSourceInputQuality("rss", "My RSS", null, "https://example.com/rss", null, "tr")).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when manual_url with base_url + name + language", () => {
    expect(computeSourceInputQuality("manual_url", "Site Source", "https://example.com", null, null, "en")).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when api with all fields present", () => {
    expect(computeSourceInputQuality("api", "News API", null, null, "https://api.example.com/v1", "tr")).toBe("Güçlü giriş");
  });
});
