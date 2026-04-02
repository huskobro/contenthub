import { describe, it, expect } from "vitest";
import { computeUsedNewsPublicationLinkage } from "../components/used-news/UsedNewsPublicationLinkageSummary";

describe("computeUsedNewsPublicationLinkage smoke tests", () => {
  it("returns 'Bağ eksik' when target_entity_id is null", () => {
    expect(computeUsedNewsPublicationLinkage("draft", null)).toBe("Bağ eksik");
  });

  it("returns 'Bağ eksik' when target_entity_id is empty string", () => {
    expect(computeUsedNewsPublicationLinkage("published", "")).toBe("Bağ eksik");
  });

  it("returns 'Bağ eksik' when usage_type is null and target missing", () => {
    expect(computeUsedNewsPublicationLinkage(null, null)).toBe("Bağ eksik");
  });

  it("returns 'Belirsiz' when usage_type is null but target present", () => {
    expect(computeUsedNewsPublicationLinkage(null, "entity-1")).toBe("Belirsiz");
  });

  it("returns 'Taslağa bağlı' when usage_type contains draft and target present", () => {
    expect(computeUsedNewsPublicationLinkage("draft", "entity-1")).toBe("Taslağa bağlı");
  });

  it("returns 'Taslağa bağlı' when usage_type is draft_use and target present", () => {
    expect(computeUsedNewsPublicationLinkage("draft_use", "entity-42")).toBe("Taslağa bağlı");
  });

  it("returns 'Planlandı' when usage_type contains scheduled and target present", () => {
    expect(computeUsedNewsPublicationLinkage("scheduled", "entity-1")).toBe("Planlandı");
  });

  it("returns 'Yayınlandı' when usage_type contains published and target present", () => {
    expect(computeUsedNewsPublicationLinkage("published", "entity-1")).toBe("Yayınlandı");
  });

  it("returns 'Yayınlandı' when usage_type is published_video and target present", () => {
    expect(computeUsedNewsPublicationLinkage("published_video", "entity-99")).toBe("Yayınlandı");
  });

  it("returns 'Belirsiz' when usage_type is unknown and target present", () => {
    expect(computeUsedNewsPublicationLinkage("used_in_module", "entity-1")).toBe("Belirsiz");
  });
});
