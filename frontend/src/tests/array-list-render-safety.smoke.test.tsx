// @ts-nocheck — structural guard test that reads source files via Node fs
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf-8");
}

// ─── Array.isArray guards on steps arrays ──────────────────────

describe("Steps array safety guards", () => {
  it("JobTimelinePanel uses Array.isArray guard on steps", () => {
    const src = read("components/jobs/JobTimelinePanel.tsx");
    expect(src).toContain("Array.isArray(steps)");
  });

  it("JobTimelinePanel maps over safeSteps not raw steps", () => {
    const src = read("components/jobs/JobTimelinePanel.tsx");
    expect(src).toContain("safeSteps.map(");
    expect(src).toContain("safeSteps.length");
  });

  it("JobStepsList uses Array.isArray guard on steps", () => {
    const src = read("components/jobs/JobStepsList.tsx");
    expect(src).toContain("Array.isArray(steps)");
  });

  it("JobStepsList maps over safeSteps not raw steps", () => {
    const src = read("components/jobs/JobStepsList.tsx");
    expect(src).toContain("safeSteps.map(");
    expect(src).toContain("safeSteps.length");
  });
});

// ─── NewsBulletinSelectedItemsPanel has items guard ────────────

describe("Selected items panel array safety", () => {
  it("NewsBulletinSelectedItemsPanel guards items before .map()", () => {
    const src = read("components/news-bulletin/NewsBulletinSelectedItemsPanel.tsx");
    // Must have !items || items.length === 0 or similar guard before .map()
    expect(src).toContain("!items");
  });
});

// ─── parseTags returns safe array ──────────────────────────────

describe("Tag parsing returns safe array", () => {
  it("StandardVideoMetadataPanel parseTags returns [] for null", () => {
    const src = read("components/standard-video/StandardVideoMetadataPanel.tsx");
    expect(src).toContain('if (!raw) return [];');
  });

  it("StandardVideoMetadataPanel parseTags uses Array.isArray", () => {
    const src = read("components/standard-video/StandardVideoMetadataPanel.tsx");
    expect(src).toContain("Array.isArray(parsed)");
  });
});

// ─── JSON.parse + Object.keys has null guard ───────────────────

describe("JSON.parse + Object.keys has null safety", () => {
  const cases: Array<{ file: string; guard: string }> = [
    {
      file: "components/jobs/JobOutputRichnessSummary.tsx",
      guard: "parsed === null",
    },
    {
      file: "components/jobs/JobTargetOutputConsistencySummary.tsx",
      guard: "parsed !== null",
    },
    {
      file: "components/jobs/JobInputSpecificitySummary.tsx",
      guard: "parsed !== null",
    },
    {
      file: "components/jobs/JobPublicationYieldSummary.tsx",
      guard: "parsed !== null",
    },
    {
      file: "components/jobs/JobPublicationOutcomeSummary.tsx",
      guard: "obj === null",
    },
  ];

  for (const { file, guard } of cases) {
    it(`${path.basename(file)} guards Object.keys with: ${guard}`, () => {
      const src = read(file);
      expect(src).toContain(guard);
    });
  }
});

// ─── No bare .map() on unguarded props in panels ──────────────

describe("No bare .map() on unguarded array props", () => {
  const panelFiles = [
    "components/jobs/JobTimelinePanel.tsx",
    "components/jobs/JobStepsList.tsx",
    "components/news-bulletin/NewsBulletinSelectedItemsPanel.tsx",
  ];

  for (const file of panelFiles) {
    it(`${path.basename(file)} does not call .map() on raw unguarded prop`, () => {
      const src = read(file);
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("//") || line.startsWith("import")) continue;
        // Check for steps.map( without safe prefix
        if (/\bsteps\.map\(/.test(line)) {
          throw new Error(
            `${file}:${i + 1} has bare steps.map() without Array.isArray guard: ${line}`
          );
        }
      }
    });
  }
});
