import { describe, it, expect } from "vitest";
import { computeTemplatePublicationSignal } from "../components/templates/TemplatePublicationSignalSummary";

describe("computeTemplatePublicationSignal smoke tests", () => {
  it("returns 'Başlangıç' when style template with no style_profile_json", () => {
    expect(computeTemplatePublicationSignal("style", "draft", null, null, null, 0)).toBe("Başlangıç");
  });

  it("returns 'Kısmen hazır' when active but main JSON empty", () => {
    expect(computeTemplatePublicationSignal("style", "active", null, null, null, 0)).toBe("Kısmen hazır");
  });

  it("returns 'Taslak' when style JSON present but no style links", () => {
    expect(computeTemplatePublicationSignal("style", "draft", '{"color":"red"}', null, null, 0)).toBe("Taslak");
  });

  it("returns 'Bağlandı' when style JSON + links + not active", () => {
    expect(computeTemplatePublicationSignal("style", "draft", '{"color":"red"}', null, null, 2)).toBe("Bağlandı");
  });

  it("returns 'Yayına yakın' when style JSON + links + active", () => {
    expect(computeTemplatePublicationSignal("style", "active", '{"color":"red"}', null, null, 2)).toBe("Yayına yakın");
  });

  it("returns 'Başlangıç' when content template with no content_rules_json", () => {
    expect(computeTemplatePublicationSignal("content", "draft", null, null, null, 0)).toBe("Başlangıç");
  });

  it("returns 'Taslak' when content JSON present but no links", () => {
    expect(computeTemplatePublicationSignal("content", "draft", null, '{"rules":[]}', null, 0)).toBe("Taslak");
  });

  it("returns 'Yayına yakın' when publish JSON + links + active", () => {
    expect(computeTemplatePublicationSignal("publish", "active", null, null, '{"platform":"yt"}', 1)).toBe("Yayına yakın");
  });

  it("returns 'Başlangıç' when unknown type and all null", () => {
    expect(computeTemplatePublicationSignal("custom", "draft", null, null, null, 0)).toBe("Başlangıç");
  });

  it("returns 'Taslak' when style_link_count null treated as 0", () => {
    expect(computeTemplatePublicationSignal("style", "draft", '{"color":"blue"}', null, null, null)).toBe("Taslak");
  });
});
