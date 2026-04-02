import { describe, it, expect } from "vitest";
import { computeStandardVideoPublicationSignal } from "../components/standard-video/StandardVideoPublicationSignalSummary";

describe("computeStandardVideoPublicationSignal smoke tests", () => {
  it("returns 'Başlangıç' when topic is null", () => {
    expect(computeStandardVideoPublicationSignal(null, false, false)).toBe("Başlangıç");
  });

  it("returns 'Başlangıç' when topic is empty string", () => {
    expect(computeStandardVideoPublicationSignal("", false, false)).toBe("Başlangıç");
  });

  it("returns 'Başlangıç' when topic is whitespace", () => {
    expect(computeStandardVideoPublicationSignal("   ", false, false)).toBe("Başlangıç");
  });

  it("returns 'Taslak' when topic present but no script", () => {
    expect(computeStandardVideoPublicationSignal("Breaking News", false, false)).toBe("Taslak");
  });

  it("returns 'Taslak' when topic present, script null", () => {
    expect(computeStandardVideoPublicationSignal("Breaking News", null, null)).toBe("Taslak");
  });

  it("returns 'Taslak hazır' when topic + script but no metadata", () => {
    expect(computeStandardVideoPublicationSignal("Breaking News", true, false)).toBe("Taslak hazır");
  });

  it("returns 'Taslak hazır' when topic + script, metadata null", () => {
    expect(computeStandardVideoPublicationSignal("Breaking News", true, null)).toBe("Taslak hazır");
  });

  it("returns 'Yayına yakın' when topic + script + metadata", () => {
    expect(computeStandardVideoPublicationSignal("Breaking News", true, true)).toBe("Yayına yakın");
  });

  it("returns 'Başlangıç' when topic undefined", () => {
    expect(computeStandardVideoPublicationSignal(undefined, true, true)).toBe("Başlangıç");
  });

  it("returns 'Yayına yakın' with full topic and all present", () => {
    expect(computeStandardVideoPublicationSignal("Tech Review", true, true)).toBe("Yayına yakın");
  });
});
