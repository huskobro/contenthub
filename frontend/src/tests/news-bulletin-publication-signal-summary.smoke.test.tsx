import { describe, it, expect } from "vitest";
import { computeNewsBulletinPublicationSignal } from "../components/news-bulletin/NewsBulletinPublicationSignalSummary";

describe("computeNewsBulletinPublicationSignal smoke tests", () => {
  it("returns 'Başlangıç' when no content, no script, no metadata", () => {
    expect(computeNewsBulletinPublicationSignal(0, false, false, 0)).toBe("Başlangıç");
  });

  it("returns 'Başlangıç' when all null", () => {
    expect(computeNewsBulletinPublicationSignal(null, null, null, null)).toBe("Başlangıç");
  });

  it("returns 'İçerik toplandı' when news selected but no script", () => {
    expect(computeNewsBulletinPublicationSignal(3, false, false, 0)).toBe("İçerik toplandı");
  });

  it("returns 'İçerik toplandı' when news selected, script null", () => {
    expect(computeNewsBulletinPublicationSignal(5, null, null, 0)).toBe("İçerik toplandı");
  });

  it("returns 'Taslak hazır' when script present but no metadata", () => {
    expect(computeNewsBulletinPublicationSignal(3, true, false, 0)).toBe("Taslak hazır");
  });

  it("returns 'Taslak hazır' when script present, metadata null", () => {
    expect(computeNewsBulletinPublicationSignal(3, true, null, 0)).toBe("Taslak hazır");
  });

  it("returns 'Yayına yakın' when script + metadata + no warnings", () => {
    expect(computeNewsBulletinPublicationSignal(3, true, true, 0)).toBe("Yayına yakın");
  });

  it("returns 'Yayına yakın' when script + metadata + warnings null", () => {
    expect(computeNewsBulletinPublicationSignal(3, true, true, null)).toBe("Yayına yakın");
  });

  it("returns 'Kontrol gerekli' when script + metadata + warnings > 0", () => {
    expect(computeNewsBulletinPublicationSignal(3, true, true, 2)).toBe("Kontrol gerekli");
  });

  it("returns 'Taslak hazır' when script=true, metadata=false, warnings=1", () => {
    expect(computeNewsBulletinPublicationSignal(3, true, false, 1)).toBe("Taslak hazır");
  });
});
