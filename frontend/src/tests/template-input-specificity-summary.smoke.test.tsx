import { describe, it, expect } from "vitest";
import { computeTemplateInputSpecificity } from "../components/templates/TemplateInputSpecificitySummary";

describe("computeTemplateInputSpecificity smoke tests", () => {
  it("returns 'Genel giriş' when all null", () => {
    expect(computeTemplateInputSpecificity(null, null, null, null, null, null)).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when style type but style_profile_json is null", () => {
    expect(computeTemplateInputSpecificity("style", null, null, null, 2, "primary")).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when content type but content_rules_json is empty string", () => {
    expect(computeTemplateInputSpecificity("content", null, "  ", null, 1, "primary")).toBe("Genel giriş");
  });

  it("returns 'Kısmi özgüllük' when style type with unparseable style_profile_json", () => {
    expect(computeTemplateInputSpecificity("style", "not valid json", null, null, 2, "primary")).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when style type with 1-key JSON, no style link", () => {
    expect(computeTemplateInputSpecificity("style", '{"color":"red"}', null, null, 0, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when content type with 2-key JSON but no style link", () => {
    expect(computeTemplateInputSpecificity("content", null, '{"rule1":"val","rule2":"val"}', null, 0, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Belirgin giriş' when style type with 2-key JSON + style_link_count > 0", () => {
    expect(computeTemplateInputSpecificity("style", '{"color":"red","font":"sans"}', null, null, 1, null)).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when style type with 2-key JSON + primary_link_role", () => {
    expect(computeTemplateInputSpecificity("style", '{"color":"red","size":"large"}', null, null, 0, "primary")).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when publish type with 3-key JSON + style_link_count", () => {
    expect(computeTemplateInputSpecificity("publish", null, null, '{"a":"1","b":"2","c":"3"}', 2, "secondary")).toBe("Belirgin giriş");
  });

  it("returns 'Kısmi özgüllük' when 1-key JSON even with style link", () => {
    expect(computeTemplateInputSpecificity("style", '{"color":"red"}', null, null, 3, "primary")).toBe("Kısmi özgüllük");
  });
});
