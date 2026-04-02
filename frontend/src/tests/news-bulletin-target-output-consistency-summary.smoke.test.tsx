import { describe, it, expect } from "vitest";
import { computeNewsBulletinTargetOutputConsistency } from "../components/news-bulletin/NewsBulletinTargetOutputConsistencySummary";

describe("computeNewsBulletinTargetOutputConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when all null", () => {
    expect(computeNewsBulletinTargetOutputConsistency(null, null, null, null, null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when all empty and no artifacts", () => {
    expect(computeNewsBulletinTargetOutputConsistency("  ", "  ", 0, null, null, false, false)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when title present but no artifacts", () => {
    expect(computeNewsBulletinTargetOutputConsistency("Daily News", null, null, null, null, false, false)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when topic present but no artifacts", () => {
    expect(computeNewsBulletinTargetOutputConsistency(null, "Tech News", null, null, null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when selected_news_count > 0 but no artifacts", () => {
    expect(computeNewsBulletinTargetOutputConsistency(null, null, 5, null, null, false, false)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when language and bulletin_style present but no artifacts", () => {
    expect(computeNewsBulletinTargetOutputConsistency(null, null, null, "tr", "formal", false, false)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when no input but has_script is true", () => {
    expect(computeNewsBulletinTargetOutputConsistency(null, null, 0, null, null, true, false)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when all input empty but has_metadata is true", () => {
    expect(computeNewsBulletinTargetOutputConsistency("  ", "  ", null, null, null, false, true)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when topic present and has_script is true", () => {
    expect(computeNewsBulletinTargetOutputConsistency(null, "World News", null, null, null, true, false)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when all input fields and both artifacts present", () => {
    expect(computeNewsBulletinTargetOutputConsistency("Evening Bulletin", "Politics", 8, "en", "standard", true, true)).toBe("Dengeli");
  });
});
