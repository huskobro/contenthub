// @ts-nocheck — structural guard test that reads source files via Node fs
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf-8");
}

// ─── safeNumber helper exists ──────────────────────────────────

describe("safeNumber helper", () => {
  it("safeNumber.ts exists in lib/", () => {
    const src = read("lib/safeNumber.ts");
    expect(src).toContain("safeNumber");
    expect(src).toContain("isNaN");
    expect(src).toContain("isFinite");
  });
});

// ─── Summary count display guards ─────────────────────────────

describe("Summary numeric display guards", () => {
  const cases: Array<{ file: string; guards: string[] }> = [
    {
      file: "components/source-scans/SourceScanExecutionSummary.tsx",
      guards: ["isFinite(resultCount)"],
    },
    {
      file: "components/news-bulletin/NewsBulletinReadinessSummary.tsx",
      guards: ["safeNumber(", "isFinite(raw)"],
    },
    {
      file: "components/news-items/NewsItemReadinessSummary.tsx",
      guards: ["safeNumber(", "isFinite(raw)"],
    },
    {
      file: "components/sources/SourceReadinessSummary.tsx",
      guards: ["safeNumber(", "isFinite(raw)"],
    },
    {
      file: "components/jobs/JobActionabilitySummary.tsx",
      guards: ["isFinite(retryCount)"],
    },
    {
      file: "components/templates/TemplateReadinessSummary.tsx",
      guards: ["safeNumber(", "isFinite(raw)"],
    },
    {
      file: "components/news-bulletin/NewsBulletinSourceCoverageSummary.tsx",
      guards: ["safeNumber(", "isFinite(selectedNewsSourceCount)"],
    },
  ];

  for (const { file, guards } of cases) {
    it(`${path.basename(file)} has numeric guard`, () => {
      const src = read(file);
      const hasGuard = guards.some(g => src.includes(g));
      expect(hasGuard, `${file} missing numeric guard (expected one of: ${guards.join(", ")})`).toBe(true);
    });
  }
});

// ─── Version interpolation safety in tables ────────────────────

describe("Version interpolation safety in tables", () => {
  it("TemplatesTable uses safe version interpolation", () => {
    const src = read("components/templates/TemplatesTable.tsx");
    expect(src.includes("isFinite(t.version)") || src.includes("safeNumber(t.version,")).toBe(true);
  });

  it("StyleBlueprintsTable uses safe version interpolation", () => {
    const src = read("components/style-blueprints/StyleBlueprintsTable.tsx");
    expect(src.includes("isFinite(bp.version)") || src.includes("safeNumber(bp.version,")).toBe(true);
  });
});

// ─── Number() conversion guards in detail panels ──────────────

describe("Number() conversion guards in detail panels", () => {
  const detailCases: Array<{ file: string; guards: string[] }> = [
    {
      file: "components/source-scans/SourceScanDetailPanel.tsx",
      guards: ["isNaN(n)", "isFinite(n)"],
    },
    {
      file: "components/news-bulletin/NewsBulletinDetailPanel.tsx",
      guards: ["isNaN(n)", "isFinite(n)"],
    },
    {
      file: "components/news-bulletin/NewsBulletinSelectedItemsPanel.tsx",
      guards: ["isNaN(n)", "isFinite(n)"],
    },
    {
      file: "components/style-blueprints/StyleBlueprintDetailPanel.tsx",
      guards: ["isNaN(n)", "isFinite(n)"],
    },
    {
      file: "components/templates/TemplateDetailPanel.tsx",
      guards: ["isNaN(n)", "isFinite(n)"],
    },
  ];

  for (const { file, guards } of detailCases) {
    for (const guard of guards) {
      it(`${path.basename(file)} has Number() guard: ${guard}`, () => {
        const src = read(file);
        expect(
          src.includes(guard),
          `${file} missing Number() conversion guard: ${guard}`
        ).toBe(true);
      });
    }
  }
});

// ─── Form validation includes isFinite ─────────────────────────

describe("Form validation includes isFinite guard", () => {
  const formCases: Array<{ file: string }> = [
    { file: "components/standard-video/StandardVideoForm.tsx" },
    { file: "components/templates/TemplateForm.tsx" },
    { file: "components/style-blueprints/StyleBlueprintForm.tsx" },
    { file: "components/news-bulletin/NewsBulletinSelectedItemForm.tsx" },
    { file: "components/news-bulletin/NewsBulletinForm.tsx" },
    { file: "components/source-scans/SourceScanForm.tsx" },
  ];

  for (const { file } of formCases) {
    it(`${path.basename(file)} validates with isFinite`, () => {
      const src = read(file);
      expect(
        src.includes("isFinite"),
        `${file} missing isFinite in numeric validation`
      ).toBe(true);
    });
  }
});

// ─── No bare NaN/Infinity leak in summary interpolation ───────

describe("No bare numeric interpolation without guard in summaries", () => {
  const summaryFiles = [
    "components/source-scans/SourceScanExecutionSummary.tsx",
    "components/news-bulletin/NewsBulletinReadinessSummary.tsx",
    "components/news-items/NewsItemReadinessSummary.tsx",
    "components/sources/SourceReadinessSummary.tsx",
    "components/jobs/JobActionabilitySummary.tsx",
    "components/templates/TemplateReadinessSummary.tsx",
    "components/news-bulletin/NewsBulletinSourceCoverageSummary.tsx",
  ];

  for (const file of summaryFiles) {
    it(`${path.basename(file)} has isFinite or isNaN guard`, () => {
      const src = read(file);
      expect(
        src.includes("isFinite") || src.includes("isNaN") || src.includes("safeNumber("),
        `${file} lacks numeric safety guards`
      ).toBe(true);
    });
  }
});
