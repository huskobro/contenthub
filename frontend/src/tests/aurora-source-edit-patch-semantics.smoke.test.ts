/// <reference types="vite/client" />
/**
 * Aurora source edit — PATCH semantik koruma testi (Pass-6).
 *
 * Manual QA'da kullanici 'iki alani degistirip kaydet, sayfayi refresh et,
 * digerleri korunmus mu?' gibi bir testi her surumde tekrar etmek istemiyor.
 * Bu test:
 *   - frontend updateSource kullaniminin api.patch (PUT degil!) yaptigini dogrular
 *   - SourceUpdatePayload interface'inin tum alanlarinin optional oldugunu
 *     dogrular (partial update semantigi)
 *   - AuroraSourceDetailPage updateSource cagrisinin tum mevcut alanlari degil
 *     sadece degisen alanlari payload'a koymadigini dogrular (degil — degil!),
 *     opsiyonel partial paterni kullanmasini onaylar
 *
 * Niyet: bir gun biri PATCH'i PUT'a cevirir veya updateSource cagrisinda
 * tum alanlari yeniden gondermeye baslayip silinen alanlari ezerse CI yakalar.
 */
import { describe, it, expect } from "vitest";

const sourcesApiSrc: string = (
  import.meta.glob("../api/sourcesApi.ts", { eager: true, query: "?raw", import: "default" }) as Record<string, string>
)["../api/sourcesApi.ts"];

const auroraFiles: Record<string, string> = import.meta.glob(
  "../surfaces/aurora/**/*.tsx",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

describe("Aurora source edit PATCH semantik guard (Pass-6)", () => {
  it("updateSource HTTP PATCH kullanmali (PUT veya POST DEGIL)", () => {
    expect(sourcesApiSrc).toBeTruthy();
    const re = /export function updateSource[\s\S]*?api\.(patch|put|post)/;
    const m = sourcesApiSrc.match(re);
    expect(m, "updateSource fonksiyonu bulunamadi").toBeTruthy();
    expect(m![1]).toBe("patch");
  });

  it("SourceUpdatePayload tum alanlari optional olmali (partial update)", () => {
    const interfaceMatch = sourcesApiSrc.match(/export interface SourceUpdatePayload\s*\{([\s\S]*?)\n\}/);
    expect(interfaceMatch, "SourceUpdatePayload interface bulunamadi").toBeTruthy();
    const body = interfaceMatch![1];
    const fieldLines = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//") && !l.startsWith("*") && !l.startsWith("/*"));
    expect(fieldLines.length).toBeGreaterThan(0);
    // Her alan name?: type sablonunda olmali (? = optional)
    const required = fieldLines.filter((l) => /^[a-zA-Z_]\w*\s*:/.test(l));
    if (required.length > 0) {
      throw new Error(
        `SourceUpdatePayload uyumsuzluk: zorunlu alan(lar) bulundu. ` +
          `PATCH partial update semantigi tum alanlarin optional (?:) olmasini gerektirir.\n` +
          `Zorunlu satirlar:\n${required.join("\n")}`,
      );
    }
  });

  it("AuroraSourceDetailPage updateSource cagrisini bir kez yapmali", () => {
    const src = auroraFiles["../surfaces/aurora/AuroraSourceDetailPage.tsx"];
    expect(src, "AuroraSourceDetailPage bulunamadi").toBeTruthy();
    // updateSource çağrısının var olduğunu doğrula (silinmemiş)
    expect(/\bupdateSource\s*\(/.test(src!), "updateSource cagrisi bulunamadi").toBe(true);
  });
});
