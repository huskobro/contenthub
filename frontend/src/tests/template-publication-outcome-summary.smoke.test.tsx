import { describe, it, expect } from "vitest";
import { computeTemplatePublicationOutcome } from "../components/templates/TemplatePublicationOutcomeSummary";

describe("computeTemplatePublicationOutcome smoke tests", () => {
  it("returns 'Hazırlanıyor' when all null", () => {
    expect(computeTemplatePublicationOutcome(null, null, null, null, null, null)).toBe("Hazırlanıyor");
  });

  it("returns 'Hazırlanıyor' when style type but style_profile_json empty", () => {
    expect(computeTemplatePublicationOutcome("style", "  ", null, null, 0, "active")).toBe("Hazırlanıyor");
  });

  it("returns 'Hazırlanıyor' when content type but content_rules_json null", () => {
    expect(computeTemplatePublicationOutcome("content", null, null, null, 2, "active")).toBe("Hazırlanıyor");
  });

  it("returns 'Ham çıktı' when style type with style_profile_json but no links", () => {
    expect(computeTemplatePublicationOutcome("style", '{"color":"red"}', null, null, 0, "active")).toBe("Ham çıktı");
  });

  it("returns 'Ham çıktı' when content type with content_rules_json but style_link_count null", () => {
    expect(computeTemplatePublicationOutcome("content", null, '{"tone":"formal"}', null, null, "active")).toBe("Ham çıktı");
  });

  it("returns 'Aday çıktı' when style type with json + links but status draft", () => {
    expect(computeTemplatePublicationOutcome("style", '{"color":"blue"}', null, null, 1, "draft")).toBe("Aday çıktı");
  });

  it("returns 'Aday çıktı' when publish type with json + links but status inactive", () => {
    expect(computeTemplatePublicationOutcome("publish", null, null, '{"platform":"yt"}', 3, "inactive")).toBe("Aday çıktı");
  });

  it("returns 'Yayına yakın çıktı' when style type with json + links + active", () => {
    expect(computeTemplatePublicationOutcome("style", '{"color":"green"}', null, null, 2, "active")).toBe("Yayına yakın çıktı");
  });

  it("returns 'Yayına yakın çıktı' when content type with json + links + active", () => {
    expect(computeTemplatePublicationOutcome("content", null, '{"tone":"casual"}', null, 1, "active")).toBe("Yayına yakın çıktı");
  });

  it("returns 'Ham çıktı' for unknown type when first available json present but no links", () => {
    expect(computeTemplatePublicationOutcome(null, null, '{"rules":"yes"}', null, 0, "active")).toBe("Ham çıktı");
  });
});
