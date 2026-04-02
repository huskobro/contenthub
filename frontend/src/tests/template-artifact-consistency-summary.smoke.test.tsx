import { describe, it, expect } from "vitest";
import { computeTemplateArtifactConsistency } from "../components/templates/TemplateArtifactConsistencySummary";

describe("computeTemplateArtifactConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when no JSON and no links", () => {
    expect(computeTemplateArtifactConsistency("style", null, null, null, 0)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when all null", () => {
    expect(computeTemplateArtifactConsistency(null, null, null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when style type has style JSON but no links", () => {
    expect(computeTemplateArtifactConsistency("style", '{"key":"val"}', null, null, 0)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when content type has content JSON but no links", () => {
    expect(computeTemplateArtifactConsistency("content", null, '{"rules":[]}', null, 0)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when no JSON but has links", () => {
    expect(computeTemplateArtifactConsistency("style", null, null, null, 2)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when style type has JSON and links", () => {
    expect(computeTemplateArtifactConsistency("style", '{"key":"val"}', null, null, 1)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when content type has JSON and links", () => {
    expect(computeTemplateArtifactConsistency("content", null, '{"rules":[]}', null, 3)).toBe("Dengeli");
  });

  it("returns 'Artifacts yok' when style type has whitespace-only JSON and no links", () => {
    expect(computeTemplateArtifactConsistency("style", "   ", null, null, 0)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when unknown type and any JSON present but no links", () => {
    expect(computeTemplateArtifactConsistency(null, null, null, '{"pub":true}', 0)).toBe("Tek taraflı");
  });

  it("returns 'Dengeli' when publish type has publish JSON and links", () => {
    expect(computeTemplateArtifactConsistency("publish", null, null, '{"pub":true}', 2)).toBe("Dengeli");
  });
});
