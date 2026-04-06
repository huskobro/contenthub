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
    expect(src.includes('script.version ?? "—"') || src.includes("script.version ?? DASH")).toBe(true);
  });

  it("StandardVideoScriptPanel has null fallback on source_type", () => {
    const src = read("components/standard-video/StandardVideoScriptPanel.tsx");
    expect(src.includes('script.source_type ?? "—"') || src.includes("script.source_type ?? DASH")).toBe(true);
  });

  it("StandardVideoScriptPanel has null fallback on generation_status", () => {
    const src = read("components/standard-video/StandardVideoScriptPanel.tsx");
    expect(src.includes('script.generation_status ?? "—"') || src.includes("script.generation_status ?? DASH")).toBe(true);
  });

  it("StandardVideoScriptPanel content block has null-safe length check", () => {
    const src = read("components/standard-video/StandardVideoScriptPanel.tsx");
    expect(src).toContain('(script.content ?? "").length');
  });

  it("StandardVideoScriptPanel content block has overflow-wrap protection", () => {
    const src = read("components/standard-video/StandardVideoScriptPanel.tsx");
    // The content div should have overflow-wrap protection (inline or Tailwind)
    expect(src.includes("overflowWrap") || src.includes("overflow-wrap") || src.includes("break-words") || src.includes("break-all")).toBe(true);
  });

  it("NewsBulletinScriptPanel has null fallback on version", () => {
    const src = read("components/news-bulletin/NewsBulletinScriptPanel.tsx");
    expect(src.includes('script.version ?? "—"') || src.includes("script.version ?? DASH")).toBe(true);
  });

  it("NewsBulletinScriptPanel has null fallback on generation_status", () => {
    const src = read("components/news-bulletin/NewsBulletinScriptPanel.tsx");
    expect(src.includes('script.generation_status ?? "—"') || src.includes("script.generation_status ?? DASH")).toBe(true);
  });

  it("NewsBulletinScriptPanel content block has null-safe length check", () => {
    const src = read("components/news-bulletin/NewsBulletinScriptPanel.tsx");
    expect(src).toContain('(script.content ?? "").length');
  });

  it("NewsBulletinScriptPanel content block has overflow-wrap protection", () => {
    const src = read("components/news-bulletin/NewsBulletinScriptPanel.tsx");
    expect(src.includes("overflowWrap") || src.includes("overflow-wrap") || src.includes("break-words") || src.includes("break-all")).toBe(true);
  });
});

// ─── Metadata panel text hygiene ────────────────────────────────

describe("Metadata panel text hygiene", () => {
  it("StandardVideoMetadataPanel has null fallback on title", () => {
    const src = read("components/standard-video/StandardVideoMetadataPanel.tsx");
    expect(src.includes('metadata.title ?? "—"') || src.includes("metadata.title ?? DASH")).toBe(true);
  });

  it("StandardVideoMetadataPanel has null fallback on version", () => {
    const src = read("components/standard-video/StandardVideoMetadataPanel.tsx");
    expect(src.includes('metadata.version ?? "—"') || src.includes("metadata.version ?? DASH")).toBe(true);
  });

  it("StandardVideoMetadataPanel has null fallback on source_type", () => {
    const src = read("components/standard-video/StandardVideoMetadataPanel.tsx");
    expect(src.includes('metadata.source_type ?? "—"') || src.includes("metadata.source_type ?? DASH")).toBe(true);
  });

  it("StandardVideoMetadataPanel has null fallback on generation_status", () => {
    const src = read("components/standard-video/StandardVideoMetadataPanel.tsx");
    expect(src.includes('metadata.generation_status ?? "—"') || src.includes("metadata.generation_status ?? DASH")).toBe(true);
  });

  it("NewsBulletinMetadataPanel has null fallback on version", () => {
    const src = read("components/news-bulletin/NewsBulletinMetadataPanel.tsx");
    expect(src.includes('metadata.version ?? "—"') || src.includes("metadata.version ?? DASH")).toBe(true);
  });

  it("NewsBulletinMetadataPanel has null fallback on generation_status", () => {
    const src = read("components/news-bulletin/NewsBulletinMetadataPanel.tsx");
    expect(src.includes('metadata.generation_status ?? "—"') || src.includes("metadata.generation_status ?? DASH")).toBe(true);
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

  it("JsonPreviewField pre block has overflow-wrap protection", () => {
    const src = read("components/shared/JsonPreviewField.tsx");
    expect(src.includes("overflowWrap") || src.includes("overflow-wrap") || src.includes("break-words") || src.includes("break-all")).toBe(true);
  });

  it("JsonPreviewField has null fallback rendering", () => {
    const src = read("components/shared/JsonPreviewField.tsx");
    // Should show em-dash when value is falsy (either literal or HTML entity)
    expect(src.includes("—") || src.includes("&mdash;")).toBe(true);
  });
});

// ─── Artifacts panel text hygiene ───────────────────────────────

describe("Artifacts panel text hygiene", () => {
  it("StandardVideoArtifactsPanel content block has null-safe length check", () => {
    const src = read("components/standard-video/StandardVideoArtifactsPanel.tsx");
    expect(src).toContain('(script.content ?? "")');
  });

  it("StandardVideoArtifactsPanel content block has overflow-wrap protection", () => {
    const src = read("components/standard-video/StandardVideoArtifactsPanel.tsx");
    expect(src.includes("overflowWrap") || src.includes("overflow-wrap") || src.includes("break-words") || src.includes("break-all")).toBe(true);
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
          const isGuarded = /\.\w+\s*&&\s*\(/.test(context) || /!isBlank\(/.test(context);
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
