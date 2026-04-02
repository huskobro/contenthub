import { describe, it, expect } from "vitest";
import { computeNewsBulletinSelectedNewsQuality } from "../components/news-bulletin/NewsBulletinSelectedNewsQualitySummary";

describe("computeNewsBulletinSelectedNewsQuality smoke tests", () => {
  it("returns 'Bilinmiyor' when selectedNewsCount is null", () => {
    expect(computeNewsBulletinSelectedNewsQuality(null, 0, 0, 0)).toBe("Bilinmiyor");
  });

  it("returns 'Bilinmiyor' when selectedNewsCount is undefined", () => {
    expect(computeNewsBulletinSelectedNewsQuality(undefined, 0, 0, 0)).toBe("Bilinmiyor");
  });

  it("returns 'İçerik yok' when selectedNewsCount is 0", () => {
    expect(computeNewsBulletinSelectedNewsQuality(0, 0, 0, 0)).toBe("İçerik yok");
  });

  it("returns 'Güçlü set' when complete count is dominant", () => {
    expect(computeNewsBulletinSelectedNewsQuality(4, 3, 1, 0)).toBe("Güçlü set");
  });

  it("returns 'Güçlü set' when all items are complete", () => {
    expect(computeNewsBulletinSelectedNewsQuality(3, 3, 0, 0)).toBe("Güçlü set");
  });

  it("returns 'Zayıf set' when weak count is dominant", () => {
    expect(computeNewsBulletinSelectedNewsQuality(4, 0, 1, 3)).toBe("Zayıf set");
  });

  it("returns 'Zayıf set' when all items are weak", () => {
    expect(computeNewsBulletinSelectedNewsQuality(2, 0, 0, 2)).toBe("Zayıf set");
  });

  it("returns 'Kısmi set' when partial count is dominant", () => {
    expect(computeNewsBulletinSelectedNewsQuality(5, 1, 3, 1)).toBe("Kısmi set");
  });

  it("returns 'Bilinmiyor' when counts are all null but selectedNewsCount > 0", () => {
    expect(computeNewsBulletinSelectedNewsQuality(2, null, null, null)).toBe("Bilinmiyor");
  });

  it("returns 'İçerik yok' when selectedNewsCount is 0 regardless of counts", () => {
    expect(computeNewsBulletinSelectedNewsQuality(0, 5, 5, 5)).toBe("İçerik yok");
  });
});
