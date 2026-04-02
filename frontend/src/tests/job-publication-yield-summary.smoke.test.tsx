import { describe, it, expect } from "vitest";
import { computeJobPublicationYield } from "../components/jobs/JobPublicationYieldSummary";

describe("computeJobPublicationYield smoke tests", () => {
  it("returns 'Sorunlu' when status is failed", () => {
    expect(computeJobPublicationYield("failed", '{"topic":"news"}', "tmpl-1", "/ws", "step", null)).toBe("Sorunlu");
  });

  it("returns 'Sorunlu' when last_error is present", () => {
    expect(computeJobPublicationYield("completed", null, null, null, null, "render failed")).toBe("Sorunlu");
  });

  it("returns 'Hazırlanıyor' when queued and no context", () => {
    expect(computeJobPublicationYield("queued", null, null, null, null, null)).toBe("Hazırlanıyor");
  });

  it("returns 'Hazırlanıyor' when running and no context/step", () => {
    expect(computeJobPublicationYield("running", null, null, null, null, null)).toBe("Hazırlanıyor");
  });

  it("returns 'Ham çıktı' when context present but not completed", () => {
    expect(computeJobPublicationYield("in_progress", '{"topic":"news"}', null, null, null, null)).toBe("Ham çıktı");
  });

  it("returns 'Ham çıktı' when step present but not completed", () => {
    expect(computeJobPublicationYield("running", null, null, null, "tts_step", null)).toBe("Ham çıktı");
  });

  it("returns 'Aday çıktı' when completed + context but no template/workspace", () => {
    expect(computeJobPublicationYield("completed", '{"topic":"news"}', null, null, null, null)).toBe("Aday çıktı");
  });

  it("returns 'Yayına yakın çıktı' when completed + context + template_id", () => {
    expect(computeJobPublicationYield("completed", '{"topic":"news"}', "tmpl-1", null, null, null)).toBe("Yayına yakın çıktı");
  });

  it("returns 'Yayına yakın çıktı' when completed + context + workspace_path", () => {
    expect(computeJobPublicationYield("done", '{"topic":"news"}', null, "/ws/job-1", null, null)).toBe("Yayına yakın çıktı");
  });

  it("returns 'Belirsiz' when all null", () => {
    expect(computeJobPublicationYield(null, null, null, null, null, null)).toBe("Belirsiz");
  });
});
