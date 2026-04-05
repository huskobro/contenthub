// @ts-nocheck — structural guard test that reads source files via Node fs
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf-8");
}

// ─── BoolBadge null/undefined guard in detail panels ──────────────

describe("BoolBadge null/undefined guard", () => {
  const files = [
    "components/settings/SettingDetailPanel.tsx",
    "components/visibility/VisibilityRuleDetailPanel.tsx",
  ];

  for (const file of files) {
    it(`${path.basename(file)} BoolBadge accepts null | undefined type`, () => {
      const src = read(file);
      expect(src).toContain("boolean | null | undefined");
    });

    it(`${path.basename(file)} BoolBadge guards null with == null`, () => {
      const src = read(file);
      expect(src).toContain("value == null");
    });

    it(`${path.basename(file)} BoolBadge renders neutral fallback for null`, () => {
      const src = read(file);
      // The null branch should have neutral background and "—" text
      expect(src).toContain('#f8fafc');
      expect(src).toContain('#475569');
    });
  }
});

// ─── StandardVideoArtifactSummary tristate guard ──────────────────

describe("StandardVideoArtifactSummary tristate boolean safety", () => {
  it("toStatus function checks == null for tristate", () => {
    const src = read("components/standard-video/StandardVideoArtifactSummary.tsx");
    expect(src).toContain("value == null");
  });

  it("toStatus returns Bilinmiyor for null", () => {
    const src = read("components/standard-video/StandardVideoArtifactSummary.tsx");
    expect(src).toContain('"Bilinmiyor"');
  });

  it("Props type accepts boolean | null", () => {
    const src = read("components/standard-video/StandardVideoArtifactSummary.tsx");
    expect(src).toContain("boolean | null");
  });
});

// ─── UsedNews boolean summary components use === true / === false ─

describe("UsedNews boolean summary strict equality", () => {
  it("UsedNewsTargetResolutionSummary uses === true for hasTargetResolved", () => {
    const src = read("components/used-news/UsedNewsTargetResolutionSummary.tsx");
    expect(src).toContain("hasTargetResolved === true");
  });

  it("UsedNewsTargetResolutionSummary uses === false for hasTargetResolved", () => {
    const src = read("components/used-news/UsedNewsTargetResolutionSummary.tsx");
    expect(src).toContain("hasTargetResolved === false");
  });

  it("UsedNewsTargetResolutionSummary falls back to Belirsiz", () => {
    const src = read("components/used-news/UsedNewsTargetResolutionSummary.tsx");
    expect(src).toContain('"Belirsiz"');
  });

  it("UsedNewsSourceContextSummary uses === false for explicit check", () => {
    const src = read("components/used-news/UsedNewsSourceContextSummary.tsx");
    expect(src).toContain("hasNewsItemSource === false");
    expect(src).toContain("hasNewsItemScanReference === false");
  });

  it("UsedNewsSourceContextSummary falls back to Belirsiz", () => {
    const src = read("components/used-news/UsedNewsSourceContextSummary.tsx");
    expect(src).toContain('"Belirsiz"');
  });
});

// ─── NewsBulletinEnforcementSummary null guard ────────────────────

describe("NewsBulletinEnforcementSummary boolean null safety", () => {
  it("checks selectedNewsCount == null before boolean logic", () => {
    const src = read("components/news-bulletin/NewsBulletinEnforcementSummary.tsx");
    expect(src).toContain("selectedNewsCount == null");
  });

  it("returns Bilinmiyor for null count", () => {
    const src = read("components/news-bulletin/NewsBulletinEnforcementSummary.tsx");
    expect(src).toContain('"Bilinmiyor"');
  });
});

// ─── NewsBulletinReadinessSummary boolean coalescing ──────────────

describe("NewsBulletinReadinessSummary boolean fallback", () => {
  it("coalesces hasScript with ?? false", () => {
    const src = read("components/news-bulletin/NewsBulletinReadinessSummary.tsx");
    expect(src).toContain("hasScript ?? false");
  });

  it("coalesces hasMetadata with ?? false", () => {
    const src = read("components/news-bulletin/NewsBulletinReadinessSummary.tsx");
    expect(src).toContain("hasMetadata ?? false");
  });
});

// ─── NewsBulletinArtifactSummary boolean coalescing ───────────────

describe("NewsBulletinArtifactSummary boolean fallback", () => {
  it("coalesces hasScript with ?? false", () => {
    const src = read("components/news-bulletin/NewsBulletinArtifactSummary.tsx");
    expect(src).toContain("hasScript ?? false");
  });

  it("coalesces hasMetadata with ?? false", () => {
    const src = read("components/news-bulletin/NewsBulletinArtifactSummary.tsx");
    expect(src).toContain("hasMetadata ?? false");
  });
});

// ─── NewsItemUsedNewsLinkageSummary boolean safety ────────────────

describe("NewsItemUsedNewsLinkageSummary boolean safety", () => {
  it("uses === true for hasPublishedUsedNewsLink", () => {
    const src = read("components/news-items/NewsItemUsedNewsLinkageSummary.tsx");
    expect(src).toContain("hasPublishedUsedNewsLink === true");
  });

  it("checks usageCount == null before boolean logic", () => {
    const src = read("components/news-items/NewsItemUsedNewsLinkageSummary.tsx");
    expect(src).toContain("usageCount == null");
  });
});

// ─── No raw boolean interpolation in detail panels ────────────────

describe("No raw boolean interpolation in detail panels", () => {
  const panelFiles = [
    "components/settings/SettingDetailPanel.tsx",
    "components/visibility/VisibilityRuleDetailPanel.tsx",
  ];

  for (const file of panelFiles) {
    it(`${path.basename(file)} does not interpolate boolean directly as text`, () => {
      const src = read(file);
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("//") || line.startsWith("import")) continue;
        // Raw boolean interpolation like {data.visible} without BoolBadge
        if (/\{data\.(user_override_allowed|visible_to_user|visible_in_wizard|read_only_for_user|visible|read_only|wizard_visible)\}/.test(line)) {
          // Should be wrapped in BoolBadge, not raw
          if (!line.includes("BoolBadge")) {
            throw new Error(
              `${file}:${i + 1} has raw boolean interpolation without BoolBadge: ${line}`
            );
          }
        }
      }
    });
  }
});

// ─── Checkbox inputs must use explicit checked={boolean} ─────────
// M10: EffectiveSettingsPanel uses a checkbox for wired-only filter.
// Guard: every checkbox must have explicit `checked` prop bound to state,
// not an uncontrolled default.

describe("Checkbox inputs use explicit checked prop (no null checked risk)", () => {
  it("all type=checkbox inputs in components have explicit checked prop", () => {
    const componentsDir = path.join(SRC, "components");
    const issues: string[] = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
          const content = fs.readFileSync(full, "utf-8");
          if (content.includes('type="checkbox"') || content.includes("type='checkbox'")) {
            // Every checkbox must have a `checked={` prop
            if (!content.includes("checked={")) {
              issues.push(entry.name);
            }
          }
        }
      }
    }

    walk(componentsDir);
    expect(issues).toEqual([]);
  });
});
