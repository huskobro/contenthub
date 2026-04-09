/**
 * ConnectionCapabilityWarning — Faz 17 + 17a.
 *
 * Reusable cross-module component for capability-aware UX.
 *
 * Modes:
 *   banner  — full warning banner (default)
 *   inline  — compact inline text
 *   guard   — renders children only if capability is supported; else shows blocked state
 *
 * Usage:
 *   <ConnectionCapabilityWarning connectionId={id} requiredCapability="can_publish" />
 *   <ConnectionCapabilityWarning connectionId={id} requiredCapability="can_read_comments" mode="inline" />
 *   <ConnectionCapabilityWarning connectionId={id} requiredCapability="can_reply_comments" mode="guard">
 *     <ReplyButton />
 *   </ConnectionCapabilityWarning>
 */

import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useConnectionCapability } from "../../hooks/useConnections";

// ---------------------------------------------------------------------------
// Shared constants — exported so modules can reuse labels
// ---------------------------------------------------------------------------

export const CAPABILITY_LABELS: Record<string, string> = {
  can_publish: "Yayin yapma",
  can_read_comments: "Yorum okuma",
  can_reply_comments: "Yorum yanitlama",
  can_read_playlists: "Playlist okuma",
  can_write_playlists: "Playlist yazma",
  can_create_posts: "Post olusturma",
  can_read_analytics: "Analitik okuma",
  can_sync_channel_info: "Kanal senkronizasyonu",
};

export const STATUS_MESSAGES: Record<string, string> = {
  unsupported: "Platform bu ozelligi desteklemiyor.",
  blocked_by_scope: "Yetki (scope) eksik — yeniden yetkilendirme gerekebilir.",
  blocked_by_token: "Token gecersiz veya suresi dolmus.",
  blocked_by_connection: "Baglanti kopuk veya yeniden yetkilendirme gerekli.",
  unknown: "Durum belirlenemedi.",
};

export const STATUS_CTA: Record<string, string> = {
  unsupported: "Detaylari Gor",
  blocked_by_scope: "Izinleri Guncelle",
  blocked_by_token: "Yeniden Bagla",
  blocked_by_connection: "Yeniden Bagla",
  unknown: "Baglanti Merkezine Git",
};

// ---------------------------------------------------------------------------
// Hook: useCapabilityStatus — lightweight check for action guards
// ---------------------------------------------------------------------------

export function useCapabilityStatus(
  connectionId: string | undefined,
  capability: string,
): { isBlocked: boolean; status: string | null; isLoading: boolean } {
  const { data: matrix, isLoading } = useConnectionCapability(connectionId);
  if (isLoading || !matrix) return { isBlocked: false, status: null, isLoading };
  const s = matrix[capability];
  return { isBlocked: !!s && s !== "supported", status: s || null, isLoading: false };
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

interface Props {
  connectionId: string | undefined;
  requiredCapability: string;
  /** Display mode */
  mode?: "banner" | "inline" | "guard";
  /** Panel context — determines CTA link target */
  context?: "user" | "admin";
  /** Children rendered when mode=guard and capability is supported */
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConnectionCapabilityWarning({
  connectionId,
  requiredCapability,
  mode = "banner",
  context = "user",
  children,
}: Props) {
  const { data: matrix, isLoading } = useConnectionCapability(connectionId);

  // While loading or no data, pass through children (optimistic)
  if (isLoading || !matrix) {
    return mode === "guard" ? <>{children}</> : null;
  }

  const status = matrix[requiredCapability];
  if (!status || status === "supported") {
    return mode === "guard" ? <>{children}</> : null;
  }

  const capLabel = CAPABILITY_LABELS[requiredCapability] || requiredCapability;
  const statusMsg = STATUS_MESSAGES[status] || STATUS_MESSAGES.unknown;
  const ctaLabel = STATUS_CTA[status] || STATUS_CTA.unknown;
  const linkTarget = context === "admin" ? "/admin/connections" : "/user/connections";

  // Severity-based styling
  const isError = status === "blocked_by_token" || status === "blocked_by_connection";
  const bgClass = isError
    ? "bg-error-50 border-error-200 text-error-800"
    : status === "unsupported"
      ? "bg-neutral-50 border-neutral-200 text-neutral-700"
      : "bg-warning-50 border-warning-200 text-warning-800";
  const iconClass = isError ? "text-error-600" : status === "unsupported" ? "text-neutral-400" : "text-warning-600";
  const linkClass = isError ? "text-error-700 hover:text-error-900" : "text-warning-800 hover:text-warning-900";

  // --- Inline mode ---
  if (mode === "inline") {
    return (
      <span className={`text-xs ${isError ? "text-error-600" : "text-warning-600"}`} title={statusMsg}>
        ⚠ {capLabel} kullanilamaz
      </span>
    );
  }

  // --- Guard mode ---
  if (mode === "guard") {
    return (
      <div className={`flex items-start gap-2 px-3 py-2.5 border rounded-md text-xs ${bgClass}`}>
        <span className={`font-bold mt-0.5 ${iconClass}`}>
          {status === "unsupported" ? "—" : "⚠"}
        </span>
        <div className="flex-1">
          <p className="font-medium">{capLabel} yetenegi kullanilamaz</p>
          <p className="mt-0.5 opacity-80">{statusMsg}</p>
          <Link to={linkTarget} className={`underline mt-1 inline-block ${linkClass}`}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    );
  }

  // --- Banner mode (default) ---
  return (
    <div className={`flex items-start gap-2 px-3 py-2 border rounded-md text-xs ${bgClass}`}>
      <span className={`font-bold mt-0.5 ${iconClass}`}>
        {status === "unsupported" ? "—" : "⚠"}
      </span>
      <div className="flex-1">
        <p className="font-medium">{capLabel} yetenegi kullanilamaz</p>
        <p className="mt-0.5 opacity-80">{statusMsg}</p>
        <Link to={linkTarget} className={`underline mt-1 inline-block ${linkClass}`}>
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
