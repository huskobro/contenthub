import { describe, it, expect } from "vitest";
import { computeTemplateInputQuality } from "../components/templates/TemplateInputQualitySummary";

describe("computeTemplateInputQuality smoke tests", () => {
  it("returns 'Zayıf giriş' when style type and style_profile_json null", () => {
    expect(computeTemplateInputQuality("style", null, null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when content type and content_rules_json empty string", () => {
    expect(computeTemplateInputQuality("content", null, "", null)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when style type and style_profile_json is empty object", () => {
    expect(computeTemplateInputQuality("style", "{}", null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Kısmi giriş' when style type and style_profile_json has 1 key", () => {
    expect(computeTemplateInputQuality("style", '{"font":"sans"}', null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when content type and content_rules_json unparseable but non-empty", () => {
    expect(computeTemplateInputQuality("content", null, "some rules text", null)).toBe("Kısmi giriş");
  });

  it("returns 'Güçlü giriş' when style type and style_profile_json has 2+ keys", () => {
    expect(computeTemplateInputQuality("style", '{"font":"sans","color":"blue"}', null, null)).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when content type and content_rules_json has 3 keys", () => {
    expect(computeTemplateInputQuality("content", null, '{"tone":"formal","length":500,"lang":"tr"}', null)).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when publish type and publish_profile_json has 2 keys", () => {
    expect(computeTemplateInputQuality("publish", null, null, '{"platform":"youtube","schedule":"auto"}')).toBe("Güçlü giriş");
  });

  it("returns 'Zayıf giriş' when unknown type and all json null", () => {
    expect(computeTemplateInputQuality("unknown", null, null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Güçlü giriş' when unknown type and fallback json has 2+ keys", () => {
    expect(computeTemplateInputQuality(null, null, '{"a":1,"b":2}', null)).toBe("Güçlü giriş");
  });
});
