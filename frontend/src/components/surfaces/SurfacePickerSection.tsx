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

import { useMemo, useCallback } from "react";
import { cn } from "../../lib/cn";
import {
  SectionShell,
  ActionButton,
  StatusBadge,
} from "../design-system/primitives";
import { useThemeStore } from "../../stores/themeStore";
import { useSurfaceResolution } from "../../surfaces/useSurfaceResolution";
import {
  buildVisibleSurfacePickerEntries,
  describeIneligibleReason,
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
  onActivate,
}: {
  entry: SurfacePickerEntry;
  scope: "admin" | "user";
  onActivate: (id: SurfaceId) => void;
}) {
  const { manifest } = entry;
  const status = statusBadgeVariant(manifest.status);
  const tone = manifest.tone ?? [];

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
            {entry.isActive && (
              <span data-testid={`surface-picker-active-marker-${manifest.id}`}>
                <StatusBadge status="active" label="Aktif" size="sm" />
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

      {/* Meta strip */}
      <div className="flex gap-2 text-xs text-neutral-500 mb-3 flex-wrap">
        <span>v{manifest.version}</span>
        {manifest.author && <span>{manifest.author}</span>}
        {tone.length > 0 && <span>{tone.join(", ")}</span>}
      </div>

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
              ? describeIneligibleReason(entry.ineligibleReason)
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
  const { settings } = useSurfaceResolution();

  // Resolver hook'unun hesapladigi ayni enabledSurfaceIds setini biz de
  // yeniden uretiyoruz. Legacy + horizon her zaman acik; digerleri admin
  // settings'te boolean flag ile gate'lenir.
  const enabledSurfaceIds = useMemo<ReadonlySet<SurfaceId>>(() => {
    const set = new Set<SurfaceId>();
    set.add("legacy");
    set.add("horizon");
    if (settings.atriumEnabled) set.add("atrium");
    if (settings.bridgeEnabled) set.add("bridge");
    if (settings.canvasEnabled) set.add("canvas");
    return set;
  }, [settings.atriumEnabled, settings.bridgeEnabled, settings.canvasEnabled]);

  const entries = useMemo(
    () =>
      buildVisibleSurfacePickerEntries({
        scope,
        enabledSurfaceIds,
        activeSurfaceId,
      }),
    [scope, enabledSurfaceIds, activeSurfaceId],
  );

  const handleActivate = useCallback(
    (id: SurfaceId) => {
      setActiveSurface(id);
    },
    [setActiveSurface],
  );

  const handleReset = useCallback(() => {
    setActiveSurface(null);
  }, [setActiveSurface]);

  const hasPreference = activeSurfaceId !== null;

  return (
    <SectionShell
      title="Arayuz Yuzeyleri"
      description="Kendi panel scope'unuza uygun, registry'de kayitli yuzeyler listelenir. Disabled/scope-mismatch olanlar secilemez — sebep aciklamasi altlarinda gosterilir."
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
      {entries.length === 0 ? (
        <p
          className="text-sm text-neutral-500 italic"
          data-testid="surface-picker-empty"
        >
          Bu panel scope'u icin kayitli goruntulenebilir yuzey yok.
        </p>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <SurfacePickerCard
              key={entry.id}
              entry={entry}
              scope={scope}
              onActivate={handleActivate}
            />
          ))}
        </div>
      )}
    </SectionShell>
  );
}
