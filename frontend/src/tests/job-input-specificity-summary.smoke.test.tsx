import { describe, it, expect } from "vitest";
import { computeJobInputSpecificity } from "../components/jobs/JobInputSpecificitySummary";

describe("computeJobInputSpecificity smoke tests", () => {
  it("returns 'Genel giriş' when all null", () => {
    expect(computeJobInputSpecificity(null, null, null)).toBe("Genel giriş");
  });

  it("returns 'Genel giriş' when all empty strings", () => {
    expect(computeJobInputSpecificity("", "  ", "")).toBe("Genel giriş");
  });

  it("returns 'Kısmi özgüllük' when unparseable non-empty context", () => {
    expect(computeJobInputSpecificity("not valid json", null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when only template_id present", () => {
    expect(computeJobInputSpecificity(null, "tmpl-1", null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when only workspace_path present", () => {
    expect(computeJobInputSpecificity(null, null, "/ws/job-1")).toBe("Kısmi özgüllük");
  });

  it("returns 'Kısmi özgüllük' when anlamlı context but no template/workspace", () => {
    expect(computeJobInputSpecificity('{"topic":"news"}', null, null)).toBe("Kısmi özgüllük");
  });

  it("returns 'Belirgin giriş' when anlamlı context + template_id", () => {
    expect(computeJobInputSpecificity('{"topic":"news"}', "tmpl-1", null)).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when anlamlı context + workspace_path", () => {
    expect(computeJobInputSpecificity('{"topic":"news"}', null, "/ws/job-1")).toBe("Belirgin giriş");
  });

  it("returns 'Belirgin giriş' when all three present", () => {
    expect(computeJobInputSpecificity('{"title":"Daily News","items":["a","b"]}', "tmpl-1", "/ws/job-1")).toBe("Belirgin giriş");
  });

  it("returns 'Genel giriş' when context is whitespace only", () => {
    expect(computeJobInputSpecificity("   ", null, null)).toBe("Genel giriş");
  });
});
