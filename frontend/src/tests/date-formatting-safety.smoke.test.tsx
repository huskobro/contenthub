import { describe, it, expect } from "vitest";
import { formatDateTime, formatDateShort, formatDateISO, normalizeDateForInput } from "../lib/formatDate";

describe("formatDateTime", () => {
  it("returns fallback for null", () => {
    expect(formatDateTime(null, "—")).toBe("—");
  });
  it("returns fallback for undefined", () => {
    expect(formatDateTime(undefined)).toBe("—");
  });
  it("returns fallback for empty string", () => {
    expect(formatDateTime("", "fb")).toBe("fb");
  });
  it("returns fallback for invalid date", () => {
    expect(formatDateTime("not-a-date", "—")).toBe("—");
  });
  it("formats valid ISO string", () => {
    const result = formatDateTime("2026-04-03T14:30:00Z");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("formatDateShort", () => {
  it("returns fallback for null", () => {
    expect(formatDateShort(null)).toBe("—");
  });
  it("returns fallback for undefined", () => {
    expect(formatDateShort(undefined)).toBe("—");
  });
  it("returns fallback for empty string", () => {
    expect(formatDateShort("")).toBe("—");
  });
  it("returns fallback for invalid date", () => {
    expect(formatDateShort("garbage")).toBe("—");
  });
  it("formats valid ISO string", () => {
    const result = formatDateShort("2026-04-03T14:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("—");
  });
});

describe("formatDateISO", () => {
  it("returns fallback for null", () => {
    expect(formatDateISO(null)).toBe("—");
  });
  it("returns fallback for undefined", () => {
    expect(formatDateISO(undefined)).toBe("—");
  });
  it("returns fallback for empty string", () => {
    expect(formatDateISO("")).toBe("—");
  });
  it("returns short string as-is if < 19 chars", () => {
    expect(formatDateISO("2026-04-03")).toBe("2026-04-03");
  });
  it("formats full ISO to space-separated", () => {
    expect(formatDateISO("2026-04-03T14:30:00Z")).toBe("2026-04-03 14:30:00");
  });
});

describe("normalizeDateForInput", () => {
  it("returns empty string for null", () => {
    expect(normalizeDateForInput(null)).toBe("");
  });
  it("returns empty string for undefined", () => {
    expect(normalizeDateForInput(undefined)).toBe("");
  });
  it("returns empty string for empty string", () => {
    expect(normalizeDateForInput("")).toBe("");
  });
  it("truncates ISO to datetime-local format", () => {
    expect(normalizeDateForInput("2026-04-03T14:30:00Z")).toBe("2026-04-03T14:30");
  });
});
