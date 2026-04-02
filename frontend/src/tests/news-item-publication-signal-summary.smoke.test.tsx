import { describe, it, expect } from "vitest";
import { computeNewsItemPublicationSignal } from "../components/news-items/NewsItemPublicationSignalSummary";

describe("computeNewsItemPublicationSignal smoke tests", () => {
  it("returns 'Hariç' when status is ignored", () => {
    expect(computeNewsItemPublicationSignal("ignored", 0, "Title", "Summary", "https://x.com")).toBe("Hariç");
  });

  it("returns 'Kullanıldı' when status is used", () => {
    expect(computeNewsItemPublicationSignal("used", 1, "Title", "Summary", "https://x.com")).toBe("Kullanıldı");
  });

  it("returns 'Kullanıldı' when used_news_count > 0", () => {
    expect(computeNewsItemPublicationSignal("new", 3, "Title", "Summary", "https://x.com")).toBe("Kullanıldı");
  });

  it("returns 'Yayına yakın' when reviewed + title+summary+url dolu", () => {
    expect(computeNewsItemPublicationSignal("reviewed", 0, "Title", "Summary", "https://x.com")).toBe("Yayına yakın");
  });

  it("returns 'Aday' when reviewed + summary eksik", () => {
    expect(computeNewsItemPublicationSignal("reviewed", 0, "Title", null, "https://x.com")).toBe("Aday");
  });

  it("returns 'Aday' when status=new + title+url dolu", () => {
    expect(computeNewsItemPublicationSignal("new", 0, "Title", null, "https://x.com")).toBe("Aday");
  });

  it("returns 'Aday' when status null + title+url dolu", () => {
    expect(computeNewsItemPublicationSignal(null, null, "Title", null, "https://x.com")).toBe("Aday");
  });

  it("returns 'Zayıf' when title missing", () => {
    expect(computeNewsItemPublicationSignal("new", 0, null, "Summary", "https://x.com")).toBe("Zayıf");
  });

  it("returns 'Zayıf' when url missing", () => {
    expect(computeNewsItemPublicationSignal("new", 0, "Title", "Summary", null)).toBe("Zayıf");
  });

  it("returns 'Zayıf' when title whitespace only", () => {
    expect(computeNewsItemPublicationSignal("new", 0, "   ", "Summary", "https://x.com")).toBe("Zayıf");
  });
});
