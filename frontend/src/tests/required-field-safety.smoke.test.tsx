// @ts-nocheck — structural guard test that reads source files via Node fs
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf-8");
}

// ─── Registry table required-field fallbacks ────────────────────

describe("Registry table required-field fallbacks", () => {
  const tableCases: Array<{ file: string; fields: string[] }> = [
    {
      file: "components/settings/SettingsTable.tsx",
      fields: ["s.key", "s.group_name", "s.type", "s.status", "s.version"],
    },
    {
      file: "components/visibility/VisibilityRulesTable.tsx",
      fields: ["r.rule_type", "r.target_key", "r.status", "r.priority"],
    },
    {
      file: "components/sources/SourcesTable.tsx",
      fields: ["src.name", "src.source_type", "src.status"],
    },
    {
      file: "components/standard-video/StandardVideosTable.tsx",
      fields: ["v.topic", "v.status"],
    },
    {
      file: "components/templates/TemplatesTable.tsx",
      fields: ["t.name", "t.template_type", "t.owner_scope", "t.status"],
    },
    {
      file: "components/style-blueprints/StyleBlueprintsTable.tsx",
      fields: ["bp.name", "bp.status"],
    },
    {
      file: "components/news-bulletin/NewsBulletinsTable.tsx",
      fields: ["b.topic", "b.status"],
    },
    {
      file: "components/news-bulletin/NewsItemPickerTable.tsx",
      fields: ["item.status"],
    },
    {
      file: "components/template-style-links/TemplateStyleLinksTable.tsx",
      fields: ["link.status"],
    },
  ];

  for (const { file, fields } of tableCases) {
    for (const field of fields) {
      it(`${path.basename(file)} has fallback for ${field}`, () => {
        const src = read(file);
        // Field should have ?? fallback (either "—" or a number like 0)
        const pattern = `${field} ??`;
        expect(
          src.includes(pattern),
          `${file} missing fallback for ${field}`
        ).toBe(true);
      });
    }
  }
});

// ─── Detail panel required-field fallbacks ──────────────────────

describe("Detail panel required-field fallbacks", () => {
  const detailCases: Array<{ file: string; fields: string[] }> = [
    {
      file: "components/settings/SettingDetailPanel.tsx",
      fields: ["data.key", "data.group_name", "data.type", "data.status", "data.version"],
    },
    {
      file: "components/visibility/VisibilityRuleDetailPanel.tsx",
      fields: ["data.rule_type", "data.target_key", "data.status", "data.priority"],
    },
  ];

  for (const { file, fields } of detailCases) {
    for (const field of fields) {
      it(`${path.basename(file)} has fallback for ${field}`, () => {
        const src = read(file);
        const pattern = `${field} ??`;
        expect(
          src.includes(pattern),
          `${file} missing fallback for ${field}`
        ).toBe(true);
      });
    }
  }
});

// ─── Version field numeric fallback ─────────────────────────────

describe("Version field numeric safety", () => {
  it("TemplatesTable version uses numeric fallback", () => {
    const src = read("components/templates/TemplatesTable.tsx");
    expect(src).toContain("t.version ?? 0");
  });

  it("StyleBlueprintsTable version uses numeric fallback", () => {
    const src = read("components/style-blueprints/StyleBlueprintsTable.tsx");
    expect(src).toContain("bp.version ?? 0");
  });
});

// ─── No bare required-field renders in tables ───────────────────

describe("No bare required-field renders in registry tables", () => {
  const tableFiles = [
    "components/settings/SettingsTable.tsx",
    "components/visibility/VisibilityRulesTable.tsx",
    "components/sources/SourcesTable.tsx",
    "components/standard-video/StandardVideosTable.tsx",
    "components/templates/TemplatesTable.tsx",
    "components/style-blueprints/StyleBlueprintsTable.tsx",
    "components/news-bulletin/NewsBulletinsTable.tsx",
  ];

  for (const file of tableFiles) {
    it(`${path.basename(file)} has no bare property renders in td`, () => {
      const src = read(file);
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments, imports
        if (line.trimStart().startsWith("//") || line.trimStart().startsWith("import")) continue;
        // Check for <td ...>{obj.prop}</td> without fallback — single-line pattern
        if (/<td[^>]*>\{[a-zA-Z]+\.[a-zA-Z_]+\}<\/td>/.test(line)) {
          throw new Error(
            `${file}:${i + 1} has bare property render without fallback: ${line.trim()}`
          );
        }
      }
    });
  }
});
