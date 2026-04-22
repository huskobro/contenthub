/// <reference types="vite/client" />
/**
 * Aurora Shell-Cross regresyon guard.
 *
 * CLAUDE.md "Shell Branching Rule":
 *   - baseRoute, kullanıcının rolünden değil URL prefix'inden türetilmeli.
 *   - Yasak patern:  `const base = isAdmin ? "/admin" : "/user"`
 *                    (veya role==='admin' ? ... : ...)
 *   - Doğru patern: useLocation().pathname.startsWith("/admin") temelli.
 *
 * Bu guard, Aurora yüzeyindeki her .tsx dosyasında yasak ifadenin yeniden
 * girmediğini test eder. Bir regression bu teste takılırsa: baseRoute
 * hesaplamasını useLocation-based olana çevir, ya da bir helper (ör.
 * useShellBase) çağır.
 */
import { describe, it, expect } from "vitest";

const auroraFiles: Record<string, string> = import.meta.glob(
  "../surfaces/aurora/**/*.tsx",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

interface Violation {
  file: string;
  line: number;
  snippet: string;
  pattern: string;
}

function scanFor(label: string, re: RegExp, allowedFiles: string[] = []): Violation[] {
  const out: Violation[] = [];
  for (const [file, src] of Object.entries(auroraFiles)) {
    if (allowedFiles.some((a) => file.endsWith(a))) continue;
    const lines = src.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (re.test(lines[i])) {
        out.push({
          file,
          line: i + 1,
          snippet: lines[i].trim(),
          pattern: label,
        });
      }
    }
  }
  return out;
}

describe("Aurora Shell-Cross regresyon guard", () => {
  it("role-temelli baseRoute hesaplaması Aurora yüzeyine sızmasın", () => {
    // Yasak: ROL üzerinden `"/admin" | "/user"` seçimi. Örnekler:
    //   const base = isAdmin ? "/admin" : "/user";
    //   const base = role === "admin" ? "/admin" : "/user";
    //   const base = user?.role === "admin" ? "/admin" : "/user";
    //
    // İzinli (URL temelli, Shell Branching Rule'a uygun):
    //   location.pathname.startsWith("/admin") ? "/admin" : "/user"
    //
    // Tek meşru istisna: login sonrası ilk yönlendirme. O anda URL yok,
    // yalnızca role var. Bu dosyayı whitelist'e alıyoruz.
    const ROLE_BASED_ALLOWED_FILES = ["AuroraLoginPage.tsx"];

    const roleKeywords = /\b(isAdmin|role\s*===|isAuthAdmin|user\?\.role|auth\?\.role)\b/;
    const ternaryShell =
      /(["'`]\/admin["'`]\s*:\s*["'`]\/user["'`])|(["'`]\/user["'`]\s*:\s*["'`]\/admin["'`])/;

    const violations: Violation[] = [];
    for (const [file, src] of Object.entries(auroraFiles)) {
      if (ROLE_BASED_ALLOWED_FILES.some((f) => file.endsWith(f))) continue;
      const lines = src.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        const ln = lines[i];
        if (!ternaryShell.test(ln)) continue;
        if (/location\.pathname|useLocation/.test(ln)) continue;
        if (roleKeywords.test(ln)) {
          violations.push({
            file,
            line: i + 1,
            snippet: ln.trim(),
            pattern: "role-based shell ternary",
          });
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file}:${v.line} [${v.pattern}]\n    ${v.snippet}`)
        .join("\n");
      throw new Error(
        `Aurora yüzeyinde role-temelli baseRoute paterni tespit edildi. ` +
          `Shell Branching Rule ihlali: baseRoute useLocation() ile URL'den türetilmeli, kullanıcının rolünden değil.\n` +
          msg,
      );
    }
    expect(violations).toEqual([]);
  });

  it("canonical route kısa literal (forbidden) Aurora yüzeyinde bulunmasın", () => {
    // CLAUDE.md Canonical Route Vocabulary forbidden literals:
    //   /admin/channels/:id/branding       → canonical: /branding-center
    //   /admin/projects/:id/automation     → canonical: /automation-center
    // Bu pattern sadece navigate/Link to="..." içinde aranır; metni, yorumu
    // yanlışlıkla yakalamamak için dar tutuyoruz.
    const patterns: Array<{ label: string; re: RegExp }> = [
      {
        label: `/channels/.../branding (short literal)`,
        re: /(navigate|to=)\s*[(\[]?\s*[`"']\/(admin|user)\/channels\/[^/`"')]+\/branding[`"']/,
      },
      {
        label: `/projects/.../automation (short literal)`,
        re: /(navigate|to=)\s*[(\[]?\s*[`"']\/(admin|user)\/projects\/[^/`"')]+\/automation[`"']/,
      },
    ];

    const violations: Violation[] = [];
    for (const { label, re } of patterns) {
      violations.push(...scanFor(label, re));
    }

    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file}:${v.line} [${v.pattern}]\n    ${v.snippet}`)
        .join("\n");
      throw new Error(
        `Aurora yüzeyinde yasak kısa literal tespit edildi. ` +
          `Canonical path kullanılmalı: /branding-center, /automation-center.\n` +
          msg,
      );
    }
    expect(violations).toEqual([]);
  });
});
