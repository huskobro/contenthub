/**
 * CanvasUserConnectionsPage — Faz 3A.
 *
 * Canvas override for `user.connections.list`. Presents platform connections
 * as a workspace health board rather than a generic card grid:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Hero: "Baglanti Merkezim" + total / reauth summary           │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ Health ribbon (saglikli / kismi / baglanti yok / reauth)     │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ Filter bar (platform / durum)                                │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ Connection cards grid                                        │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Data contract
 * -------------
 *   - useMyConnections({ platform, health_level }) — identical to legacy.
 *   - No new endpoints invented. All capability statuses come from the
 *     existing capability_matrix payload.
 */

import { useMemo, useState } from "react";
import { useMyConnections } from "../../hooks/useConnections";
import type { ConnectionWithHealth } from "../../api/platformConnectionsApi";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Constants (kept local — Canvas does not reuse the legacy card so it is
// free to present the same data with a slightly different visual language)
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tum Platformlar" },
  { value: "youtube", label: "YouTube" },
];

const HEALTH_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tum Durumlar" },
  { value: "healthy", label: "Saglikli" },
  { value: "partial", label: "Kismi" },
  { value: "disconnected", label: "Baglanti Yok" },
  { value: "reauth_required", label: "Yeniden Yetkilendir" },
  { value: "token_issue", label: "Token Sorunu" },
];

const HEALTH_BADGE: Record<string, { label: string; className: string }> = {
  healthy: {
    label: "Saglikli",
    className: "bg-success-light text-success-dark border-success-base/30",
  },
  partial: {
    label: "Kismi",
    className: "bg-warning-light text-warning-dark border-warning-base/30",
  },
  disconnected: {
    label: "Baglanti Yok",
    className: "bg-neutral-100 text-neutral-600 border-neutral-200",
  },
  reauth_required: {
    label: "Yeniden Yetkilendir",
    className: "bg-error-light text-error-dark border-error-base/30",
  },
  token_issue: {
    label: "Token Sorunu",
    className: "bg-error-light text-error-dark border-error-base/30",
  },
  unknown: {
    label: "Bilinmiyor",
    className: "bg-neutral-100 text-neutral-500 border-neutral-200",
  },
};

const CAPABILITY_LABELS: Record<string, string> = {
  can_publish: "Yayin",
  can_read_comments: "Yorum",
  can_reply_comments: "Yanit",
  can_read_playlists: "Playlist",
  can_write_playlists: "Playlist Yaz",
  can_create_posts: "Post",
  can_read_analytics: "Analitik",
  can_sync_channel_info: "Kanal Sync",
};

const CAP_STATUS_BADGE: Record<string, { icon: string; className: string }> = {
  supported: {
    icon: "✓",
    className: "bg-success-light text-success-dark",
  },
  unsupported: {
    icon: "—",
    className: "bg-neutral-100 text-neutral-500",
  },
  blocked_by_scope: {
    icon: "⚠",
    className: "bg-warning-light text-warning-dark",
  },
  blocked_by_token: {
    icon: "✕",
    className: "bg-error-light text-error-dark",
  },
  blocked_by_connection: {
    icon: "✕",
    className: "bg-error-light text-error-dark",
  },
  unknown: {
    icon: "?",
    className: "bg-neutral-100 text-neutral-500",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "az once";
  if (mins < 60) return `${mins}dk once`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa once`;
  const days = Math.floor(hours / 24);
  return `${days}g once`;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function CanvasUserConnectionsPage() {
  const [platformFilter, setPlatformFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");

  const { data, isLoading, isError } = useMyConnections({
    platform: platformFilter || undefined,
    health_level: healthFilter || undefined,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const health = useMemo(() => {
    const counts = {
      healthy: 0,
      partial: 0,
      disconnected: 0,
      reauth_required: 0,
      token_issue: 0,
    };
    for (const c of items) {
      const lvl = c.health.health_level;
      if (lvl in counts) {
        counts[lvl as keyof typeof counts] += 1;
      }
    }
    return counts;
  }, [items]);

  return (
    <div
      className="flex flex-col gap-5 max-w-[1280px]"
      data-testid="canvas-user-connections"
    >
      {/* Hero ------------------------------------------------------------- */}
      <section
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-card shadow-sm",
          "px-6 py-5 flex items-start gap-5",
        )}
        data-testid="canvas-connections-hero"
      >
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            Canvas Workspace &middot; Dagitim
          </p>
          <h1 className="m-0 mt-1 text-xl font-semibold text-neutral-900">
            Baglanti Merkezim
          </h1>
          <p className="m-0 mt-1 text-sm text-neutral-500">
            Her platform baglantisi bir yayin kanalinin uc noktasi. Yetenek
            matrisini ve saglik durumunu buradan takip et.
          </p>
        </div>
        <div
          className="shrink-0 text-xs text-neutral-500 text-right"
          data-testid="canvas-connections-hero-summary"
        >
          <div>{total} baglanti</div>
          {health.reauth_required > 0 ? (
            <div className="mt-1 text-error-dark font-semibold">
              {health.reauth_required} yeniden yetkilendirme bekliyor
            </div>
          ) : (
            <div className="mt-1 text-neutral-400">tum baglantilar stabil</div>
          )}
        </div>
      </section>

      {/* Health ribbon --------------------------------------------------- */}
      <div
        className="grid grid-cols-2 sm:grid-cols-5 gap-2"
        data-testid="canvas-connections-health-ribbon"
      >
        <HealthTile label="Saglikli" value={health.healthy} tone="success" />
        <HealthTile label="Kismi" value={health.partial} tone="warning" />
        <HealthTile
          label="Baglanti Yok"
          value={health.disconnected}
          tone="neutral"
        />
        <HealthTile
          label="Reauth"
          value={health.reauth_required}
          tone="error"
        />
        <HealthTile label="Token" value={health.token_issue} tone="error" />
      </div>

      {/* Filters --------------------------------------------------------- */}
      <div
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-card",
          "flex flex-wrap items-center gap-2 px-4 py-3",
        )}
        data-testid="canvas-connections-filters"
      >
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className={cn(
            "px-3 py-1.5 text-xs border border-border-subtle rounded-md",
            "bg-surface-card text-neutral-700",
            "focus:outline-none focus:border-brand-400",
          )}
          data-testid="canvas-connections-platform-filter"
        >
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value)}
          className={cn(
            "px-3 py-1.5 text-xs border border-border-subtle rounded-md",
            "bg-surface-card text-neutral-700",
            "focus:outline-none focus:border-brand-400",
          )}
          data-testid="canvas-connections-health-filter"
        >
          {HEALTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <div
          className="text-xs text-neutral-500 font-mono"
          data-testid="canvas-connections-count"
        >
          {items.length} / {total}
        </div>
      </div>

      {/* Grid ------------------------------------------------------------ */}
      {isError ? (
        <div
          className="rounded-xl border border-error-base/30 bg-error-light/30 p-6 text-center text-sm text-error-dark"
          data-testid="canvas-connections-error"
        >
          Baglantilar yuklenemedi.
        </div>
      ) : isLoading ? (
        <div
          className="rounded-xl border border-border-subtle bg-surface-card p-8 text-center text-sm text-neutral-500"
          data-testid="canvas-connections-loading"
        >
          Baglantilar yukleniyor...
        </div>
      ) : items.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-border-subtle bg-neutral-50/40 p-10 text-center"
          data-testid="canvas-connections-empty"
        >
          <p className="m-0 text-sm font-semibold text-neutral-700">
            Baglanti bulunamadi
          </p>
          <p className="m-0 mt-1 text-xs text-neutral-500">
            Filtreleri gevset veya kanal detayindan yeni baglanti kur.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          data-testid="canvas-connections-grid"
        >
          {items.map((conn) => (
            <ConnectionWorkspaceCard key={conn.id} conn={conn} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HealthTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "neutral" | "error";
}) {
  const toneClass =
    tone === "success"
      ? "border-success-base/20 text-success-dark"
      : tone === "warning"
      ? "border-warning-base/20 text-warning-dark"
      : tone === "error"
      ? "border-error-base/20 text-error-dark"
      : "border-border-subtle text-neutral-700";
  return (
    <div
      className={cn(
        "rounded-lg border bg-surface-card px-3 py-2",
        toneClass,
      )}
      data-testid={`canvas-connection-health-${label.toLowerCase()}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ConnectionWorkspaceCard({ conn }: { conn: ConnectionWithHealth }) {
  const [expanded, setExpanded] = useState(false);
  const badge = HEALTH_BADGE[conn.health.health_level] ?? HEALTH_BADGE.unknown;
  const matrix = conn.health.capability_matrix;

  return (
    <div
      className={cn(
        "rounded-xl border border-border-subtle bg-surface-card shadow-sm",
        "hover:border-brand-400 hover:shadow-md transition-all duration-fast",
        "overflow-hidden",
      )}
      data-testid={`canvas-connection-card-${conn.id}`}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-neutral-50/50">
        {conn.external_avatar_url ? (
          <img
            src={conn.external_avatar_url}
            alt=""
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-[11px] font-semibold text-brand-700">
            {conn.platform?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="m-0 text-sm font-semibold text-neutral-900 truncate">
            {conn.external_account_name ??
              conn.external_account_id ??
              "Isimsiz Baglanti"}
          </p>
          <p className="m-0 text-[11px] text-neutral-500">
            {conn.platform}
            {" · "}
            {conn.channel_profile_name ?? "—"}
            {conn.is_primary ? (
              <span className="ml-1 text-brand-600 font-semibold">
                birincil
              </span>
            ) : null}
          </p>
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            badge.className,
          )}
        >
          {badge.label}
        </span>
      </header>

      {/* Capability matrix */}
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(matrix).map(([key, status]) => {
            const cfg = CAP_STATUS_BADGE[status] ?? CAP_STATUS_BADGE.unknown;
            return (
              <span
                key={key}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
                  cfg.className,
                )}
                title={`${CAPABILITY_LABELS[key] ?? key}: ${status}`}
              >
                <span className="font-semibold">{cfg.icon}</span>
                {CAPABILITY_LABELS[key] ?? key}
              </span>
            );
          })}
        </div>

        {conn.health.issues.length > 0 ? (
          <div className="mt-2 space-y-1">
            {conn.health.issues.map((issue, i) => (
              <p
                key={i}
                className="m-0 text-[11px] text-error-dark bg-error-light/40 px-2 py-1 rounded"
              >
                {issue}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-4 py-2 text-[11px] text-neutral-500 border-t border-border-subtle">
        <span>Son basarili: {timeAgo(conn.last_success_at)}</span>
        <div className="flex gap-2">
          {conn.requires_reauth ? (
            <button
              type="button"
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-error-light text-error-dark border border-error-base/30"
            >
              Yeniden Bagla
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((s) => !s)}
            className="px-2 py-0.5 rounded text-[10px] bg-neutral-50 text-neutral-600 border border-border-subtle hover:bg-neutral-100"
          >
            {expanded ? "Kapat" : "Detay"}
          </button>
        </div>
      </footer>

      {expanded ? (
        <div className="px-4 py-3 text-[11px] text-neutral-600 border-t border-border-subtle space-y-1">
          <p className="m-0">
            <span className="font-semibold">Auth:</span> {conn.auth_state}
          </p>
          <p className="m-0">
            <span className="font-semibold">Token:</span> {conn.token_state}
          </p>
          <p className="m-0">
            <span className="font-semibold">Scope:</span> {conn.scope_status}
          </p>
          <p className="m-0">
            <span className="font-semibold">Sync:</span> {conn.sync_status} —{" "}
            {timeAgo(conn.last_sync_at)}
          </p>
          {conn.last_error ? (
            <p className="m-0">
              <span className="font-semibold">Son hata:</span> {conn.last_error}
            </p>
          ) : null}
          {conn.subscriber_count != null ? (
            <p className="m-0">
              <span className="font-semibold">Abone:</span>{" "}
              {conn.subscriber_count.toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
