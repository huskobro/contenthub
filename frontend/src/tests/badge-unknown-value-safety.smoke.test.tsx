// @ts-nocheck — structural guard test that reads source files via Node fs
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf-8");
}

function walkBadgeFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(path.join(SRC, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) results.push(...walkBadgeFiles(rel));
    else if (entry.name.includes("Badge") && entry.name.endsWith(".tsx")) results.push(rel);
  }
  return results;
}

const allBadgeFiles = walkBadgeFiles("components");

// Filter to only badge files that use styles/STYLES map lookup pattern.
// Match suffix-style map names too (e.g. STATE_STYLES, LEVEL_STYLES).
const mapBadgeFiles = allBadgeFiles.filter((file) => {
  const src = read(file);
  return /[A-Za-z_]*(?:styles|STYLES)\[/.test(src);
});

// ─── Style lookup fallback ─────────────────────────────────────

describe("Badge style lookup has fallback for unknown values", () => {
  for (const file of mapBadgeFiles) {
    it(`${path.basename(file)} has style lookup fallback`, () => {
      const src = read(file);
      // Accept: ?? { bg: ... } (inline neutral), ?? *_STYLES[".."] / STYLES[..] / styles[..]
      // (named key), or ?? "tw-class" (Tailwind string). Widen the regex so
      // suffix-style map names (STATE_STYLES, LEVEL_STYLES) are accepted.
      const hasStyleFallback =
        src.includes('?? { bg: colors.neutral[50]') ||
        /\?\?\s*[A-Za-z_]*(?:styles|STYLES)\[?/.test(src) ||
        /\?\?\s*[A-Za-z_]*(?:styles|STYLES)\./.test(src) ||
        /\?\?\s*"/.test(src);
      expect(
        hasStyleFallback,
        `${file} missing style lookup fallback (either neutral inline or named key)`
      ).toBe(true);
    });
  }
});

// ─── Label text fallback ───────────────────────────────────────

describe("Badge label text has null fallback", () => {
  for (const file of allBadgeFiles) {
    it(`${path.basename(file)} label text has ?? fallback`, () => {
      const src = read(file);
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("//") || line.startsWith("import")) continue;
        // Check for bare {level} or {status} without ?? inside span content
        if (/^\{level\}$/.test(line) || /^\{status\}$/.test(line)) {
          throw new Error(
            `${file}:${i + 1} has bare label render without fallback: ${line}`
          );
        }
      }
    });
  }
});

// ─── No bare style map lookup ending in semicolon without fallback ─

describe("No bare style map lookup without fallback", () => {
  for (const file of mapBadgeFiles) {
    it(`${path.basename(file)} has no bare style lookup`, () => {
      const src = read(file);
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trimStart().startsWith("//") || line.trimStart().startsWith("import")) continue;
        // Match: styles[xxx]; or STYLES[xxx]; WITHOUT ?? anywhere on the line
        if (/(?:styles|STYLES)\[[^\]]+\]\s*;/.test(line) && !line.includes("??")) {
          throw new Error(
            `${file}:${i + 1} has style lookup without ?? fallback: ${line.trim()}`
          );
        }
      }
    });
  }
});
