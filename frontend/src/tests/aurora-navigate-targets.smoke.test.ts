/// <reference types="vite/client" />
/**
 * Aurora navigate-target regresyon guard.
 *
 * Pass-3 audit'inde Aurora yüzeyinde 9 navigate-404 bulundu (templates/{id},
 * used-news/{id}, style-blueprints/{id}, template-style-links/{id},
 * source-scans/{id}, channels/{id}/connect, audit?record=...). Pass-4 closure
 * ile tamamı kapatıldı. Bu test gelecekte yeni 404 paterninin Aurora yüzeyine
 * sızmasını engeller.
 *
 * Yaklaşım: Vite'ın `import.meta.glob` özelliği ile router.tsx'i ve tüm Aurora
 * .tsx dosyalarını raw text olarak yükle. Router'dan tüm `path:` değerlerini
 * çıkar; Aurora dosyalarındaki `navigate("/...")` çağrılarını çapraz-doğrula.
 * Bilinen-yasak paternler ayrıca sıkı bir blacklist ile kontrol edilir.
 */
import { describe, it, expect } from "vitest";

// Vite glob: ?raw → string olarak content; eager → bundle time'da yüklenir
const routerSrc: string = (
  import.meta.glob("../app/router.tsx", { eager: true, query: "?raw", import: "default" }) as Record<string, string>
)["../app/router.tsx"];

const auroraFiles: Record<string, string> = import.meta.glob(
  "../surfaces/aurora/**/*.tsx",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

function extractRouterPaths(src: string): Set<string> {
  const paths = new Set<string>();
  const re = /path:\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    paths.add(m[1]);
  }
  return paths;
}

function buildKnownPathPrefixes(rawPaths: Set<string>): string[] {
  const prefixes: string[] = [];
  for (const p of rawPaths) {
    if (p.startsWith("/")) prefixes.push(p);
  }
  const parents = ["/admin", "/user"];
  for (const p of rawPaths) {
    if (p.startsWith("/") || p === "*") continue;
    for (const parent of parents) {
      prefixes.push(`${parent}/${p}`);
    }
  }
  return prefixes;
}

function isNavigateTargetValid(target: string, knownPaths: string[]): boolean {
  const cleanTarget = target.split("?")[0].split("#")[0];
  // Template literal (${...}) → :param normalize
  const normalized = cleanTarget.replace(/\$\{[^}]+\}/g, ":param");
  for (const known of knownPaths) {
    const knownNorm = known.replace(/:[^/]+/g, ":param");
    if (knownNorm === normalized) return true;
    if (cleanTarget === known) return true;
    // Prefix match (örn. /admin/jobs valid ise /admin/jobs/anything de valid sayılmaz, sıkı kal)
  }
  return false;
}

function extractAuroraNavigateTargets(): Array<{ file: string; target: string }> {
  const targets: Array<{ file: string; target: string }> = [];
  // navigate("/...") veya navigate(`/...${id}`)
  const re = /navigate\(\s*[`"']([/`][^`"')]+)[`"']/g;
  for (const [path, src] of Object.entries(auroraFiles)) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      let raw = m[1];
      if (raw.startsWith("`")) raw = raw.slice(1);
      if (raw.startsWith("/")) {
        targets.push({ file: path, target: raw });
      }
    }
  }
  return targets;
}

describe("Aurora navigate target regresyon guard", () => {
  const rawPaths = extractRouterPaths(routerSrc);
  const knownPaths = buildKnownPathPrefixes(rawPaths);

  it("router.tsx içinde en az 50 path tanımlı (sanity check)", () => {
    expect(rawPaths.size).toBeGreaterThan(50);
  });

  it("Aurora yüzeyinde Pass-3'te kapatılan 9 navigate-404 paterni TEKRAR ortaya çıkmasın", () => {
    const forbiddenPatterns: Array<{ pat: RegExp; label: string }> = [
      { pat: /navigate\(\s*[`"']\/admin\/templates\/\$\{[^}]+\}[`"']/, label: "/admin/templates/${id}" },
      { pat: /navigate\(\s*[`"']\/admin\/used-news\/\$\{[^}]+\}[`"']/, label: "/admin/used-news/${id}" },
      { pat: /navigate\(\s*[`"']\/admin\/style-blueprints\/\$\{[^}]+\}[`"']/, label: "/admin/style-blueprints/${id}" },
      { pat: /navigate\(\s*[`"']\/admin\/template-style-links\/\$\{[^}]+\}[`"']/, label: "/admin/template-style-links/${id}" },
      { pat: /navigate\(\s*[`"']\/admin\/source-scans\/\$\{[^}]+\}[`"']/, label: "/admin/source-scans/${id}" },
      { pat: /navigate\(\s*[`"']\/user\/channels\/\$\{[^}]+\}\/connect[`"']/, label: "/user/channels/${id}/connect" },
      { pat: /navigate\(\s*[`"']\/admin\/audit\?record=/, label: "/admin/audit?record=" },
    ];
    const violations: Array<{ file: string; pattern: string }> = [];
    for (const [path, src] of Object.entries(auroraFiles)) {
      for (const { pat, label } of forbiddenPatterns) {
        if (pat.test(src)) {
          violations.push({ file: path, pattern: label });
        }
      }
    }
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file} → ${v.pattern}`).join("\n");
      throw new Error(
        `Pass-3 navigate-404 paterni Aurora yüzeyinde tekrar ortaya çıktı:\n${msg}\n` +
          `Drawer pattern veya doğru route hedefini kullan; AURORA_IMPROVEMENT_DESIGN.md Bölüm 2'ye bakın.`,
      );
    }
    expect(violations).toEqual([]);
  });

  it("Aurora navigate hedefleri router.tsx'de tanımlı path'lerle eşleşmeli", () => {
    const targets = extractAuroraNavigateTargets();
    const unknown: Array<{ file: string; target: string }> = [];
    for (const { file, target } of targets) {
      if (!isNavigateTargetValid(target, knownPaths)) {
        unknown.push({ file, target });
      }
    }
    if (unknown.length > 0) {
      const msg = unknown.map((u) => `  ${u.file} → navigate("${u.target}")`).join("\n");
      throw new Error(
        `Aurora yüzeyinde router.tsx'de tanımlı olmayan navigate hedefleri (404 riski):\n${msg}\n` +
          `Önce route'u router.tsx'e ekle, sonra Aurora override yaz; ya da hedefi düzelt.`,
      );
    }
    expect(unknown).toEqual([]);
  });
});
