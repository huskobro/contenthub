import { describe, it, expect } from "vitest";
import { computeJobOutputRichness } from "../components/jobs/JobOutputRichnessSummary";

describe("computeJobOutputRichness smoke tests", () => {
  it("returns 'Sorunlu' when last_error is non-empty", () => {
    expect(computeJobOutputRichness("timeout error", '{"title":"x"}', "tmpl-1", "/ws/1")).toBe("Sorunlu");
  });

  it("returns 'Sorunlu' when last_error present even with rich context", () => {
    expect(computeJobOutputRichness("fail", null, null, null)).toBe("Sorunlu");
  });

  it("returns 'Zayıf bağlam' when all null", () => {
    expect(computeJobOutputRichness(null, null, null, null)).toBe("Zayıf bağlam");
  });

  it("returns 'Zayıf bağlam' when source_context empty and no refs", () => {
    expect(computeJobOutputRichness(null, "", null, null)).toBe("Zayıf bağlam");
  });

  it("returns 'Kısmi bağlam' when context has title but no refs", () => {
    expect(computeJobOutputRichness(null, '{"title":"news"}', null, null)).toBe("Kısmi bağlam");
  });

  it("returns 'Kısmi bağlam' when no context but has template_id", () => {
    expect(computeJobOutputRichness(null, null, "tmpl-1", null)).toBe("Kısmi bağlam");
  });

  it("returns 'Kısmi bağlam' when no context but has workspace_path", () => {
    expect(computeJobOutputRichness(null, null, null, "/workspace/job1")).toBe("Kısmi bağlam");
  });

  it("returns 'Zengin bağlam' when context has title + template_id present", () => {
    expect(computeJobOutputRichness(null, '{"title":"news"}', "tmpl-1", null)).toBe("Zengin bağlam");
  });

  it("returns 'Zengin bağlam' when context has name + workspace_path present", () => {
    expect(computeJobOutputRichness(null, '{"name":"bulletin"}', null, "/ws/1")).toBe("Zengin bağlam");
  });

  it("returns 'Kısmi bağlam' when context is invalid JSON but workspace present", () => {
    expect(computeJobOutputRichness(null, '{invalid', null, "/ws/1")).toBe("Kısmi bağlam");
  });
});
