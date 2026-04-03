import { describe, it, expect } from "vitest";
import { safeJsonPretty, validateJson } from "../lib/safeJson";
import { render, screen } from "@testing-library/react";
import { JsonPreviewField } from "../components/shared/JsonPreviewField";

describe("safeJsonPretty", () => {
  it("returns fallback for null", () => {
    expect(safeJsonPretty(null)).toBe("—");
  });
  it("returns fallback for undefined", () => {
    expect(safeJsonPretty(undefined)).toBe("—");
  });
  it("returns fallback for empty string", () => {
    expect(safeJsonPretty("")).toBe("—");
  });
  it("returns custom fallback", () => {
    expect(safeJsonPretty(null, "N/A")).toBe("N/A");
  });
  it("pretty-prints valid JSON object", () => {
    expect(safeJsonPretty('{"a":1}')).toBe('{\n  "a": 1\n}');
  });
  it("pretty-prints valid JSON array", () => {
    expect(safeJsonPretty("[1,2,3]")).toBe('[\n  1,\n  2,\n  3\n]');
  });
  it("returns raw value for invalid JSON", () => {
    expect(safeJsonPretty("not json")).toBe("not json");
  });
  it("returns raw value for partial JSON", () => {
    expect(safeJsonPretty("{broken")).toBe("{broken");
  });
});

describe("validateJson", () => {
  it("returns null for empty string (valid — optional field)", () => {
    expect(validateJson("")).toBeNull();
  });
  it("returns null for whitespace-only string", () => {
    expect(validateJson("   ")).toBeNull();
  });
  it("returns null for valid JSON object", () => {
    expect(validateJson('{"a":1}')).toBeNull();
  });
  it("returns null for valid JSON array", () => {
    expect(validateJson("[1,2]")).toBeNull();
  });
  it("returns error for invalid JSON", () => {
    expect(validateJson("{bad}")).toBe("Geçersiz JSON");
  });
});

describe("JsonPreviewField", () => {
  it("renders fallback for null value", () => {
    render(<JsonPreviewField label="Test" value={null} />);
    expect(screen.getByText("—")).toBeTruthy();
  });
  it("renders fallback for undefined value", () => {
    render(<JsonPreviewField label="Test" value={undefined} />);
    expect(screen.getByText("—")).toBeTruthy();
  });
  it("renders fallback for empty string value", () => {
    render(<JsonPreviewField label="Test" value="" />);
    expect(screen.getByText("—")).toBeTruthy();
  });
  it("renders pretty-printed valid JSON", () => {
    render(<JsonPreviewField label="Test" value='{"a":1}' />);
    const pre = document.querySelector("pre");
    expect(pre).toBeTruthy();
    expect(pre!.textContent).toContain('"a": 1');
  });
  it("renders raw value for invalid JSON without crashing", () => {
    render(<JsonPreviewField label="Test" value="not json" />);
    const pre = document.querySelector("pre");
    expect(pre).toBeTruthy();
    expect(pre!.textContent).toBe("not json");
  });
  it("renders label", () => {
    render(<JsonPreviewField label="MyLabel" value='{"x":1}' />);
    expect(screen.getByText("MyLabel")).toBeTruthy();
  });
});
