import { describe, it, expect } from "vitest";
import { computeStyleBlueprintPublicationSignal } from "../components/style-blueprints/StyleBlueprintPublicationSignalSummary";

describe("computeStyleBlueprintPublicationSignal smoke tests", () => {
  it("returns 'Başlangıç' when all fields null and draft", () => {
    expect(computeStyleBlueprintPublicationSignal("draft", null, null, null, null, null, null)).toBe("Başlangıç");
  });

  it("returns 'Kısmen hazır' when all fields null but status active", () => {
    expect(computeStyleBlueprintPublicationSignal("active", null, null, null, null, null, null)).toBe("Kısmen hazır");
  });

  it("returns 'Taslak' when exactly 1 field filled", () => {
    expect(computeStyleBlueprintPublicationSignal("draft", '{"color":"red"}', null, null, null, null, null)).toBe("Taslak");
  });

  it("returns 'Kısmen hazır' when 2 fields filled", () => {
    expect(computeStyleBlueprintPublicationSignal("draft", '{"a":1}', '{"b":2}', null, null, null, null)).toBe("Kısmen hazır");
  });

  it("returns 'Kısmen hazır' when 3 fields filled but not active", () => {
    expect(computeStyleBlueprintPublicationSignal("draft", '{"a":1}', '{"b":2}', '{"c":3}', null, null, null)).toBe("Kısmen hazır");
  });

  it("returns 'Yayına yakın' when 3 fields filled and active", () => {
    expect(computeStyleBlueprintPublicationSignal("active", '{"a":1}', '{"b":2}', '{"c":3}', null, null, null)).toBe("Yayına yakın");
  });

  it("returns 'Yayına yakın' when all 6 fields filled and active", () => {
    expect(computeStyleBlueprintPublicationSignal("active", '{"a":1}', '{"b":2}', '{"c":3}', '{"d":4}', '{"e":5}', '{"f":6}')).toBe("Yayına yakın");
  });

  it("returns 'Kısmen hazır' when 4 fields filled but draft", () => {
    expect(computeStyleBlueprintPublicationSignal("draft", '{"a":1}', '{"b":2}', '{"c":3}', '{"d":4}', null, null)).toBe("Kısmen hazır");
  });

  it("returns 'Başlangıç' when whitespace fields treated as empty", () => {
    expect(computeStyleBlueprintPublicationSignal("draft", "   ", "  ", null, null, null, null)).toBe("Başlangıç");
  });

  it("returns 'Taslak' when 1 real field and others whitespace", () => {
    expect(computeStyleBlueprintPublicationSignal("draft", '{"a":1}', "  ", null, null, null, null)).toBe("Taslak");
  });
});
