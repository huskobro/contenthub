import { describe, it, expect } from "vitest";
import { computeStyleBlueprintInputQuality } from "../components/style-blueprints/StyleBlueprintInputQualitySummary";

describe("computeStyleBlueprintInputQuality smoke tests", () => {
  it("returns 'Zayıf giriş' when all null", () => {
    expect(computeStyleBlueprintInputQuality(null, null, null, null, null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when all undefined", () => {
    expect(computeStyleBlueprintInputQuality(undefined, undefined, undefined, undefined, undefined, undefined)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when all whitespace strings", () => {
    expect(computeStyleBlueprintInputQuality("  ", "  ", "  ", "  ", "  ", "  ")).toBe("Zayıf giriş");
  });

  it("returns 'Kısmi giriş' when only visual_rules_json present", () => {
    expect(computeStyleBlueprintInputQuality('{"color":"red"}', null, null, null, null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when only motion_rules_json present", () => {
    expect(computeStyleBlueprintInputQuality(null, '{"speed":"normal"}', null, null, null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when only preview_strategy_json present", () => {
    expect(computeStyleBlueprintInputQuality(null, null, null, null, null, '{"mode":"static"}')).toBe("Kısmi giriş");
  });

  it("returns 'Güçlü giriş' when 2 fields present", () => {
    expect(computeStyleBlueprintInputQuality('{"x":1}', '{"y":2}', null, null, null, null)).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when 3 fields present", () => {
    expect(computeStyleBlueprintInputQuality('{"x":1}', null, '{"z":3}', '{"s":4}', null, null)).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when all 6 fields present", () => {
    expect(computeStyleBlueprintInputQuality('{"a":1}', '{"b":2}', '{"c":3}', '{"d":4}', '{"e":5}', '{"f":6}')).toBe("Güçlü giriş");
  });

  it("returns 'Kısmi giriş' when only layout_rules_json has unparseable non-empty string", () => {
    expect(computeStyleBlueprintInputQuality(null, null, "some layout rules", null, null, null)).toBe("Kısmi giriş");
  });
});
