import { describe, it, expect } from "vitest";
import { computeTemplateTargetOutputConsistency } from "../components/templates/TemplateTargetOutputConsistencySummary";

describe("computeTemplateTargetOutputConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when all null", () => {
    expect(computeTemplateTargetOutputConsistency(null, null, null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when JSON empty and link count zero", () => {
    expect(computeTemplateTargetOutputConsistency("style", "  ", null, null, 0)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when style type has JSON but no link", () => {
    expect(computeTemplateTargetOutputConsistency("style", '{"color":"red"}', null, null, 0)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when content type has JSON but no link", () => {
    expect(computeTemplateTargetOutputConsistency("content", null, '{"rule":"val"}', null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when publish type has JSON but no link", () => {
    expect(computeTemplateTargetOutputConsistency("publish", null, null, '{"platform":"yt"}', 0)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when no JSON but link count > 0", () => {
    expect(computeTemplateTargetOutputConsistency("style", null, null, null, 2)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when unknown type with no JSON but link present", () => {
    expect(computeTemplateTargetOutputConsistency(null, null, null, null, 1)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when style type has JSON and link count > 0", () => {
    expect(computeTemplateTargetOutputConsistency("style", '{"color":"red"}', null, null, 1)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when content type has JSON and link count > 0", () => {
    expect(computeTemplateTargetOutputConsistency("content", null, '{"rule":"val"}', null, 3)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when unknown type with any JSON and link count > 0", () => {
    expect(computeTemplateTargetOutputConsistency(null, '{"a":"1"}', null, null, 2)).toBe("Dengeli");
  });
});
