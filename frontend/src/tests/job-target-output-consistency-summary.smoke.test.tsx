import { describe, it, expect } from "vitest";
import { computeJobTargetOutputConsistency } from "../components/jobs/JobTargetOutputConsistencySummary";

describe("computeJobTargetOutputConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when no target and no output", () => {
    expect(computeJobTargetOutputConsistency(null, null, null, null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when empty strings everywhere", () => {
    expect(computeJobTargetOutputConsistency("", "  ", "", "  ", "", "")).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when template_id present but no output", () => {
    expect(computeJobTargetOutputConsistency(null, "tmpl-1", null, null, null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tek taraflı' when workspace_path present but status is queued", () => {
    expect(computeJobTargetOutputConsistency(null, null, "/ws/job-1", "queued", null, null)).toBe("Tek taraflı");
  });

  it("returns 'Tutarsız' when no target but status is running", () => {
    expect(computeJobTargetOutputConsistency(null, null, null, "running", null, null)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when no target but current_step_key present", () => {
    expect(computeJobTargetOutputConsistency(null, null, null, null, "tts_step", null)).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when source_context_json + status completed", () => {
    expect(computeJobTargetOutputConsistency('{"topic":"news"}', null, null, "completed", null, null)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when template_id + current_step_key present", () => {
    expect(computeJobTargetOutputConsistency(null, "tmpl-1", null, null, "render_step", null)).toBe("Dengeli");
  });

  it("returns 'Dengeli' when target + last_error present", () => {
    expect(computeJobTargetOutputConsistency(null, "tmpl-1", null, null, null, "render failed")).toBe("Dengeli");
  });

  it("returns 'Dengeli' when all fields present", () => {
    expect(computeJobTargetOutputConsistency('{"topic":"news"}', "tmpl-1", "/ws/job-1", "running", "tts_step", null)).toBe("Dengeli");
  });
});
