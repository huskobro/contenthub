// @ts-nocheck — structural guard test that reads source files via Node fs
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf-8");
}

// ─── Script panel text hygiene ──────────────────────────────────

describe("Script panel text hygiene", () => {
  it("StandardVideoScriptPanel has null fallback on version", () => {
    const src = read("components/standard-video/StandardVideoScriptPanel.tsx");
    expect(src).toContain('script.version ?? "—"');
  });

  it("StandardVideoScriptPanel has null fallback on source_type", () => {
    const src = read("components/standard-video/StandardVideoScriptPanel.tsx");
    expect(src).toContain('script.source_type ?? "—"');
  });

  it("StandardVideoScriptPanel has null fallback on generation_status", () => {
    const src = read("components/standard-video/StandardVideoScriptPanel.tsx");
    expect(src).toContain('script.generation_status ?? "—"');
  });

  it("StandardVideoScriptPanel content block has null-safe length check", () => {
    const src = read("components/standard-video/StandardVideoScriptPanel.tsx");
    expect(src).toContain('(script.content ?? "").length');
  });

  it("StandardVideoScriptPanel content block has overflowWrap", () => {
    const src = read("components/standard-video/StandardVideoScriptPanel.tsx");
    // The pre-wrap content div should have overflowWrap
    const preWrapIdx = src.indexOf("pre-wrap");
    expect(preWrapIdx).toBeGreaterThan(-1);
    const block = src.slice(preWrapIdx, preWrapIdx + 200);
    expect(block).toContain("overflowWrap");
  });

  it("NewsBulletinScriptPanel has null fallback on version", () => {
    const src = read("components/news-bulletin/NewsBulletinScriptPanel.tsx");
    expect(src).toContain('script.version ?? "—"');
  });

  it("NewsBulletinScriptPanel has null fallback on generation_status", () => {
    const src = read("components/news-bulletin/NewsBulletinScriptPanel.tsx");
    expect(src).toContain('script.generation_status ?? "—"');
  });

  it("NewsBulletinScriptPanel content block has null-safe length check", () => {
    const src = read("components/news-bulletin/NewsBulletinScriptPanel.tsx");
    expect(src).toContain('(script.content ?? "").length');
  });

  it("NewsBulletinScriptPanel content block has overflowWrap", () => {
    const src = read("components/news-bulletin/NewsBulletinScriptPanel.tsx");
    const preWrapIdx = src.indexOf("pre-wrap");
    expect(preWrapIdx).toBeGreaterThan(-1);
    const block = src.slice(preWrapIdx, preWrapIdx + 200);
    expect(block).toContain("overflowWrap");
  });
});

// ─── Metadata panel text hygiene ────────────────────────────────

describe("Metadata panel text hygiene", () => {
  it("StandardVideoMetadataPanel has null fallback on title", () => {
    const src = read("components/standard-video/StandardVideoMetadataPanel.tsx");
    expect(src).toContain('metadata.title ?? "—"');
  });

  it("StandardVideoMetadataPanel has null fallback on version", () => {
    const src = read("components/standard-video/StandardVideoMetadataPanel.tsx");
    expect(src).toContain('metadata.version ?? "—"');
  });

  it("StandardVideoMetadataPanel has null fallback on source_type", () => {
    const src = read("components/standard-video/StandardVideoMetadataPanel.tsx");
    expect(src).toContain('metadata.source_type ?? "—"');
  });

  it("StandardVideoMetadataPanel has null fallback on generation_status", () => {
    const src = read("components/standard-video/StandardVideoMetadataPanel.tsx");
    expect(src).toContain('metadata.generation_status ?? "—"');
  });

  it("NewsBulletinMetadataPanel has null fallback on version", () => {
    const src = read("components/news-bulletin/NewsBulletinMetadataPanel.tsx");
    expect(src).toContain('metadata.version ?? "—"');
  });

  it("NewsBulletinMetadataPanel has null fallback on generation_status", () => {
    const src = read("components/news-bulletin/NewsBulletinMetadataPanel.tsx");
    expect(src).toContain('metadata.generation_status ?? "—"');
  });
});

// ─── JSON preview hygiene ───────────────────────────────────────

describe("JSON preview hygiene", () => {
  it("safeJsonPretty returns fallback for null", () => {
    const src = read("lib/safeJson.ts");
    expect(src).toContain("!value");
  });

  it("safeJsonPretty returns fallback for whitespace-only string", () => {
    const src = read("lib/safeJson.ts");
    expect(src).toContain("!value.trim()");
  });

  it("JsonPreviewField pre block has overflowWrap", () => {
    const src = read("components/shared/JsonPreviewField.tsx");
    expect(src).toContain("overflowWrap");
  });

  it("JsonPreviewField has null fallback rendering", () => {
    const src = read("components/shared/JsonPreviewField.tsx");
    // Should show "—" when value is falsy
    expect(src).toContain("—");
  });
});

// ─── Artifacts panel text hygiene ───────────────────────────────

describe("Artifacts panel text hygiene", () => {
  it("StandardVideoArtifactsPanel content block has null-safe length check", () => {
    const src = read("components/standard-video/StandardVideoArtifactsPanel.tsx");
    expect(src).toContain('(script.content ?? "")');
  });

  it("StandardVideoArtifactsPanel content block has overflowWrap", () => {
    const src = read("components/standard-video/StandardVideoArtifactsPanel.tsx");
    // Content preview block should have overflowWrap
    expect(src).toContain("overflowWrap");
  });
});

// ─── No raw null/undefined text in copyable surfaces ────────────

describe("No raw null/undefined text leaks in copyable panels", () => {
  const panelFiles = [
    "components/standard-video/StandardVideoScriptPanel.tsx",
    "components/standard-video/StandardVideoMetadataPanel.tsx",
    "components/news-bulletin/NewsBulletinScriptPanel.tsx",
    "components/news-bulletin/NewsBulletinMetadataPanel.tsx",
  ];

  for (const file of panelFiles) {
    it(`${path.basename(file)} does not render raw "undefined" text`, () => {
      const src = read(file);
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments and imports
        if (line.trimStart().startsWith("//") || line.trimStart().startsWith("import")) continue;
        // Check for dangerous pattern: <td ...>{obj.prop}</td> without ?? fallback
        if (/<td[^>]*>\{[a-zA-Z]+\.[a-zA-Z_]+\}<\/td>/.test(line)) {
          // Check if this line is inside a conditional render block (e.g., {field && (...)}
          // by scanning back a few lines for the && guard
          const context = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
          const isGuarded = /\.\w+\s*&&\s*\(/.test(context);
          if (!isGuarded) {
            throw new Error(
              `${file}:${i + 1} renders property without null fallback: ${line.trim()}`
            );
          }
        }
      }
    });
  }
});
