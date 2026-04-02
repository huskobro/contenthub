import { describe, it, expect } from "vitest";
import { computeNewsBulletinInputSpecificity } from "../components/news-bulletin/NewsBulletinInputSpecificitySummary";

describe("computeNewsBulletinInputSpecificity smoke tests", () => {
  it("returns 'Genel giriş' when all null", () => {
    expect(computeNewsBulletinInputSpecificity(null, null, null, null, null, null)).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when title and topic both empty strings", () => {
    expect(computeNewsBulletinInputSpecificity("", "  ", 5, 3, "tr", "breaking")).toBe("Genel giriş");
  });

  it("returns 'Kısmi özgüllük' when only title present, no selected news", () => {
    expect(computeNewsBulletinInputSpecificity("Daily Bulletin", null, 0, null, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when only topic present, no selected news", () => {
    expect(computeNewsBulletinInputSpecificity(null, "Sports", null, null, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when title+topic present but selected news is zero", () => {
    expect(computeNewsBulletinInputSpecificity("News", "Politics", 0, 0, "tr", "standard")).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when title+selected news but no coverage or helpers", () => {
    expect(computeNewsBulletinInputSpecificity("Daily News", null, 3, 0, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Belirgin giriş' when title+selected news+source coverage", () => {
    expect(computeNewsBulletinInputSpecificity("Daily News", null, 3, 2, null, null)).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when topic+selected news+language", () => {
    expect(computeNewsBulletinInputSpecificity(null, "Tech", 5, 0, "tr", null)).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when title+selected news+bulletin_style", () => {
    expect(computeNewsBulletinInputSpecificity("News", null, 2, 0, null, "breaking")).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when all fields present", () => {
    expect(computeNewsBulletinInputSpecificity("Daily Bulletin", "Politics", 5, 3, "tr", "standard")).toBe("Belirgin giriş");
  });
});
