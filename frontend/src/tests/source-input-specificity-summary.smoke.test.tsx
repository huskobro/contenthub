import { describe, it, expect } from "vitest";
import { computeSourceInputSpecificity } from "../components/sources/SourceInputSpecificitySummary";

describe("computeSourceInputSpecificity smoke tests", () => {
  it("returns 'Genel giriş' when all null", () => {
    expect(computeSourceInputSpecificity(null, null, null, null, null, null)).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when rss type but no feed_url", () => {
    expect(computeSourceInputSpecificity("rss", "My Source", null, null, null, "tr")).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when manual_url type but no base_url", () => {
    expect(computeSourceInputSpecificity("manual_url", "My Source", null, null, null, "tr")).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when api type but no api_endpoint", () => {
    expect(computeSourceInputSpecificity("api", "My Source", null, null, null, "tr")).toBe("Genel giriş");
  });

  it("returns 'Kısmi özgüllük' when rss with feed_url but no language", () => {
    expect(computeSourceInputSpecificity("rss", "My Source", null, "https://example.com/rss", null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when rss with feed_url but no name", () => {
    expect(computeSourceInputSpecificity("rss", null, null, "https://example.com/rss", null, "tr")).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when manual_url with base_url but missing language", () => {
    expect(computeSourceInputSpecificity("manual_url", "News Site", "https://example.com", null, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Belirgin giriş' when rss with feed_url + name + language", () => {
    expect(computeSourceInputSpecificity("rss", "Tech News", null, "https://feeds.example.com/rss", null, "tr")).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when api with api_endpoint + name + language", () => {
    expect(computeSourceInputSpecificity("api", "News API", null, null, "https://api.example.com/news", "en")).toBe("Belirgin giriş");
  });

  it("returns 'Kısmi özgüllük' when unknown type with some URL + name but no language", () => {
    expect(computeSourceInputSpecificity("unknown", "My Source", "https://example.com", null, null, null)).toBe("Kısmi özgüllük");
  });
});
