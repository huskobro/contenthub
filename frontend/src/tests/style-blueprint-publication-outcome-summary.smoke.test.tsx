import { describe, it, expect } from "vitest";
import { computeStyleBlueprintPublicationOutcome } from "../components/style-blueprints/StyleBlueprintPublicationOutcomeSummary";

describe("computeStyleBlueprintPublicationOutcome smoke tests", () => {
  it("returns 'Hazırlanıyor' when all null", () => {
    expect(computeStyleBlueprintPublicationOutcome(null, null, null, null, null, null, null)).toBe("Hazırlanıyor");
  });

  it("returns 'Hazırlanıyor' when all empty strings", () => {
    expect(computeStyleBlueprintPublicationOutcome("  ", "", null, null, null, "  ", "active")).toBe("Hazırlanıyor");
  });

  it("returns 'Ham çıktı' when visual rules present but no preview", () => {
    expect(computeStyleBlueprintPublicationOutcome('{"color":"red"}', null, null, null, null, null, "active")).toBe("Ham çıktı");
  });

  it("returns 'Ham çıktı' when motion rules present but no preview", () => {
    expect(computeStyleBlueprintPublicationOutcome(null, '{"speed":"slow"}', null, null, null, null, "active")).toBe("Ham çıktı");
  });

  it("returns 'Ham çıktı' when layout rules present but no preview", () => {
    expect(computeStyleBlueprintPublicationOutcome(null, null, '{"grid":"2col"}', null, null, null, "draft")).toBe("Ham çıktı");
  });

  it("returns 'Ham çıktı' when subtitle and thumbnail rules present but no preview", () => {
    expect(computeStyleBlueprintPublicationOutcome(null, null, null, '{"font":"bold"}', '{"ratio":"16:9"}', null, "active")).toBe("Ham çıktı");
  });

  it("returns 'Aday çıktı' when rules + preview but status draft", () => {
    expect(computeStyleBlueprintPublicationOutcome('{"color":"blue"}', null, null, null, null, '{"type":"card"}', "draft")).toBe("Aday çıktı");
  });

  it("returns 'Aday çıktı' when rules + preview but status inactive", () => {
    expect(computeStyleBlueprintPublicationOutcome(null, '{"speed":"fast"}', null, null, null, '{"type":"mock"}', "inactive")).toBe("Aday çıktı");
  });

  it("returns 'Yayına yakın çıktı' when rules + preview + status active", () => {
    expect(computeStyleBlueprintPublicationOutcome('{"color":"green"}', null, null, null, null, '{"type":"full"}', "active")).toBe("Yayına yakın çıktı");
  });

  it("returns 'Yayına yakın çıktı' when all rules + preview + active", () => {
    expect(computeStyleBlueprintPublicationOutcome(
      '{"color":"blue"}', '{"speed":"slow"}', '{"grid":"3col"}', '{"font":"light"}', '{"ratio":"9:16"}',
      '{"type":"full"}', "active"
    )).toBe("Yayına yakın çıktı");
  });
});
