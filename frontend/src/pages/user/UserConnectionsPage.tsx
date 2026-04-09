/**
 * UserConnectionsPage — Faz 17.
 *
 * User Connection Center: all platform connections for the current user.
 * Shows health status, capability matrix summary, reconnect CTAs.
 */

import { useState } from "react";
import { useMyConnections } from "../../hooks/useConnections";
import {
  PageShell,
  SectionShell,
} from "../../components/design-system/primitives";
import type { ConnectionWithHealth } from "../../api/platformConnectionsApi";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS = [
  { value: "", label: "Tum Platformlar" },
  { value: "youtube", label: "YouTube" },
];

const HEALTH_OPTIONS = [
  { value: "", label: "Tum Durumlar" },
  { value: "healthy", label: "Saglikli" },
  { value: "partial", label: "Kismi" },
  { value: "disconnected", label: "Baglanti Yok" },
  { value: "reauth_required", label: "Yeniden Yetkilendirme" },
  { value: "token_issue", label: "Token Sorunu" },
];

const HEALTH_BADGE: Record<string, { label: string; className: string }> = {
  healthy: { label: "Saglikli", className: "bg-success-50 text-success-700 border-success-200" },
  partial: { label: "Kismi", className: "bg-warning-50 text-warning-700 border-warning-200" },
  disconnected: { label: "Baglanti Yok", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  reauth_required: { label: "Yeniden Yetkilendir", className: "bg-error-50 text-error-700 border-error-200" },
  token_issue: { label: "Token Sorunu", className: "bg-error-50 text-error-700 border-error-200" },
  unknown: { label: "Bilinmiyor", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

const CAPABILITY_LABELS: Record<string, string> = {
  can_publish: "Yayin",
  can_read_comments: "Yorum Okuma",
  can_reply_comments: "Yorum Yanit",
  can_read_playlists: "Playlist Okuma",
  can_write_playlists: "Playlist Yazma",
  can_create_posts: "Post Olusturma",
  can_read_analytics: "Analitik",
  can_sync_channel_info: "Kanal Senkron",
};

const CAP_STATUS_ICON: Record<string, { icon: string; className: string }> = {
  supported: { icon: "✓", className: "text-success-600" },
  unsupported: { icon: "—", className: "text-neutral-400" },
  blocked_by_scope: { icon: "⚠", className: "text-warning-600" },
  blocked_by_token: { icon: "✕", className: "text-error-600" },
  blocked_by_connection: { icon: "✕", className: "text-error-500" },
  unknown: { icon: "?", className: "text-neutral-400" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
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
// Sub-components
// ---------------------------------------------------------------------------

function CapabilityBadge({ status }: { status: string }) {
  const cfg = CAP_STATUS_ICON[status] || CAP_STATUS_ICON.unknown;
  return <span className={`font-medium ${cfg.className}`}>{cfg.icon}</span>;
}

function ConnectionCard({ conn }: { conn: ConnectionWithHealth }) {
  const [expanded, setExpanded] = useState(false);
  const badge = HEALTH_BADGE[conn.health.health_level] || HEALTH_BADGE.unknown;
  const matrix = conn.health.capability_matrix;

  return (
    <div className="border border-neutral-200 rounded-lg p-4 bg-white hover:border-neutral-300 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {conn.external_avatar_url ? (
            <img src={conn.external_avatar_url} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-500">
              {conn.platform?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-neutral-900">
              {conn.external_account_name || conn.external_account_id || "Isimsiz Baglanti"}
            </p>
            <p className="text-xs text-neutral-500">
              {conn.platform} · {conn.channel_profile_name || "—"}
              {conn.is_primary && <span className="ml-1 text-primary-600 font-medium">Birincil</span>}
            </p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Capability summary row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(matrix).map(([key, status]) => (
          <div key={key} className="flex items-center gap-1 text-xs text-neutral-600" title={`${CAPABILITY_LABELS[key] || key}: ${status}`}>
            <CapabilityBadge status={status} />
            <span>{CAPABILITY_LABELS[key] || key}</span>
          </div>
        ))}
      </div>

      {/* Issues */}
      {conn.health.issues.length > 0 && (
        <div className="mb-3 space-y-1">
          {conn.health.issues.map((issue, i) => (
            <p key={i} className="text-xs text-error-600 bg-error-50 px-2 py-1 rounded">
              {issue}
            </p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>Son basarili: {timeAgo(conn.last_success_at)}</span>
        <div className="flex gap-2">
          {conn.requires_reauth && (
            <button
              className="px-2 py-1 bg-error-50 text-error-700 rounded text-xs font-medium hover:bg-error-100"
              title="Yeniden yetkilendirme sayfasina yonlendirir"
            >
              Yeniden Bagla
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1 bg-neutral-50 text-neutral-600 rounded text-xs hover:bg-neutral-100"
          >
            {expanded ? "Kapat" : "Detay"}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-neutral-100 text-xs space-y-1 text-neutral-600">
          <p><span className="font-medium">Auth:</span> {conn.auth_state}</p>
          <p><span className="font-medium">Token:</span> {conn.token_state}</p>
          <p><span className="font-medium">Scope:</span> {conn.scope_status}</p>
          <p><span className="font-medium">Sync:</span> {conn.sync_status} — {timeAgo(conn.last_sync_at)}</p>
          {conn.last_error && <p><span className="font-medium">Son hata:</span> {conn.last_error}</p>}
          {conn.subscriber_count != null && <p><span className="font-medium">Abone:</span> {conn.subscriber_count.toLocaleString()}</p>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function UserConnectionsPage() {
  const [platformFilter, setPlatformFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");

  const { data, isLoading } = useMyConnections({
    platform: platformFilter || undefined,
    health_level: healthFilter || undefined,
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <PageShell title="Baglantilarim" subtitle="Platform baglantilarinizi ve yeteneklerini goruntuleyebilirsiniz.">
      {/* Filters */}
      <SectionShell flush>
        <div className="flex gap-3 flex-wrap px-4 py-3">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-sm border border-neutral-200 rounded-md px-2 py-1.5 bg-white text-neutral-700"
          >
            {PLATFORM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="text-sm border border-neutral-200 rounded-md px-2 py-1.5 bg-white text-neutral-700"
          >
            {HEALTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="text-xs text-neutral-400 self-center">
            {total} baglanti
          </span>
        </div>
      </SectionShell>

      {/* Content */}
      {isLoading ? (
        <div className="p-8 text-sm text-neutral-400">Yukleniyor...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-neutral-500 text-sm mb-2">Henuz platform baglantiniz yok.</p>
          <p className="text-neutral-400 text-xs">
            Yayin, yorum yonetimi ve analitik icin bir platform baglantisi olusturun.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((conn) => (
            <ConnectionCard key={conn.id} conn={conn} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

export default UserConnectionsPage;
