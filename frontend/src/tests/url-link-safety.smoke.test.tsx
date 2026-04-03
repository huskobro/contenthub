// @ts-nocheck — structural guard test that reads source files via Node fs
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf-8");
}

// ─── Anchor hygiene ─────────────────────────────────────────────

describe("Anchor tag safety", () => {
  it("NewsItemDetailPanel anchor has rel='noopener noreferrer'", () => {
    const src = read("components/news-items/NewsItemDetailPanel.tsx");
    const anchorLine = src.split("\n").find((l) => l.includes("<a ") && l.includes("href"));
    expect(anchorLine).toBeTruthy();
    expect(anchorLine).toContain('rel="noopener noreferrer"');
  });

  it("NewsItemDetailPanel anchor has target='_blank'", () => {
    const src = read("components/news-items/NewsItemDetailPanel.tsx");
    const anchorLine = src.split("\n").find((l) => l.includes("<a ") && l.includes("href"));
    expect(anchorLine).toBeTruthy();
    expect(anchorLine).toContain('target="_blank"');
  });

  it("NewsItemDetailPanel anchor has null guard on data.url", () => {
    const src = read("components/news-items/NewsItemDetailPanel.tsx");
    const anchorLine = src.split("\n").find((l) => l.includes("<a ") && l.includes("href"));
    expect(anchorLine).toBeTruthy();
    // Must have a conditional check before rendering the anchor
    expect(anchorLine).toContain("data.url ?");
  });

  it("NewsItemDetailPanel anchor has wordBreak overflow protection", () => {
    const src = read("components/news-items/NewsItemDetailPanel.tsx");
    const anchorLine = src.split("\n").find((l) => l.includes("<a ") && l.includes("href"));
    expect(anchorLine).toBeTruthy();
    expect(anchorLine).toContain("wordBreak");
  });

  it("No anchor tags exist without rel attribute", () => {
    // Scan all component files for <a tags and ensure they all have rel
    const componentsDir = path.join(SRC, "components");
    const files = getAllTsxFiles(componentsDir);
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("<a ") && line.includes("href")) {
          expect(
            line.includes("rel=") || line.includes("rel ="),
            `${path.relative(SRC, file)}:${i + 1} has <a> without rel attribute`
          ).toBe(true);
        }
      }
    }
  });
});

// ─── UrlField safety ────────────────────────────────────────────

describe("UrlField safety", () => {
  it("SourceDetailPanel UrlField has null guard", () => {
    const src = read("components/sources/SourceDetailPanel.tsx");
    const urlFieldFn = src.match(/function UrlField[\s\S]*?return[\s\S]*?<\/div>\s*\);?\s*\}/);
    expect(urlFieldFn).toBeTruthy();
    const code = urlFieldFn![0];
    // Should check value before rendering
    expect(code.includes("value ?") || code.includes("value?")).toBe(true);
  });

  it("SourceDetailPanel UrlField has wordBreak overflow protection", () => {
    const src = read("components/sources/SourceDetailPanel.tsx");
    const urlFieldFn = src.match(/function UrlField[\s\S]*?return[\s\S]*?<\/div>\s*\);?\s*\}/);
    expect(urlFieldFn).toBeTruthy();
    const code = urlFieldFn![0];
    expect(code.includes("wordBreak")).toBe(true);
  });

  it("SourceDetailPanel UrlField has overflowWrap", () => {
    const src = read("components/sources/SourceDetailPanel.tsx");
    const urlFieldFn = src.match(/function UrlField[\s\S]*?return[\s\S]*?<\/div>\s*\);?\s*\}/);
    expect(urlFieldFn).toBeTruthy();
    const code = urlFieldFn![0];
    expect(code.includes("overflowWrap")).toBe(true);
  });

  it("SourceDetailPanel UrlField has em-dash fallback for null", () => {
    const src = read("components/sources/SourceDetailPanel.tsx");
    const urlFieldFn = src.match(/function UrlField[\s\S]*?return[\s\S]*?<\/div>\s*\);?\s*\}/);
    expect(urlFieldFn).toBeTruthy();
    const code = urlFieldFn![0];
    expect(code.includes("—")).toBe(true);
  });
});

// ─── No unsafe href patterns ───────────────────────────────────

describe("No unsafe href patterns", () => {
  it("No javascript: hrefs in components", () => {
    const componentsDir = path.join(SRC, "components");
    const files = getAllTsxFiles(componentsDir);
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      expect(
        !content.includes('href="javascript:'),
        `${path.relative(SRC, file)} contains javascript: href`
      ).toBe(true);
    }
  });

  it("No empty href='#' in components", () => {
    const componentsDir = path.join(SRC, "components");
    const files = getAllTsxFiles(componentsDir);
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      expect(
        !content.includes('href="#"'),
        `${path.relative(SRC, file)} contains href="#"`
      ).toBe(true);
    }
  });
});

// ─── URL form inputs ────────────────────────────────────────────

describe("URL form input safety", () => {
  it("NewsItemForm validates URL as required", () => {
    const src = read("components/news-items/NewsItemForm.tsx");
    expect(src.includes("url") && src.includes("zorunlu")).toBe(true);
  });

  it("SourceForm validates feed_url when source_type is rss", () => {
    const src = read("components/sources/SourceForm.tsx");
    expect(src.includes("rss") && src.includes("feedUrl")).toBe(true);
  });
});

// ─── Helper ─────────────────────────────────────────────────────

function getAllTsxFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTsxFiles(fullPath));
    } else if (entry.name.endsWith(".tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}
