/**
 * Selectable surfaces helper — Faz 4A.
 *
 * Theme Management'in "surface picker" UI'si icin tek kaynak. Hem admin
 * panelindeki ThemeRegistryPage hem de kullanici tarafindaki UserSettingsPage
 * bu helper'a bakar; iki UI de ayni mantigi yeniden hesaplamaz.
 *
 * Amac
 * ----
 * `resolveActiveSurface` tamamen pure bir resolver; onun gordugu "enabled
 * surface ids" seti + registry durumu + scope bilgisiyle beraber picker
 * UI'sinin ne gostermesi gerektigini hesaplamak gerekiyor. Bu helper ayni
 * dort katmani TAM OLARAK ayni sirayla kontrol eder:
 *
 *   1. Registry'de kayitli mi (registry.ts)
 *   2. `status === "disabled"` mi (registry yine reddeder)
 *   3. `hidden === true` mi (switcher'da gizle)
 *   4. Scope scope ile uyumlu mu ("admin" / "user" / "both")
 *   5. Admin settings gate'inde (enabledSurfaceIds) mi — legacy/horizon her
 *      zaman gecer, digerleri gate'e tabidir
 *
 * Her 5 kontrol de basarili olursa surface "selectable" olarak isaretlenir
 * ve UI'da degistir butonu aktif gelir. Aksi halde "ineligible" olur ve UI
 * surface'i ya gizler ya da disabled ayrintili bir sebep etiketiyle gosterir.
 *
 * Bu helper hicbir yeni backend endpoint'i cagirmaz. Sadece mevcut registry
 * + snapshot'i okur.
 */

import type {
  Surface,
  SurfaceId,
  SurfaceManifest,
  SurfaceScope,
  SurfaceStatus,
} from "./contract";
import { listSurfaces } from "./registry";

/**
 * Picker'in bir surface'i neden "secilemez" gordugunu anlatan sebep kodu.
 *
 *   - "scope-mismatch"   : admin panelinde user-only surface (veya tersi)
 *   - "admin-gate-off"   : admin `ui.surface.{id}.enabled = false` yapmis
 *   - "status-disabled"  : registry'de `status === "disabled"` (placeholder)
 *   - "hidden"           : manifest `hidden: true` diyor (switcher'da gosterme)
 */
export type PickerIneligibleReason =
  | "scope-mismatch"
  | "admin-gate-off"
  | "status-disabled"
  | "hidden";

/** Bir surface icin picker-specific kart verisi. */
export interface SurfacePickerEntry {
  id: SurfaceId;
  manifest: SurfaceManifest;
  /** `true` ise picker'da "Aktif Et" butonu gosterilebilir. */
  selectable: boolean;
  /**
   * `selectable === false` ise neden secilemez oldugunu anlatan kod.
   * UI bunu kullanici dostu metne cevirir.
   */
  ineligibleReason: PickerIneligibleReason | null;
  /** `true` ise picker'in "su an aktif" isaretinin gosterilecegi kayit. */
  isActive: boolean;
  /**
   * Scope icin "her zaman acik" demek — legacy ve horizon icin `true`.
   * Admin gate'den bagimsiz olarak her zaman secilebilir. UI'da kucuk bir
   * "bootstrap" rozeti olarak kullanilabilir.
   */
  alwaysOn: boolean;
  /**
   * `true` ise picker'a bu surface hic sokulmamalidir. UI gizleme icin bu
   * bayraga bakar. Shipping rule'lari:
   *   - hidden + non-scope-match → entryBuild yine uretir ama this=true
   *   - UI `entries.filter(e => !e.hidden)` ile gizler
   */
  hidden: boolean;
}

export interface BuildSelectableSurfacesInput {
  scope: Exclude<SurfaceScope, "both">;
  /** Admin settings gate'i (ayni set resolver'a da beslenir). */
  enabledSurfaceIds: ReadonlySet<SurfaceId>;
  /**
   * Theme store tarafindan persist edilen kullanici tercih id'si.
   * `null` degilse, o id'ye sahip entry icin `isActive=true` olur.
   */
  activeSurfaceId: SurfaceId | null;
  /**
   * Registry okuma hook'u (testler icin mock'lanabilir). Default: module-level
   * registry.
   */
  surfaceProvider?: () => Surface[];
}

/**
 * "Bootstrap" surface'ler — resolver'da `alwaysOn = true` kontrolu ile ayni
 * mantigi paylasir. Bu iki id her zaman picker'dan secilebilir ve asla
 * "disabled" olmaz — cunku yokluklari tum UI'nin cokmesi anlamina gelir.
 */
const BOOTSTRAP_SURFACE_IDS: ReadonlySet<SurfaceId> = new Set<SurfaceId>([
  "legacy",
  "horizon",
]);

/**
 * Scope kontrolu. Helper seviyesinde bilincli olarak resolver ile **birebir
 * ayni** mantigi koruyoruz (bkz. `resolveActiveSurface.ts > candidateIsUsable`).
 */
function scopeAllows(
  surfaceScope: SurfaceScope,
  panelScope: Exclude<SurfaceScope, "both">,
): boolean {
  if (panelScope === "admin") {
    return surfaceScope === "admin" || surfaceScope === "both";
  }
  return surfaceScope === "user" || surfaceScope === "both";
}

/**
 * Tek bir surface icin picker entry uret.
 *
 * `hidden === true` olan surface'ler yine de entry olarak donulur; UI bunlari
 * `.filter((e) => !e.hidden)` ile gizler. Bu sayede unit testler hem "hidden
 * listeden cikarildi mi" hem de "hidden surface icin entry seceneklerinin
 * dogru hesaplanip hesaplanmadigini" ayni API uzerinden dogrulayabilir.
 */
export function buildSurfacePickerEntry(
  surface: Surface,
  input: Pick<BuildSelectableSurfacesInput, "scope" | "enabledSurfaceIds" | "activeSurfaceId">,
): SurfacePickerEntry {
  const { manifest } = surface;
  const status: SurfaceStatus = manifest.status;
  const hidden = Boolean(manifest.hidden);
  const alwaysOn = BOOTSTRAP_SURFACE_IDS.has(manifest.id);
  const scopeOk = scopeAllows(manifest.scope, input.scope);
  const gateOk = alwaysOn || input.enabledSurfaceIds.has(manifest.id);
  const statusOk = status !== "disabled";

  // Ineligible reason siralamasi: en "anlasilir" sebepten en teknik sebebe.
  // - hidden: kullanici zaten gorenmemeli; sebep sadece debug/test icin.
  // - status-disabled: placeholder, daha implemente edilmemis; kullaniciya
  //   "hazirlik asamasinda" diye anlat.
  // - scope-mismatch: admin paneli kullanici-only bir surface'i gosteriyorsa
  //   bu daha spesifik bir mesajdir, gate-off'un onune alinmalidir.
  // - admin-gate-off: status stable/beta ama admin kapatmis, kullaniciya
  //   "yoneticin henuz acmadi" demeliyiz.
  let ineligibleReason: PickerIneligibleReason | null = null;
  if (hidden) {
    ineligibleReason = "hidden";
  } else if (!statusOk) {
    ineligibleReason = "status-disabled";
  } else if (!scopeOk) {
    ineligibleReason = "scope-mismatch";
  } else if (!gateOk) {
    ineligibleReason = "admin-gate-off";
  }

  const selectable = ineligibleReason === null;
  const isActive =
    input.activeSurfaceId !== null && input.activeSurfaceId === manifest.id;

  return {
    id: manifest.id,
    manifest,
    selectable,
    ineligibleReason,
    isActive,
    alwaysOn,
    hidden,
  };
}

/**
 * Tum registry'deki surface'ler icin picker entry listesi uret.
 *
 * Liste sirasi:
 *   1. legacy (bootstrap — her zaman ilk)
 *   2. horizon (bootstrap — her zaman ikinci)
 *   3. digerleri manifest id'sine gore alfabetik
 *
 * Bu siralama anlamli cunku iki bootstrap surface her zaman picker'in en
 * ustunde olmali (ontolojik olarak "en guvenli" secenekler). Diger surface'ler
 * alfabetik geldigi icin aralarindaki goreli sira deterministiktir.
 *
 * UI (`SurfacePickerSection`) bu liste uzerinden calisir. `.filter(e => !e.hidden)`
 * ile gorunmez kayitlari eler, sonra `entry.selectable` ile "Aktif Et" butonu
 * gorunurlugunu ve ineligible kayitlar icin aciklama etiketini belirler.
 */
export function buildSurfacePickerEntries(
  input: BuildSelectableSurfacesInput,
): SurfacePickerEntry[] {
  const provider = input.surfaceProvider ?? listSurfaces;
  const surfaces = provider();

  const entries = surfaces.map((s) =>
    buildSurfacePickerEntry(s, input),
  );

  // Deterministik siralama: bootstrap id'leri once, sonra alfabetik.
  const sorted = [...entries].sort((a, b) => {
    const aBoot = BOOTSTRAP_SURFACE_IDS.has(a.id);
    const bBoot = BOOTSTRAP_SURFACE_IDS.has(b.id);
    if (aBoot && !bBoot) return -1;
    if (!aBoot && bBoot) return 1;
    if (aBoot && bBoot) {
      // legacy her zaman horizon'dan once.
      if (a.id === "legacy") return -1;
      if (b.id === "legacy") return 1;
      return 0;
    }
    return a.id.localeCompare(b.id);
  });

  return sorted;
}

/**
 * Yalnizca kullaniciya `gosterilecek` entry'leri don. Yani hidden'lari
 * atlamis, ama hem selectable hem de ineligible girisleri tutan bir liste.
 * UI bu listeyi kart-kart render edebilir.
 */
export function buildVisibleSurfacePickerEntries(
  input: BuildSelectableSurfacesInput,
): SurfacePickerEntry[] {
  return buildSurfacePickerEntries(input).filter((e) => !e.hidden);
}

/**
 * Picker UI'si icin "scope'a kilitli" liste — panel scope'una uymayan
 * yuzeyleri TAMAMEN gizler, bilgi karti olarak dahi gostermez.
 *
 * Fark — `buildVisibleSurfacePickerEntries` scope-mismatch kayitlarini
 * `ineligibleReason: "scope-mismatch"` olarak tutuyor ve UI bunlari
 * "bu yuzey yalniz admin panelinde" acikmalasiyla kart olarak ciziyordu.
 * Faz 4E karariyla (kullanici istegi "option a") artik:
 *
 *   - user panelde      → yalniz user-scope + both-scope surfaces
 *   - admin panelde     → yalniz admin-scope + both-scope surfaces
 *   - scope-disallowed  → hiclerden hic, liste bile degil
 *
 * Hidden kayitlar da her zaman oldugu gibi atlanir.
 *
 * Bootstrap surfaces (`legacy`, `horizon`) her iki scope icin de `both`
 * oldugundan bu filtreye takilmaz.
 */
export function buildScopedSurfacePickerEntries(
  input: BuildSelectableSurfacesInput,
): SurfacePickerEntry[] {
  return buildSurfacePickerEntries(input).filter(
    (e) => !e.hidden && e.ineligibleReason !== "scope-mismatch",
  );
}

/**
 * "Aktif olan entry hangisi?" — `SurfacePickerSection`'in aktif isareti icin
 * kullanir. Kullanici hicbir secim yapmamissa (`activeSurfaceId === null`)
 * null doner; bu "resolver default'a dusecek" demektir.
 *
 * NOT: Bu helper "su anda fiilen resolve olan surface hangisi?" sorusuna
 * cevap vermez — sadece kullanicinin LOCAL persist'i ile eslesen entry'yi
 * doner. Gercekten render'da hangi surface'in aktif oldugunu bilmek istiyorsa
 * UI `useSurfaceResolution()` cagirmalidir.
 */
export function findActivePickerEntry(
  entries: SurfacePickerEntry[],
): SurfacePickerEntry | null {
  return entries.find((e) => e.isActive) ?? null;
}

/**
 * Kullanici dostu "neden secilemez" metni.
 *
 * UI dogrudan bu string'i gosterebilir. Degistirilebilir olmasi sart degil;
 * testler bu string'leri ezmeden "dogru sebep kodu uretiliyor mu" sorusuna
 * bakar (daha saglam).
 *
 * Faz 4C: `panelScope` + `surfaceScope` opsiyonel parametreleri eklendi;
 * mevcut olursa scope-mismatch mesaji "bu yuzey yalniz X panelinde calisir"
 * seklinde zenginlestirilir. Yoksa eski genel metin korunur (geriye donuk
 * uyumluluk).
 */
export function describeIneligibleReason(
  reason: PickerIneligibleReason,
  opts?: {
    panelScope?: Exclude<SurfaceScope, "both">;
    surfaceScope?: SurfaceScope;
  },
): string {
  switch (reason) {
    case "status-disabled":
      return "Bu yuzey henuz hazirlik asamasinda. Admin registry'de disabled olarak kayitli.";
    case "scope-mismatch": {
      const ss = opts?.surfaceScope;
      const ps = opts?.panelScope;
      if (ss && ps) {
        // Faz 4D: yonlendirici (positive guidance) metinleri. Aurora-only
        // cleanup'tan sonra varsayilan urun yuzeyi her iki panelde de
        // Aurora; legacy ve horizon ise her iki panelde safety-net.
        if (ss === "admin" && ps === "user") {
          return "Bu yuzey yalnizca yonetim panelinde calisir. Kullanici panelinde Aurora, Legacy veya Horizon kullanabilirsiniz.";
        }
        if (ss === "user" && ps === "admin") {
          return "Bu yuzey yalnizca kullanici panelinde calisir. Yonetim panelinde Aurora, Legacy veya Horizon kullanabilirsiniz.";
        }
      }
      return "Bu yuzey bu panel icin uygun degil (scope mismatch).";
    }
    case "admin-gate-off":
      return "Yonetici bu yuzeyi henuz acmadi. Admin panelinden `ui.surface.{id}.enabled` ayariyla acilabilir.";
    case "hidden":
      return "Bu yuzey yalnizca dahili kullanim icin isaretli.";
    default:
      return "Bu yuzey secilebilir degil.";
  }
}

// ---------------------------------------------------------------------------
// Resolution reason — kullaniciya "hangi yol ile aktif oldu" anlaticisi
// ---------------------------------------------------------------------------

/**
 * `SurfaceResolutionReason` enum'u resolver tarafi bir telemetry kodu. Bunu
 * kullaniciya dogrudan gostermek manalarinin yarisini kaybettiriyor; kullanici
 * "explicit tercihi kendi mi yapti, varsayilan mi, fallback mi?" ayrimini
 * anlamak ister.
 *
 * `resolutionReasonCategory` o kodu UI'nin anlayabildigi bir kategoriye indirir:
 *
 *   - "explicit": kullanici acikca bu yuzeyi secti (`user-preference`)
 *   - "default":  urunsel varsayilanla aktif (`role-default`, `global-default`,
 *                 `feature-flag-forced`)
 *   - "fallback": istenen yuzey calisamiyor, guvenli moda donus
 *                 (`kill-switch-off`, `legacy-fallback`, `scope-mismatch-fallback`,
 *                 `disabled-fallback`, `missing-fallback`, `error-fallback`)
 */
export type ResolutionReasonCategory = "explicit" | "default" | "fallback";

export function resolutionReasonCategory(
  reason: string,
): ResolutionReasonCategory {
  switch (reason) {
    case "user-preference":
      return "explicit";
    case "role-default":
    case "global-default":
    case "feature-flag-forced":
      return "default";
    case "kill-switch-off":
    case "legacy-fallback":
    case "scope-mismatch-fallback":
    case "disabled-fallback":
    case "missing-fallback":
    case "error-fallback":
      return "fallback";
    default:
      return "fallback";
  }
}

/**
 * Kullanici dostu (Turkce) kisa metin — header badge ve picker "aktif" karta
 * eklenir. `reason` `SurfaceResolutionReason` enum'un degeridir.
 */
export function describeResolutionReason(reason: string): string {
  switch (reason) {
    case "user-preference":
      return "Sizin tercihiniz ile aktif";
    case "role-default":
      return "Varsayilan olarak aktif";
    case "global-default":
      return "Sistem geneli varsayilan olarak aktif";
    case "feature-flag-forced":
      return "Gelistirici override'i ile aktif";
    case "kill-switch-off":
      return "Kill switch kapali — guvenli mod (legacy) aktif";
    case "legacy-fallback":
      return "Fallback olarak aktif (istenen yuzey kullanilamadi)";
    case "scope-mismatch-fallback":
      return "Fallback: istenen yuzey bu panel scope'una uymuyor";
    case "disabled-fallback":
      return "Fallback: istenen yuzey henuz hazir degil (disabled)";
    case "missing-fallback":
      return "Fallback: istenen yuzey kayitli degil";
    case "error-fallback":
      return "Fallback: cozumlenemeyen bir hata nedeniyle legacy acildi";
    default:
      return "Aktif yuzey";
  }
}
