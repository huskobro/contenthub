// @ts-nocheck — structural guard test that reads source files via Node fs
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Guard tests: ensure every Field / Row / inline value renderer
 * in detail panels, registry tables, and form error displays
 * includes overflow-protection CSS (wordBreak or overflowWrap).
 */

const SRC = path.resolve(__dirname, "..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf-8");
}

// ─── Detail Panel Field / Row components ────────────────────────

describe("Detail panel Field/Row overflow safety", () => {
  const panels = [
    "components/sources/SourceDetailPanel.tsx",
    "components/news-items/NewsItemDetailPanel.tsx",
    "components/used-news/UsedNewsDetailPanel.tsx",
    "components/templates/TemplateDetailPanel.tsx",
    "components/style-blueprints/StyleBlueprintDetailPanel.tsx",
    "components/news-bulletin/NewsBulletinDetailPanel.tsx",
    "components/template-style-links/TemplateStyleLinkDetailPanel.tsx",
    "components/source-scans/SourceScanDetailPanel.tsx",
  ];

  for (const panel of panels) {
    it(`${panel} Field has wordBreak/overflowWrap`, () => {
      const src = read(panel);
      // Find the Field component's value span — it should have overflow protection
      // We look for the pattern inside the function Field definition
      const fieldMatch = src.match(/function Field[\s\S]*?return[\s\S]*?<\/div>\s*\);?\s*\}/);
      expect(fieldMatch).toBeTruthy();
      const fieldCode = fieldMatch![0];
      expect(
        fieldCode.includes("wordBreak") || fieldCode.includes("overflowWrap") || fieldCode.includes("break-words") || fieldCode.includes("break-all") || fieldCode.includes("overflow-wrap")
      ).toBe(true);
    });
  }

  it("StandardVideoOverviewPanel Row has wordBreak/overflowWrap", () => {
    const src = read("components/standard-video/StandardVideoOverviewPanel.tsx");
    const rowMatch = src.match(/function Row[\s\S]*?return[\s\S]*?<\/tr>\s*\);?\s*\}/);
    expect(rowMatch).toBeTruthy();
    const rowCode = rowMatch![0];
    expect(
      rowCode.includes("wordBreak") || rowCode.includes("overflowWrap") || rowCode.includes("break-words") || rowCode.includes("break-all") || rowCode.includes("overflow-wrap")
    ).toBe(true);
  });
});

// ─── Inline text in panels ──────────────────────────────────────

describe("Inline text overflow safety", () => {
  it("JobTimelinePanel last_error has overflow protection", () => {
    const src = read("components/jobs/JobTimelinePanel.tsx");
    // Find the block containing s.last_error rendering (the div with the error text)
    const idx = src.indexOf("{s.last_error}");
    expect(idx).toBeGreaterThan(0);
    const block = src.slice(Math.max(0, idx - 200), idx + 50);
    expect(
      block.includes("wordBreak") || block.includes("overflowWrap") || block.includes("break-words") || block.includes("break-all") || block.includes("overflow-wrap")
    ).toBe(true);
  });

  it("StandardVideoMetadataPanel title td has overflow protection", () => {
    const src = read("components/standard-video/StandardVideoMetadataPanel.tsx");
    const idx = src.indexOf("metadata.title");
    expect(idx).toBeGreaterThan(0);
    const block = src.slice(Math.max(0, idx - 150), idx + 30);
    expect(
      block.includes("wordBreak") || block.includes("overflowWrap") || block.includes("break-words") || block.includes("break-all") || block.includes("overflow-wrap")
    ).toBe(true);
  });

  it("NewsBulletinSelectedItemsPanel selection_reason td has overflow protection", () => {
    const src = read("components/news-bulletin/NewsBulletinSelectedItemsPanel.tsx");
    // Find the td that renders selection_reason (the one with item.selection_reason)
    const line = src.split("\n").find((l) => l.includes("item.selection_reason"));
    expect(line).toBeTruthy();
    expect(
      line!.includes("wordBreak") || line!.includes("overflowWrap") || line!.includes("break-words") || line!.includes("break-all") || line!.includes("overflow-wrap")
    ).toBe(true);
  });

  it("NewsBulletinMetadataPanel title td has overflow protection", () => {
    const src = read("components/news-bulletin/NewsBulletinMetadataPanel.tsx");
    const line = src.split("\n").find((l) => l.includes("metadata.title") && l.includes("<td"));
    expect(line).toBeTruthy();
    // Accept inline styles or extracted const (WRAP_WORD)
    expect(
      line!.includes("wordBreak") || line!.includes("overflowWrap") || line!.includes("break-words") || line!.includes("break-all") || line!.includes("overflow-wrap") || line!.includes("WRAP_WORD") || line!.includes("word-break")
    ).toBe(true);
  });
});

// ─── Registry table td overflow ─────────────────────────────────

describe("Registry table td overflow safety", () => {
  it("SettingsTable key td has overflow protection", () => {
    const src = read("components/settings/SettingsTable.tsx");
    const line = src.split("\n").find((l) => l.includes("s.key"));
    expect(line).toBeTruthy();
    expect(line!.includes("wordBreak") || line!.includes("overflowWrap") || line!.includes("break-words") || line!.includes("break-all") || line!.includes("overflow-wrap")).toBe(true);
  });

  it("VisibilityRulesTable target_key td has overflow protection", () => {
    const src = read("components/visibility/VisibilityRulesTable.tsx");
    const line = src.split("\n").find((l) => l.includes("r.target_key"));
    expect(line).toBeTruthy();
    expect(line!.includes("wordBreak") || line!.includes("overflowWrap") || line!.includes("break-words") || line!.includes("break-all") || line!.includes("overflow-wrap")).toBe(true);
  });

  it("SourcesTable name td has overflow protection", () => {
    const src = read("components/sources/SourcesTable.tsx");
    // name td may span multiple lines — find the block around src.name
    const idx = src.indexOf("src.name");
    const block = src.slice(Math.max(0, idx - 200), idx);
    expect(block.includes("wordBreak") || block.includes("overflowWrap") || block.includes("break-words") || block.includes("break-all") || block.includes("overflow-wrap")).toBe(true);
  });

  it("TemplatesTable name td has overflow protection", () => {
    const src = read("components/templates/TemplatesTable.tsx");
    const idx = src.indexOf("t.name");
    const block = src.slice(Math.max(0, idx - 200), idx);
    expect(block.includes("wordBreak") || block.includes("overflowWrap") || block.includes("break-words") || block.includes("break-all") || block.includes("overflow-wrap")).toBe(true);
  });

  it("StandardVideosTable title td has overflow protection", () => {
    const src = read("components/standard-video/StandardVideosTable.tsx");
    const line = src.split("\n").find((l) => l.includes("v.title"));
    expect(line).toBeTruthy();
    expect(line!.includes("wordBreak") || line!.includes("overflowWrap") || line!.includes("break-words") || line!.includes("break-all") || line!.includes("overflow-wrap")).toBe(true);
  });

  it("StyleBlueprintsTable name td has overflow protection", () => {
    const src = read("components/style-blueprints/StyleBlueprintsTable.tsx");
    const idx = src.indexOf("bp.name");
    const block = src.slice(Math.max(0, idx - 200), idx);
    expect(block.includes("wordBreak") || block.includes("overflowWrap") || block.includes("break-words") || block.includes("break-all") || block.includes("overflow-wrap")).toBe(true);
  });

  it("NewsBulletinsTable title td has overflow protection", () => {
    const src = read("components/news-bulletin/NewsBulletinsTable.tsx");
    const line = src.split("\n").find((l) => l.includes("b.title"));
    expect(line).toBeTruthy();
    expect(line!.includes("wordBreak") || line!.includes("overflowWrap") || line!.includes("break-words") || line!.includes("break-all") || line!.includes("overflow-wrap")).toBe(true);
  });
});

// ─── Form submitError overflow ──────────────────────────────────

describe("Form submitError overflow safety", () => {
  const forms = [
    "components/templates/TemplateForm.tsx",
    "components/style-blueprints/StyleBlueprintForm.tsx",
    "components/template-style-links/TemplateStyleLinkForm.tsx",
    "components/source-scans/SourceScanForm.tsx",
    "components/news-items/NewsItemForm.tsx",
    "components/used-news/UsedNewsForm.tsx",
    "components/standard-video/StandardVideoForm.tsx",
    "components/standard-video/StandardVideoScriptForm.tsx",
    "components/standard-video/StandardVideoMetadataForm.tsx",
    "components/sources/SourceForm.tsx",
    "components/news-bulletin/NewsBulletinMetadataForm.tsx",
    "components/news-bulletin/NewsBulletinScriptForm.tsx",
    "components/news-bulletin/NewsBulletinSelectedItemForm.tsx",
    "components/news-bulletin/NewsBulletinForm.tsx",
  ];

  for (const form of forms) {
    it(`${form} error display has overflow protection`, () => {
      const src = read(form);
      // The error display block should include overflow protection.
      // Look for the block around submitError/localError/error rendering.
      const hasSubmitError = src.includes("{submitError}");
      const hasLocalError = src.includes("{localError}");
      const hasError = src.includes("{error}") && src.includes("color");

      expect(hasSubmitError || hasLocalError || hasError).toBe(true);

      // Check that the file as a whole includes overflow protection near the error render.
      // Some forms use a shared errorStyle const, others inline styles.
      const hasOverflow =
        (src.includes("wordBreak") && src.includes("overflowWrap")) ||
        (src.includes("errorStyle") && src.includes("wordBreak")) ||
        (src.includes("break-words") || src.includes("break-all") || src.includes("overflow-wrap") || src.includes("word-break"));
      expect(hasOverflow).toBe(true);
    });
  }
});
