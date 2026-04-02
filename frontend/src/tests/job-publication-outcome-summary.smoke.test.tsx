import { describe, it, expect } from "vitest";
import { computeJobPublicationOutcome } from "../components/jobs/JobPublicationOutcomeSummary";

const RICH_CONTEXT = JSON.stringify({ title: "Test Video", topic: "news" });
const EMPTY_CONTEXT = null;

describe("computeJobPublicationOutcome smoke tests", () => {
  it("returns 'Sorunlu' when status is failed", () => {
    expect(computeJobPublicationOutcome("failed", null, RICH_CONTEXT, "tmpl-1", "/ws")).toBe("Sorunlu");
  });

  it("returns 'Sorunlu' when last_error is non-empty", () => {
    expect(computeJobPublicationOutcome("completed", "Some error", RICH_CONTEXT, "tmpl-1", "/ws")).toBe("Sorunlu");
  });

  it("returns 'Hazırlanıyor' when status is queued", () => {
    expect(computeJobPublicationOutcome("queued", null, EMPTY_CONTEXT, null, null)).toBe("Hazırlanıyor");
  });

  it("returns 'Hazırlanıyor' when status is running", () => {
    expect(computeJobPublicationOutcome("running", null, EMPTY_CONTEXT, null, null)).toBe("Hazırlanıyor");
  });

  it("returns 'Hazırlanıyor' when status is in_progress", () => {
    expect(computeJobPublicationOutcome("in_progress", null, EMPTY_CONTEXT, null, null)).toBe("Hazırlanıyor");
  });

  it("returns 'Yayına yakın çıktı' when completed with rich context and refs", () => {
    expect(computeJobPublicationOutcome("completed", null, RICH_CONTEXT, "tmpl-1", "/ws")).toBe("Yayına yakın çıktı");
  });

  it("returns 'Taslak çıktı' when completed but no context or refs", () => {
    expect(computeJobPublicationOutcome("completed", null, EMPTY_CONTEXT, null, null)).toBe("Taslak çıktı");
  });

  it("returns 'Taslak çıktı' when completed with context but no template or workspace", () => {
    expect(computeJobPublicationOutcome("completed", null, RICH_CONTEXT, null, null)).toBe("Taslak çıktı");
  });

  it("returns 'Belirsiz' when status is null", () => {
    expect(computeJobPublicationOutcome(null, null, EMPTY_CONTEXT, null, null)).toBe("Belirsiz");
  });

  it("returns 'Belirsiz' when status is unknown string", () => {
    expect(computeJobPublicationOutcome("draft", null, EMPTY_CONTEXT, null, null)).toBe("Belirsiz");
  });
});
