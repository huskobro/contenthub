/// <reference types="vite/client" />
/**
 * Aurora news-bulletin atomic update-and-start guard (Pass-6).
 *
 * Eskiden "Üretimi başlat" iki ayri HTTP cagrisi yapiyordu (PATCH bulletin,
 * sonra POST start) — yari-basarisiz state'e dusulebiliyordu. Backend'e
 * `update-and-start-production` endpoint'i eklendi; her iki adim atomik
 * tek transaction icinde calisiyor.
 *
 * Bu test:
 *   - frontend api'sinde `updateAndStartBulletinProduction` fonksiyonunun
 *     varligini ve `update-and-start-production` URL'ine gittigini dogrular
 *   - AuroraNewsBulletinWizardPage bu atomik fonksiyonu cagiriyor mu kontrol eder
 *   - eski/parcali patern (ayri ayri PATCH + start) AuroraNewsBulletinWizardPage'da
 *     ortaya cikmamalidir
 *
 * Niyet: bir gun biri atomik endpoint'i bypass edip eski PATCH-then-START paterni
 * tekrar koyarsa CI yakalar.
 */
import { describe, it, expect } from "vitest";

const newsBulletinApiSrc: string = (
  import.meta.glob("../api/newsBulletinApi.ts", { eager: true, query: "?raw", import: "default" }) as Record<string, string>
)["../api/newsBulletinApi.ts"];

const auroraFiles: Record<string, string> = import.meta.glob(
  "../surfaces/aurora/**/*.tsx",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

describe("Aurora news bulletin atomic update-and-start guard (Pass-6)", () => {
  it("newsBulletinApi.ts updateAndStartBulletinProduction fonksiyonu update-and-start-production URL'ine gider", () => {
    expect(newsBulletinApiSrc).toBeTruthy();
    const fnRe = /export function updateAndStartBulletinProduction[\s\S]{0,400}/;
    const m = newsBulletinApiSrc.match(fnRe);
    expect(m, "updateAndStartBulletinProduction fonksiyonu bulunamadi").toBeTruthy();
    expect(m![0].includes("update-and-start-production")).toBe(true);
  });

  it("AuroraNewsBulletinWizardPage atomik endpoint'i cagiriyor", () => {
    const src = auroraFiles["../surfaces/aurora/AuroraNewsBulletinWizardPage.tsx"];
    expect(src, "AuroraNewsBulletinWizardPage bulunamadi").toBeTruthy();
    expect(/\bupdateAndStartBulletinProduction\s*\(/.test(src!)).toBe(true);
  });

  it("AuroraNewsBulletinWizardPage 'Uretimi baslat' akisinda eski parcali patern (PATCH + ayri start) kullanmamalidir", () => {
    const src = auroraFiles["../surfaces/aurora/AuroraNewsBulletinWizardPage.tsx"];
    expect(src).toBeTruthy();
    // updateBulletin + startBulletinProduction ayri ayri ardarda cagrilmamali.
    // Atomik fonksiyon dururken eski parcali patern degisiklik gostergesidir.
    const callsUpdate = /\bupdateBulletin\s*\(/.test(src!);
    const callsStartProduction = /\bstartBulletinProduction\s*\(/.test(src!);
    if (callsUpdate && callsStartProduction) {
      throw new Error(
        "AuroraNewsBulletinWizardPage hem updateBulletin hem startBulletinProduction cagiriyor. " +
          "Pass-6 invariant: 'Uretimi baslat' aksiyonu update-and-start-production atomik " +
          "endpoint'ine tek HTTP cagrisi yapmali; iki adimi ayri ayri tetiklemek yari-basarisiz " +
          "state riski tasir.",
      );
    }
  });
});
