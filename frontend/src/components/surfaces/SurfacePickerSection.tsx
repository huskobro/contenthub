/**
 * SurfacePickerSection — Faz 4A.
 *
 * Theme Management (admin) ve UserSettingsPage (user) icindeki "yuzey secici"
 * UI'si. Kullaniciya/admin'e kendi scope'una gore kullanilabilir surface'leri
 * kart-kart gosterir, tiklanabilir olanlarda "Aktif Et" butonu acar, secilemez
 * olanlar icin "neden secilemez" etiketini gosterir.
 *
 * Tasarim ilkeleri
 * ----------------
 * 1. Hicbir yeni backend endpoint'i cagirmaz. `useSurfaceResolution()` zaten
 *    gereken `enabledSurfaceIds` setini (settings snapshot'tan) hesaplayan
 *    hook; onu iki defa yazmamak icin ayni hook'a dayaniyoruz.
 * 2. Secim persist icin `useThemeStore.setActiveSurface(id | null)` kullanir.
 *    Bu fonksiyon zaten v1 localStorage payload'i ile yazim yapiyor ve
 *    v0 -> v1 migration'u Faz 1'de kapatildi. Yeni bir hidden mekanizma YOK.
 * 3. Liste/secilebilirlik hesabi `selectableSurfaces.ts` helper'inda — hem
 *    picker UI hem de unit testler ayni API'yi kullanir; tutarsizlik imkansiz.
 * 4. Resolver ile birebir ayni 4-katman kontrolu tekrar calistiriyoruz
 *    (scope, registered, status, enabledSurfaceIds, hidden). UI'nin soyledigi
 *    "selectable" her zaman resolver'in kabul edecegi ile ayni.
 * 5. Preview-honest: gorsel "mini preview" yok. Sadece manifest metadatasindan
 *    gelen `name`, `tagline`, `tone[]`, `status`, `scope` gosteriliyor. Sahte
 *    minyatur thumbnail'larla kullaniciyi yanlis yonlendirmiyoruz.
 */

import { useMemo, useCallback, useState, useEffect } from "react";
import { cn } from "../../lib/cn";
import {
  SectionShell,
  ActionButton,
  StatusBadge,
} from "../design-system/primitives";
import { useThemeStore } from "../../stores/themeStore";
import { useSurfaceResolution } from "../../surfaces/useSurfaceResolution";
import {
  buildScopedSurfacePickerEntries,
  describeIneligibleReason,
  describeResolutionReason,
  resolutionReasonCategory,
  type SurfacePickerEntry,
} from "../../surfaces/selectableSurfaces";
import type { SurfaceId, SurfaceStatus } from "../../surfaces/contract";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SurfacePickerSectionProps {
  /**
   * Picker'i kime gosteriyoruz?
   *   - "admin": admin panelinde (ThemeRegistryPage) kullanilir, surface
   *     scope'u `admin` veya `both` olanlar listelenir.
   *   - "user": kullanici panelinde (UserSettingsPage) kullanilir, surface
   *     scope'u `user` veya `both` olanlar listelenir.
   */
  scope: "admin" | "user";
}

// ---------------------------------------------------------------------------
// Status badge variant mapping
// ---------------------------------------------------------------------------

function statusBadgeVariant(status: SurfaceStatus): {
  variant: "active" | "warning" | "neutral" | "error";
  label: string;
} {
  switch (status) {
    case "stable":
      return { variant: "active", label: "Stable" };
    case "beta":
      return { variant: "warning", label: "Beta" };
    case "alpha":
      return { variant: "warning", label: "Alpha" };
    case "disabled":
      return { variant: "error", label: "Disabled" };
    default:
      return { variant: "neutral", label: String(status) };
  }
}

function scopeLabel(surfaceScope: string): string {
  switch (surfaceScope) {
    case "admin":
      return "Admin";
    case "user":
      return "User";
    case "both":
      return "Admin + User";
    default:
      return surfaceScope;
  }
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function SurfacePickerCard({
  entry,
  scope,
  isResolvedActive,
  activeResolutionReason,
  userPreferenceUnusable,
  isRecommended,
  onActivate,
}: {
  entry: SurfacePickerEntry;
  scope: "admin" | "user";
  /**
   * `true` ise bu kart, resolver'in SU ANDA fiilen gosterdigi yuzeydir.
   * `entry.isActive` yalnizca explicit tercih ile eslesir — fallback
   * durumunda (ornek: explicit atrium secildi ama gate kapali → canvas
   * resolved), explicit tercih karti isActive=true kalirken fiili resolved
   * kart (canvas) `isResolvedActive=true` olur.
   */
  isResolvedActive: boolean;
  /**
   * Resolver'in o an dondugu reason kodu — yalnizca `isResolvedActive` olan
   * kartta reason etiketi olarak render edilir.
   */
  activeResolutionReason: string | null;
  /**
   * `true` ise kullanicinin explicit tercihi bu kartti (entry.isActive=true)
   * ama resolver onu kullanamadi (isResolvedActive=false). Kullaniciya
   * "Tercihinizdi ama simdi kullanilamiyor" mesaji gosteririz.
   */
  userPreferenceUnusable: boolean;
  /**
   * Faz 4D: `true` ise bu kart, bu panel icin sistem varsayilani olarak
   * onerilen yuzey. Kart altinda kucuk "Bu panel icin onerilen" notu gosterilir.
   */
  isRecommended: boolean;
  onActivate: (id: SurfaceId) => void;
}) {
  const { manifest } = entry;
  const status = statusBadgeVariant(manifest.status);
  const tone = manifest.tone ?? [];
  const bestFor = manifest.bestFor ?? [];

  // Reason badge sinifi — explicit/default/fallback'e gore renk.
  const reasonCategory =
    isResolvedActive && activeResolutionReason
      ? resolutionReasonCategory(activeResolutionReason)
      : null;
  const reasonBadgeClasses =
    reasonCategory === "explicit"
      ? "border-brand-400 bg-brand-50 text-brand-700"
      : reasonCategory === "default"
        ? "border-success bg-success-light text-success-text"
        : reasonCategory === "fallback"
          ? "border-warning bg-warning-light text-warning-text"
          : "border-border-subtle bg-surface-inset text-neutral-600";
  const reasonText =
    isResolvedActive && activeResolutionReason
      ? describeResolutionReason(activeResolutionReason)
      : null;

  return (
    <div
      className={cn(
        "rounded-lg p-4 transition-all duration-150",
        entry.isActive
          ? "border border-brand-400 bg-brand-50 shadow-sm"
          : entry.selectable
            ? "border border-border bg-surface-card shadow-xs hover:shadow-md"
            : "border border-border-subtle bg-surface-muted opacity-75",
      )}
      data-testid={`surface-picker-card-${manifest.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="m-0 text-base font-semibold text-neutral-900">
              {manifest.name}
            </h4>
            {isResolvedActive && (
              <span data-testid={`surface-picker-active-marker-${manifest.id}`}>
                <StatusBadge status="active" label="Aktif" size="sm" />
              </span>
            )}
            {entry.isActive && !isResolvedActive && (
              <span
                data-testid={`surface-picker-preference-marker-${manifest.id}`}
                title="Secimiz bu yuzeydi ancak resolver su anda baska bir yuzey gosteriyor (fallback)."
              >
                <StatusBadge status="warning" label="Tercih (kullanilmiyor)" size="sm" />
              </span>
            )}
            {entry.alwaysOn && (
              <span
                className="text-xs text-neutral-500 italic"
                title="Bootstrap surface — her zaman kullanilabilir"
                data-testid={`surface-picker-bootstrap-${manifest.id}`}
              >
                bootstrap
              </span>
            )}
            {/* Faz 4D: "Bu panel icin onerilen" etiketi — yalniz sistem
                varsayilani olan ve secilebilir kartlara eklenir. Kullanici
                hangi yuzeyin "resmi onerilen" oldugunu gormeli. */}
            {isRecommended && entry.selectable && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-success bg-success-light text-success-text"
                title="Bu panel icin sistem varsayilani olarak onerilen yuzey."
                data-testid={`surface-picker-recommended-${manifest.id}`}
              >
                onerilen
              </span>
            )}
          </div>
          {manifest.tagline && (
            <p className="mt-1 mb-0 text-sm text-neutral-600 leading-normal">
              {manifest.tagline}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span data-testid={`surface-picker-status-${manifest.id}`}>
            <StatusBadge status={status.variant} label={status.label} size="sm" />
          </span>
          <span
            className="text-xs text-neutral-500"
            data-testid={`surface-picker-scope-${manifest.id}`}
          >
            {scopeLabel(manifest.scope)}
          </span>
        </div>
      </div>

      {/* Faz 4C: "Ne icin uygun?" bolgesi — bestFor bullet'lari */}
      {bestFor.length > 0 && (
        <div
          className="mb-3"
          data-testid={`surface-picker-bestfor-${manifest.id}`}
        >
          <p className="m-0 mb-1 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Ne icin uygun?
          </p>
          <ul className="m-0 pl-4 list-disc text-sm text-neutral-600 leading-snug">
            {bestFor.map((item) => (
              <li
                key={item}
                data-testid={`surface-picker-bestfor-item-${manifest.id}`}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meta strip */}
      <div className="flex gap-2 text-xs text-neutral-500 mb-3 flex-wrap">
        <span>v{manifest.version}</span>
        {manifest.author && <span>{manifest.author}</span>}
        {tone.length > 0 && <span>{tone.join(", ")}</span>}
      </div>

      {/* Faz 4C: aktif kartta resolver reason etiketi */}
      {isResolvedActive && reasonText && (
        <div
          className={cn(
            "mb-3 rounded-md border px-2.5 py-1.5 text-xs font-medium",
            reasonBadgeClasses,
          )}
          data-testid={`surface-picker-reason-${manifest.id}`}
          data-reason={activeResolutionReason ?? ""}
          data-reason-category={reasonCategory ?? ""}
          role="note"
        >
          {reasonText}
        </div>
      )}

      {/* Faz 4C: explicit tercih kullanilamiyorsa kullaniciyi uyar */}
      {userPreferenceUnusable && (
        <div
          className="mb-3 rounded-md border border-warning bg-warning-light px-2.5 py-1.5 text-xs text-warning-text"
          data-testid={`surface-picker-preference-unusable-${manifest.id}`}
          role="note"
        >
          Bu yuzey sizin tercihinizdi, ancak resolver su an kullanamiyor
          (gate kapali, scope uymuyor veya kill-switch aktif). Resolver
          varsayilana ya da fallback'a dustu.
        </div>
      )}

      {/* Actions / state */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {entry.selectable ? (
          entry.isActive ? (
            <span className="text-sm text-neutral-500 italic">
              Su an secili yuzey.
            </span>
          ) : (
            <ActionButton
              variant="primary"
              size="sm"
              onClick={() => onActivate(manifest.id)}
              data-testid={`surface-picker-activate-${manifest.id}`}
            >
              Aktif Et
            </ActionButton>
          )
        ) : (
          <p
            className="m-0 text-sm text-neutral-500 italic"
            data-testid={`surface-picker-ineligible-${manifest.id}`}
          >
            {entry.ineligibleReason
              ? describeIneligibleReason(entry.ineligibleReason, {
                  panelScope: scope,
                  surfaceScope: manifest.scope,
                })
              : "Bu yuzey secilebilir degil."}
          </p>
        )}
        <span className="text-xs text-neutral-400">
          {scope === "admin" ? "Admin panel" : "Kullanici panel"}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

/**
 * Surface picker bolgesi. `ThemeRegistryPage` admin scope'uyla, `UserSettingsPage`
 * user scope'uyla kullanir.
 *
 * - Liste `buildVisibleSurfacePickerEntries` ile hesaplanir: hidden surface'ler
 *   otomatik filtrelenir, geri kalanlar selectable/ineligible olarak kart-kart
 *   gosterilir.
 * - "Varsayilana don" butonu `setActiveSurface(null)` ile explicit tercihi siler;
 *   resolver tekrar role-default / global-default kademesine duser.
 */
export function SurfacePickerSection({ scope }: SurfacePickerSectionProps) {
  const activeSurfaceId = useThemeStore((s) => s.activeSurfaceId);
  const setActiveSurface = useThemeStore((s) => s.setActiveSurface);
  const resolution = useSurfaceResolution();
  const { settings, infrastructureEnabled } = resolution;

  // Resolver'dan gelen reason — bu picker'in scope'u icin hangi yuzey
  // aktif, neden aktif bilgisini karta iletebilmek icin.
  const activeResolved = scope === "admin" ? resolution.admin : resolution.user;
  const activeResolvedId = activeResolved.surface.manifest.id;
  const activeResolvedName = activeResolved.surface.manifest.name;
  const activeResolutionReason = activeResolved.reason;

  // Faz 4D: bu panel icin sistem varsayilani (role-default). Picker'da
  // "onerilen" etiketi icin kullanilir.
  const roleDefaultId: SurfaceId | null =
    scope === "admin" ? settings.defaultAdmin : settings.defaultUser;

  // Resolver hook'unun hesapladigi ayni enabledSurfaceIds setini biz de
  // yeniden uretiyoruz. Legacy + horizon her zaman acik; aurora kendi
  // boolean flag'i ile gate'lenir. Atrium/Bridge/Canvas Aurora-only cleanup
  // dalgasinda silindi.
  const enabledSurfaceIds = useMemo<ReadonlySet<SurfaceId>>(() => {
    const set = new Set<SurfaceId>();
    set.add("legacy");
    set.add("horizon");
    if (settings.auroraEnabled) set.add("aurora");
    return set;
  }, [settings.auroraEnabled]);

  // Faz 4E: scope-disallowed yuzeyler listede hic gozukmez. User panel sadece
  // user + both scope yuzeyleri, admin panel sadece admin + both scope
  // yuzeyleri gosterir. Bkz. `buildScopedSurfacePickerEntries`.
  const entries = useMemo(
    () =>
      buildScopedSurfacePickerEntries({
        scope,
        enabledSurfaceIds,
        activeSurfaceId,
      }),
    [scope, enabledSurfaceIds, activeSurfaceId],
  );

  // Faz 4D — inline activation feedback. Toast kullanmiyoruz; kucuk, local,
  // gercek state tabanli bir satir. Kullanici "Aktif Et" basinca ne oldu,
  // anlasilir sekilde gozukur. `handleActivate` / `handleReset` tetikler,
  // resolver degisince feedback cumlesi guncel state'ten tekrar uretilir.
  type ActivationAction =
    | { kind: "activated"; id: SurfaceId }
    | { kind: "reset" }
    | null;
  const [lastAction, setLastAction] = useState<ActivationAction>(null);

  const handleActivate = useCallback(
    (id: SurfaceId) => {
      setActiveSurface(id);
      setLastAction({ kind: "activated", id });
    },
    [setActiveSurface],
  );

  const handleReset = useCallback(() => {
    setActiveSurface(null);
    setLastAction({ kind: "reset" });
  }, [setActiveSurface]);

  // scope degisirse eski feedback'i sifirla (yanliskarikanlik olmasin).
  useEffect(() => {
    setLastAction(null);
  }, [scope]);

  const hasPreference = activeSurfaceId !== null;

  // Feedback metnini gercek resolver state'inden tureten yardimci.
  const feedback = useMemo<
    { tone: "success" | "warning"; text: string } | null
  >(() => {
    if (!lastAction) return null;
    if (lastAction.kind === "reset") {
      return {
        tone: "success",
        text: `Tercihiniz temizlendi. Bu panel artik varsayilanla "${activeResolvedName}" yuzeyini gosteriyor.`,
      };
    }
    // activated
    if (lastAction.id === activeResolvedId) {
      // Resolver tercihi kabul etti.
      return {
        tone: "success",
        text: `Bu panel artik "${activeResolvedName}" ile goruntuleniyor.`,
      };
    }
    // Explicit tercih resolver tarafindan kullanilmadi — fallback.
    return {
      tone: "warning",
      text: `Tercihiniz "${lastAction.id}" alindi ancak bu panelde su an kullanilamiyor. Resolver varsayilan/fallback olarak "${activeResolvedName}" gosteriyor.`,
    };
  }, [lastAction, activeResolvedId, activeResolvedName]);

  // Faz 4D — status panel: "hangi yuzey, neden, tercihiniz ne?" sorularinin
  // tek cevabi. Dort satir, resolver raporundan dogrudan okunur.
  const statusPanelRows: Array<{
    label: string;
    value: string;
    testId: string;
    valueClassName?: string;
  }> = [
    {
      label: "Altyapi",
      value: infrastructureEnabled ? "Acik" : "Kapali",
      testId: "surface-picker-status-infra",
      valueClassName: infrastructureEnabled
        ? "text-success-text"
        : "text-warning-text",
    },
    {
      label: "Bu panelde aktif",
      value: `${activeResolvedName} (${activeResolvedId})`,
      testId: "surface-picker-status-active",
    },
    {
      label: "Neden",
      value: describeResolutionReason(activeResolutionReason),
      testId: "surface-picker-status-reason",
    },
    {
      label: "Tercihiniz",
      value: activeSurfaceId
        ? `${activeSurfaceId}${
            activeSurfaceId === activeResolvedId
              ? ""
              : " (resolver tarafindan kullanilmiyor)"
          }`
        : "yok — varsayilana giyoruz",
      testId: "surface-picker-status-preference",
    },
  ];

  return (
    <SectionShell
      title="Arayuz Yuzeyleri"
      description="Sadece bu panel icin uygun yuzeyler listelenir. Hazirlik asamasindaki veya yonetici tarafindan acilmamis olanlar secilemez olarak gosterilir."
      testId={`surface-picker-${scope}`}
      actions={
        hasPreference ? (
          <ActionButton
            variant="ghost"
            size="sm"
            onClick={handleReset}
            data-testid="surface-picker-reset"
            title="Explicit yuzey tercihini temizle. Resolver varsayilana doner."
          >
            Varsayilana don
          </ActionButton>
        ) : undefined
      }
    >
      {/* Faz 4D — aktif durum ozeti. Tek bakista: altyapi, aktif yuzey,
          neden, kullanicinin tercihi. */}
      <div
        className="mb-4 rounded-md border border-border-subtle bg-surface-inset p-3"
        data-testid={`surface-picker-status-panel-${scope}`}
        role="note"
        aria-label="Surface aktivasyon durumu"
      >
        <p className="m-0 mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          Aktivasyon durumu
        </p>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {statusPanelRows.map((row) => (
            <div
              key={row.testId}
              className="contents"
              data-testid={row.testId}
            >
              <dt className="text-neutral-500 font-medium">{row.label}</dt>
              <dd
                className={cn(
                  "m-0 text-neutral-800",
                  row.valueClassName,
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Faz 4D — inline activation feedback. Toast degil; local state'e bagli
          kisa bilgi satiri. Hicbir seyi saklamiyor — sadece soyluyor. */}
      {feedback && (
        <div
          className={cn(
            "mb-4 rounded-md border px-3 py-2 text-sm",
            feedback.tone === "success"
              ? "border-success bg-success-light text-success-text"
              : "border-warning bg-warning-light text-warning-text",
          )}
          data-testid={`surface-picker-activation-feedback-${scope}`}
          data-tone={feedback.tone}
          role="status"
        >
          {feedback.text}
        </div>
      )}

      {entries.length === 0 ? (
        <p
          className="text-sm text-neutral-500 italic"
          data-testid="surface-picker-empty"
        >
          Bu panel scope'u icin kayitli goruntulenebilir yuzey yok.
        </p>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => {
            const isResolvedActive = entry.id === activeResolvedId;
            // Explicit tercih var ama resolver onu kullanmadi.
            const userPreferenceUnusable =
              entry.isActive && !isResolvedActive;
            const isRecommended =
              roleDefaultId !== null && entry.id === roleDefaultId;
            return (
              <SurfacePickerCard
                key={entry.id}
                entry={entry}
                scope={scope}
                isResolvedActive={isResolvedActive}
                activeResolutionReason={
                  isResolvedActive ? activeResolutionReason : null
                }
                userPreferenceUnusable={userPreferenceUnusable}
                isRecommended={isRecommended}
                onActivate={handleActivate}
              />
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}
