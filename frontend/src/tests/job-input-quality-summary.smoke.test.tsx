import { describe, it, expect } from "vitest";
import { computeJobInputQuality } from "../components/jobs/JobInputQualitySummary";

describe("computeJobInputQuality smoke tests", () => {
  it("returns 'Zayıf giriş' when all null", () => {
    expect(computeJobInputQuality(null, null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when all undefined", () => {
    expect(computeJobInputQuality(undefined, undefined, undefined)).toBe("Zayıf giriş");
  });

  it("returns 'Zayıf giriş' when context whitespace and no template or workspace", () => {
    expect(computeJobInputQuality("   ", null, null)).toBe("Zayıf giriş");
  });

  it("returns 'Kısmi giriş' when only template_id present, no context", () => {
    expect(computeJobInputQuality(null, "tpl-1", null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when only workspace_path present, no context", () => {
    expect(computeJobInputQuality(null, null, "/workspace/job-1")).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when meaningful context but no template or workspace", () => {
    expect(computeJobInputQuality('{"topic":"news"}', null, null)).toBe("Kısmi giriş");
  });

  it("returns 'Kısmi giriş' when unparseable non-empty context with template", () => {
    expect(computeJobInputQuality("some context text", "tpl-1", null)).toBe("Kısmi giriş");
  });

  it("returns 'Güçlü giriş' when meaningful context + template_id", () => {
    expect(computeJobInputQuality('{"topic":"x"}', "tpl-1", null)).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when meaningful context + workspace_path", () => {
    expect(computeJobInputQuality('{"title":"My Job"}', null, "/workspace/j1")).toBe("Güçlü giriş");
  });

  it("returns 'Güçlü giriş' when all three fields present", () => {
    expect(computeJobInputQuality('{"a":1,"b":2}', "tpl-2", "/workspace/j2")).toBe("Güçlü giriş");
  });
});
