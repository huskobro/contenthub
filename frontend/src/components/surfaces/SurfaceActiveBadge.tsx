/**
 * SurfaceActiveBadge — Faz 4C usability cleanup.
 *
 * Header'a (AppHeader sag ust bolgesi) mount edilen kucuk bir rozet:
 * kullanicinin/adminin o anda gordugu panelde aktif surface'i ve neden aktif
 * oldugunu (explicit tercih mi, varsayilan mi, fallback mi) ozetler.
 *
 * Tasarim ilkeleri:
 *   - Hicbir yeni backend endpoint'i cagirmaz. `useSurfaceResolution()` zaten
 *     admin + user icin cozulen ResolvedSurface'i veriyor; bu rozet sadece
 *     uygun olani okur.
 *   - Hicbir toggle yoktur. Kullanici bu rozetten surface degistiremez —
 *     degistirmek icin mevcut SurfacePickerSection (theme management / user
 *     settings) kullanilir. Bu rozet salt bilgi.
 *   - Fallback / kill-switch / scope-mismatch zinciri asla ezilmez; sadece
 *     resolver'in donen `reason` degerine bakarak uygun kisa metin gosterir.
 *   - Dev veya settings yuklenmemis olursa nothing render edilir.
 */

import { cn } from "../../lib/cn";
import { useSurfaceResolution } from "../../surfaces/useSurfaceResolution";
import {
  resolutionReasonCategory,
  describeResolutionReason,
} from "../../surfaces/selectableSurfaces";
import type { ResolvedSurface } from "../../surfaces/contract";

export interface SurfaceActiveBadgeProps {
  /**
   * Hangi panelde render ediliyoruz? AppHeader `area="Admin" | "User"` prop'unu
   * kullaniyor, biz onunla ayni semantikte calisiriz.
   */
  area: "Admin" | "User";
  className?: string;
}

function categoryToBadgeStyle(category: "explicit" | "default" | "fallback"): {
  dotColor: string;
  label: string;
} {
  switch (category) {
    case "explicit":
      // Kullanici tercihi — marka rengi ile netlestir.
      return { dotColor: "bg-brand-500", label: "Tercihinizle" };
    case "default":
      return { dotColor: "bg-success", label: "Varsayilan" };
    case "fallback":
      // Fallback durumunda warning — kullanici bilmelidir.
      return { dotColor: "bg-warning", label: "Fallback" };
    default:
      return { dotColor: "bg-neutral-400", label: "Aktif" };
  }
}

export function SurfaceActiveBadge({ area, className }: SurfaceActiveBadgeProps) {
  const resolution = useSurfaceResolution();
  const resolved: ResolvedSurface =
    area === "Admin" ? resolution.admin : resolution.user;
  const manifest = resolved.surface.manifest;
  const category = resolutionReasonCategory(resolved.reason);
  const badge = categoryToBadgeStyle(category);
  const reasonText = describeResolutionReason(resolved.reason);

  // Short hand name for header (surface name, fallback to id).
  const surfaceName = manifest.name ?? manifest.id;

  // Full accessible tooltip — reason + scope + category.
  const tooltip = `Aktif yuzey: ${surfaceName} (${manifest.id}). ${reasonText}.`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1 rounded-md border border-border-subtle bg-surface-inset select-none",
        className,
      )}
      title={tooltip}
      aria-label={tooltip}
      data-testid={`header-surface-active-badge-${area.toLowerCase()}`}
      data-surface-id={manifest.id}
      data-reason={resolved.reason}
      data-reason-category={category}
    >
      <span
        className={cn("inline-block w-2 h-2 rounded-full shrink-0", badge.dotColor)}
        data-testid={`header-surface-active-dot-${area.toLowerCase()}`}
        aria-hidden="true"
      />
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="text-xs font-semibold font-body text-neutral-700 whitespace-nowrap"
          data-testid={`header-surface-active-name-${area.toLowerCase()}`}
        >
          {surfaceName}
        </span>
        <span
          className="text-[10px] font-medium text-neutral-500 whitespace-nowrap"
          data-testid={`header-surface-active-category-${area.toLowerCase()}`}
        >
          {badge.label}
        </span>
      </div>
    </div>
  );
}
