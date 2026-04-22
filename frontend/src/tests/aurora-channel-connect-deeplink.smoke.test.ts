/// <reference types="vite/client" />
/**
 * Aurora kanal "Bağlantıyı kontrol et" deep-link guard.
 *
 * Pass-3 audit'inde `/user/channels/:id/connect` 404 olarak yakalanmıştı; Pass-4
 * "Bağlantıları yönet" CTA'sı `/user/connections?channel=<channel_id>` deep-link
 * paternine dönüştürüldü. AuroraUserConnectionsPage `?channel=` parametresini
 * okur, ilgili platform sekmesine atar ve URL'i temizler. Pass-6 manual QA'da
 * kullanıcı bu akışı doğrulayamadığı için bu smoke test eklendi:
 *  - AuroraChannelDetailPage.tsx en az bir tane navigate("/user/connections?channel=…") çağrısı içermeli.
 *  - Eski (silinen) `/user/channels/:id/connect` paterni kesinlikle bulunmamalı.
 *  - AuroraUserConnectionsPage.tsx `searchParams.get("channel")` okumayı korumalı.
 *  - router.tsx `connections` ve `channels/:channelId` route'larını korumalı.
 *
 * Bu testler runtime navigate çağrısı yapmaz; raw kaynak metnine bakar. Niyet
 * gelecekte birinin yanlışlıkla deep-link'i kırmasını engellemektir.
 */
import { describe, it, expect } from "vitest";

const auroraFiles: Record<string, string> = import.meta.glob(
  "../surfaces/aurora/**/*.tsx",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

const routerSrc: string = (
  import.meta.glob("../app/router.tsx", { eager: true, query: "?raw", import: "default" }) as Record<string, string>
)["../app/router.tsx"];

function read(path: string): string {
  const src = auroraFiles[path];
  if (!src) throw new Error(`Aurora kaynak bulunamadı: ${path}`);
  return src;
}

describe("Aurora channel→connections deep-link guard (Pass-6)", () => {
  it("AuroraChannelDetailPage 'Bağla' CTA connections deep-link paternine bağlı kalmalı", () => {
    const src = read("../surfaces/aurora/AuroraChannelDetailPage.tsx");
    // Pass-6'dan sonra channel detail baseRoute-aware oldu; literal `/user/connections`
    // veya `${baseRoute}/connections` paterni kabul edilir, ikisi de `?channel=…`
    // query'siyle bitmek zorunda.
    const literalDeepLink = /navigate\(\s*[`"']\/user\/connections\?channel=/.test(src);
    const baseRouteDeepLink = /navigate\(\s*`\$\{baseRoute\}\/connections\?channel=/.test(src);
    expect(
      literalDeepLink || baseRouteDeepLink,
      "Channel detail sayfasındaki 'Bağla' CTA'sı /user/connections veya ${baseRoute}/connections?channel= paternini korumalı",
    ).toBe(true);
  });

  it("Aurora yüzeyinde silinen /user/channels/:id/connect rotası geri sızmamalı", () => {
    const violations: string[] = [];
    for (const [path, src] of Object.entries(auroraFiles)) {
      if (/\/user\/channels\/\$\{[^}]+\}\/connect/.test(src)) {
        violations.push(path);
      }
    }
    expect(violations, `404 rotası geri geldi: ${violations.join(", ")}`).toEqual([]);
  });

  it("AuroraUserConnectionsPage ?channel= parametresini okumayı korumalı", () => {
    const src = read("../surfaces/aurora/AuroraUserConnectionsPage.tsx");
    expect(
      src.includes('searchParams.get("channel")'),
      "Deep-link tüketicisi searchParams.get('channel') ile okuma yapmayı korumalı",
    ).toBe(true);
  });

  it("router.tsx 'connections' ve 'channels/:channelId' rotalarını korumalı", () => {
    expect(/path:\s*['"]connections['"]/.test(routerSrc), "user/connections route eksik").toBe(true);
    expect(/path:\s*['"]channels\/:channelId['"]/.test(routerSrc), "channels/:channelId route eksik").toBe(true);
  });
});
