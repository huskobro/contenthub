// @ts-nocheck — structural guard test that reads source files via Node fs
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf-8");
}

// ─── isBlank helper exists ───────────────────────────────────────

describe("isBlank shared helper", () => {
  it("isBlank.ts exists with correct signature", () => {
    const src = read("lib/isBlank.ts");
    expect(src).toContain("export function isBlank");
    expect(src).toContain("string | null | undefined");
    expect(src).toContain(".trim()");
  });
});

// ─── Detail panel Field components use isBlank ───────────────────

describe("Detail panel Field whitespace safety", () => {
  const fieldPanels = [
    { file: "components/news-items/NewsItemDetailPanel.tsx", pattern: "isBlank" },
    { file: "components/templates/TemplateDetailPanel.tsx", pattern: "isBlank" },
    { file: "components/sources/SourceDetailPanel.tsx", pattern: "isBlank" },
    { file: "components/source-scans/SourceScanDetailPanel.tsx", pattern: "isBlank" },
  ];

  for (const { file, pattern } of fieldPanels) {
    it(`${path.basename(file)} imports isBlank`, () => {
      const src = read(file);
      expect(src).toContain('import { isBlank }');
    });

    it(`${path.basename(file)} Field component uses isBlank for whitespace check`, () => {
      const src = read(file);
      expect(src).toContain(pattern);
    });
  }
});

// ─── Overview panel Row uses isBlank ──────────────────────────────

describe("Overview panel Row whitespace safety", () => {
  it("StandardVideoOverviewPanel imports isBlank", () => {
    const src = read("components/standard-video/StandardVideoOverviewPanel.tsx");
    expect(src).toContain('import { isBlank }');
  });

  it("StandardVideoOverviewPanel Row uses isBlank", () => {
    const src = read("components/standard-video/StandardVideoOverviewPanel.tsx");
    expect(src).toContain("isBlank(value)");
  });
});

// ─── Conditional notes render uses isBlank ────────────────────────

describe("Conditional notes/summary render uses isBlank", () => {
  const notesFiles = [
    { file: "components/news-items/NewsItemDetailPanel.tsx", field: "data.summary" },
    { file: "components/standard-video/StandardVideoScriptPanel.tsx", field: "script.notes" },
    { file: "components/standard-video/StandardVideoMetadataPanel.tsx", field: "metadata.notes" },
    { file: "components/news-bulletin/NewsBulletinScriptPanel.tsx", field: "script.notes" },
    { file: "components/news-bulletin/NewsBulletinMetadataPanel.tsx", field: "metadata.notes" },
    { file: "components/sources/SourceDetailPanel.tsx", field: "source.notes" },
    { file: "components/source-scans/SourceScanDetailPanel.tsx", field: "scan.notes" },
  ];

  for (const { file, field } of notesFiles) {
    it(`${path.basename(file)} uses !isBlank(${field}) instead of ${field} &&`, () => {
      const src = read(file);
      expect(src).toContain(`!isBlank(${field})`);
      // Should NOT have bare truthiness check for this field as conditional render
      const bareCheck = `{${field} && (`;
      expect(src).not.toContain(bareCheck);
    });
  }
});

// ─── Script content display uses isBlank ──────────────────────────

describe("Script content display whitespace safety", () => {
  const scriptContentFiles = [
    "components/standard-video/StandardVideoScriptPanel.tsx",
    "components/news-bulletin/NewsBulletinScriptPanel.tsx",
    "components/standard-video/StandardVideoArtifactsPanel.tsx",
  ];

  for (const file of scriptContentFiles) {
    it(`${path.basename(file)} checks isBlank(script.content) before render`, () => {
      const src = read(file);
      expect(src).toContain("isBlank(script.content)");
    });
  }
});

// ─── No bare .notes && conditional in panels ──────────────────────

describe("No bare .notes && conditional in panels", () => {
  const panelFiles = [
    "components/standard-video/StandardVideoScriptPanel.tsx",
    "components/standard-video/StandardVideoMetadataPanel.tsx",
    "components/news-bulletin/NewsBulletinScriptPanel.tsx",
    "components/news-bulletin/NewsBulletinMetadataPanel.tsx",
    "components/sources/SourceDetailPanel.tsx",
    "components/source-scans/SourceScanDetailPanel.tsx",
  ];

  for (const file of panelFiles) {
    it(`${path.basename(file)} does not use bare .notes && for conditional render`, () => {
      const src = read(file);
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("//") || line.startsWith("import")) continue;
        // Check for patterns like {script.notes && ( or {metadata.notes && ( or {scan.notes && (
        if (/\{(?:script|metadata|scan|source|data)\.notes\s*&&\s*\(/.test(line)) {
          throw new Error(
            `${file}:${i + 1} has bare .notes && conditional without isBlank guard: ${line}`
          );
        }
      }
    });
  }
});
