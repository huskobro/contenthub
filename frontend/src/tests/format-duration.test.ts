import { describe, it, expect } from "vitest";
import { formatDuration } from "../lib/formatDuration";

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(5)).toBe("5 sn");
    expect(formatDuration(59)).toBe("59 sn");
    expect(formatDuration(0)).toBe("0 sn");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(60)).toBe("1 dk");
    expect(formatDuration(65)).toBe("1 dk 5 sn");
    expect(formatDuration(125)).toBe("2 dk 5 sn");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3600)).toBe("1 sa");
    expect(formatDuration(3661)).toBe("1 sa 1 dk");
    expect(formatDuration(7320)).toBe("2 sa 2 dk");
  });

  it("returns fallback for null", () => {
    expect(formatDuration(null)).toBe("—");
  });

  it("returns fallback for undefined", () => {
    expect(formatDuration(undefined)).toBe("—");
  });

  it("returns fallback for negative values", () => {
    expect(formatDuration(-1)).toBe("—");
    expect(formatDuration(-100)).toBe("—");
  });

  it("returns fallback for NaN", () => {
    expect(formatDuration(NaN)).toBe("—");
  });
});
