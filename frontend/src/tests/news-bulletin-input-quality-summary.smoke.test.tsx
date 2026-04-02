import { describe, it, expect } from "vitest";
import { computeNewsBulletinInputQuality } from "../components/news-bulletin/NewsBulletinInputQualitySummary";

describe("computeNewsBulletinInputQuality smoke tests", () => {
  it("returns 'Zayıf giriş' when title and topic both null", () => {
    expect(computeNewsBulletinInputQuality(null, null, 3, 2, "tr", "haber")).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when title and topic both whitespace", () => {
    expect(computeNewsBulletinInputQuality("  ", "  ", 3, 2, "tr", null)).toBe("Zayıf giriş");
  });

  it("returns 'Kısmi giriş' when topic present but selectedNewsCount 0", () => {
    expect(computeNewsBulletinInputQuality(null, "Ekonomi", 0, 0, null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when title present but selectedNewsCount null", () => {
    expect(computeNewsBulletinInputQuality("Bülten", null, null, null, null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when topic + news count > 0 but no extras", () => {
    expect(computeNewsBulletinInputQuality(null, "Ekonomi", 3, 0, null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Güçlü giriş' when topic + news count + language", () => {
    expect(computeNewsBulletinInputQuality(null, "Ekonomi", 3, 0, "tr", null)).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when topic + news count + bulletin_style", () => {
    expect(computeNewsBulletinInputQuality(null, "Spor", 2, 0, null, "formal")).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when topic + news count + source count > 0", () => {
    expect(computeNewsBulletinInputQuality(null, "Teknoloji", 5, 3, null, null)).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when title + topic + news + all extras", () => {
    expect(computeNewsBulletinInputQuality("Sabah Bülteni", "Gündem", 4, 2, "tr", "breaking")).toBe("Güçlü giriş");
  });

  it("returns 'Kısmi giriş' when only title present, no news", () => {
    expect(computeNewsBulletinInputQuality("Bülten Başlık", null, 0, null, "tr", "formal")).toBe("Kısmi giriş");
  });
});
