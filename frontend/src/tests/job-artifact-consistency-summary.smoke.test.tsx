import { describe, it, expect } from "vitest";
import { computeJobArtifactConsistency } from "../components/jobs/JobArtifactConsistencySummary";

describe("computeJobArtifactConsistency smoke tests", () => {
  it("returns 'Artifacts yok' when all null and status null", () => {
    expect(computeJobArtifactConsistency(null, null, null, null, null)).toBe("Artifacts yok");
  });

  it("returns 'Artifacts yok' when all empty string and status queued-like", () => {
    expect(computeJobArtifactConsistency("", "", "", "pending", null)).toBe("Artifacts yok");
  });

  it("returns 'Tek taraflı' when source_context_json present but no output signal", () => {
    expect(computeJobArtifactConsistency('{"topic":"news"}', null, null, "pending", null)).toBe(
      "Tek taraflı"
    );
  });

  it("returns 'Tek taraflı' when template_id present but status pending and no step", () => {
    expect(computeJobArtifactConsistency(null, "tpl-abc", null, "pending", null)).toBe(
      "Tek taraflı"
    );
  });

  it("returns 'Tek taraflı' when workspace_path present but no output signal", () => {
    expect(computeJobArtifactConsistency(null, null, "/workspace/job-1", null, null)).toBe(
      "Tek taraflı"
    );
  });

  it("returns 'Tutarsız' when no context but status is running", () => {
    expect(computeJobArtifactConsistency(null, null, null, "running", null)).toBe("Tutarsız");
  });

  it("returns 'Tutarsız' when no context but current_step_key present", () => {
    expect(computeJobArtifactConsistency(null, null, null, null, "script_step")).toBe("Tutarsız");
  });

  it("returns 'Dengeli' when source_context_json and status completed", () => {
    expect(
      computeJobArtifactConsistency('{"topic":"x"}', null, null, "completed", null)
    ).toBe("Dengeli");
  });

  it("returns 'Dengeli' when template_id and workspace_path and current_step_key", () => {
    expect(
      computeJobArtifactConsistency(null, "tpl-1", "/workspace/j", null, "render_step")
    ).toBe("Dengeli");
  });

  it("returns 'Dengeli' when all context fields and status done", () => {
    expect(
      computeJobArtifactConsistency('{"x":1}', "tpl-2", "/ws/j2", "done", "final_step")
    ).toBe("Dengeli");
  });
});
