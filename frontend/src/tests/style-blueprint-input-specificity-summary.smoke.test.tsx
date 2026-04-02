import { describe, it, expect } from "vitest";
import { computeStyleBlueprintInputSpecificity } from "../components/style-blueprints/StyleBlueprintInputSpecificitySummary";

describe("computeStyleBlueprintInputSpecificity smoke tests", () => {
  it("returns 'Genel giriş' when all null", () => {
    expect(computeStyleBlueprintInputSpecificity(null, null, null, null, null, null)).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when all empty strings", () => {
    expect(computeStyleBlueprintInputSpecificity("", "  ", "", "  ", "", "")).toBe("Genel giriş");
  });

  it("returns 'Kısmi özgüllük' when only visual_rules_json filled", () => {
    expect(computeStyleBlueprintInputSpecificity('{"color":"red"}', null, null, null, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when only motion_rules_json filled", () => {
    expect(computeStyleBlueprintInputSpecificity(null, '{"speed":"fast"}', null, null, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when only preview_strategy_json filled", () => {
    expect(computeStyleBlueprintInputSpecificity(null, null, null, null, null, '{"mode":"draft"}')).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when unparseable non-empty string in one field", () => {
    expect(computeStyleBlueprintInputSpecificity("not json", null, null, null, null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Belirgin giriş' when two fields filled", () => {
    expect(computeStyleBlueprintInputSpecificity('{"color":"red"}', '{"speed":"fast"}', null, null, null, null)).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when three fields filled", () => {
    expect(computeStyleBlueprintInputSpecificity('{"a":"1"}', null, '{"b":"2"}', null, '{"c":"3"}', null)).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when all six fields filled", () => {
    expect(computeStyleBlueprintInputSpecificity('{"a":"1"}', '{"b":"2"}', '{"c":"3"}', '{"d":"4"}', '{"e":"5"}', '{"f":"6"}')).toBe("Belirgin giriş");
  });

  it("returns 'Genel giriş' when all fields whitespace only", () => {
    expect(computeStyleBlueprintInputSpecificity("   ", "   ", "   ", "   ", "   ", "   ")).toBe("Genel giriş");
  });
});
