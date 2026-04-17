/**
 * AdminConnectionsPage — Faz 17.
 *
 * Admin Connection Monitoring: all connections across all users.
 * Filters: user, channel, platform, health, reauth.
 * KPI metrics, capability summary, issues highlight.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminConnections } from "../../hooks/useConnections";
import { fetchUsers, type UserResponse } from "../../api/usersApi";
import { fetchChannelProfiles, type ChannelProfileResponse } from "../../api/channelProfilesApi";
import {
  PageShell,
  SectionShell,
  MetricGrid,
  MetricTile,
} from "../../components/design-system/primitives";
import type { ConnectionWithHealth, ConnectionHealthKPIs } from "../../api/platformConnectionsApi";
import { TokenExpiryBadge } from "../../components/publish/TokenExpiryBadge";

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

const REAUTH_OPTIONS = [
  { value: "", label: "Reauth Filtre" },
  { value: "true", label: "Reauth Gerekli" },
  { value: "false", label: "Reauth Gerekli Degil" },
];

const HEALTH_BADGE: Record<string, { label: string; className: string }> = {
  healthy: { label: "Saglikli", className: "bg-success-50 text-success-700 border-success-200" },
  partial: { label: "Kismi", className: "bg-warning-50 text-warning-700 border-warning-200" },
  disconnected: { label: "Baglanti Yok", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  reauth_required: { label: "Reauth", className: "bg-error-50 text-error-700 border-error-200" },
  token_issue: { label: "Token", className: "bg-error-50 text-error-700 border-error-200" },
  unknown: { label: "?", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

const CAPABILITY_LABELS: Record<string, string> = {
  can_publish: "Yayin",
  can_read_comments: "Yorum",
  can_reply_comments: "Yanit",
  can_read_playlists: "PL Oku",
  can_write_playlists: "PL Yaz",
  can_create_posts: "Post",
  can_read_analytics: "Analitik",
  can_sync_channel_info: "Senkron",
};

const CAP_STATUS_ICON: Record<string, { icon: string; className: string }> = {
  supported: { icon: "✓", className: "text-success-600" },
  unsupported: { icon: "—", className: "text-neutral-400" },
  blocked_by_scope: { icon: "⚠", className: "text-warning-600" },
  blocked_by_token: { icon: "✕", className: "text-error-600" },
  blocked_by_connection: { icon: "✕", className: "text-error-500" },
  unknown: { icon: "?", className: "text-neutral-400" },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "az once";
  if (mins < 60) return `${mins}dk once`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa once`;
  return `${Math.floor(hours / 24)}g once`;
}

// ---------------------------------------------------------------------------
// KPI Section
// ---------------------------------------------------------------------------

function KPISection({ kpis }: { kpis: ConnectionHealthKPIs | null }) {
  if (!kpis) return null;
  return (
    <SectionShell title="Baglanti Durumu">
      <MetricGrid>
        <MetricTile label="Toplam" value={kpis.total} />
        <MetricTile label="Saglikli" value={kpis.healthy} accentColor="success" />
        <MetricTile label="Kismi" value={kpis.partial} accentColor="warning" />
        <MetricTile label="Kopuk" value={kpis.disconnected} />
        <MetricTile label="Reauth" value={kpis.reauth_required} accentColor="error" />
        <MetricTile label="Token Sorunu" value={kpis.token_issue} accentColor="error" />
      </MetricGrid>
      <div className="mt-4 px-1">
        <p className="text-xs font-medium text-neutral-600 mb-2">Yetenek Durumu (desteklenen)</p>
        <div className="flex flex-wrap gap-3 text-xs text-neutral-600">
          <span>Yayin: {kpis.can_publish_ok}/{kpis.total}</span>
          <span>Yorum: {kpis.can_read_comments_ok}/{kpis.total}</span>
          <span>Yanit: {kpis.can_reply_comments_ok}/{kpis.total}</span>
          <span>PL Oku: {kpis.can_read_playlists_ok}/{kpis.total}</span>
          <span>PL Yaz: {kpis.can_write_playlists_ok}/{kpis.total}</span>
          <span>Analitik: {kpis.can_read_analytics_ok}/{kpis.total}</span>
          <span>Senkron: {kpis.can_sync_channel_info_ok}/{kpis.total}</span>
        </div>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Connection Row
// ---------------------------------------------------------------------------

function ConnectionRow({ conn }: { conn: ConnectionWithHealth }) {
  const badge = HEALTH_BADGE[conn.health.health_level] || HEALTH_BADGE.unknown;
  const matrix = conn.health.capability_matrix;

  return (
    <tr className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
      <td className="px-3 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          {conn.external_avatar_url ? (
            <img src={conn.external_avatar_url} alt="" className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-500">
              {conn.platform?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <p className="font-medium text-neutral-900 text-xs">{conn.external_account_name || "—"}</p>
            <p className="text-[11px] text-neutral-500">{conn.platform}{conn.is_primary ? " · Birincil" : ""}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-neutral-700">{conn.channel_profile_name || "—"}</td>
      <td className="px-3 py-2.5 text-xs text-neutral-600">{conn.user_display_name || conn.user_id || "—"}</td>
      <td className="px-3 py-2.5">
        <span className={`text-[11px] px-1.5 py-0.5 rounded-full border font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <TokenExpiryBadge connectionId={conn.id} />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(matrix).map(([key, status]) => {
            const cfg = CAP_STATUS_ICON[status] || CAP_STATUS_ICON.unknown;
            return (
              <span
                key={key}
                className={`text-[11px] font-medium ${cfg.className}`}
                title={`${CAPABILITY_LABELS[key] || key}: ${status}`}
              >
                {cfg.icon}
              </span>
            );
          })}
        </div>
      </td>
      <td className="px-3 py-2.5 text-[11px] text-neutral-500">{timeAgo(conn.last_success_at)}</td>
      <td className="px-3 py-2.5">
        {conn.health.issues.length > 0 && (
          <span className="text-[11px] text-error-600" title={conn.health.issues.join("; ")}>
            {conn.health.issues.length} sorun
          </span>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function AdminConnectionsPage() {
  const [userFilter, setUserFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");
  const [reauthFilter, setReauthFilter] = useState("");

  // Phase AM-5: tag query keys with an explicit `admin-scope` marker so
  // admin-wide caches cannot collide with per-user caches elsewhere in the
  // app. The backend scopes non-admin callers automatically; this hygiene
  // is purely about React Query cache segregation.
  const { data: users } = useQuery({
    queryKey: ["users", "admin-scope"],
    queryFn: fetchUsers,
  });
  const { data: channels } = useQuery({
    queryKey: ["channel-profiles", "admin-scope"],
    queryFn: () => fetchChannelProfiles(),
  });

  const params = useMemo(() => ({
    user_id: userFilter || undefined,
    channel_profile_id: channelFilter || undefined,
    platform: platformFilter || undefined,
    health_level: healthFilter || undefined,
    requires_reauth: reauthFilter === "true" ? true : reauthFilter === "false" ? false : undefined,
  }), [userFilter, channelFilter, platformFilter, healthFilter, reauthFilter]);

  const { data, isLoading } = useAdminConnections(params);

  const items = data?.items || [];
  const kpis = data?.kpis || null;

  return (
    <PageShell title="Baglanti Izleme" subtitle="Tum platform baglantilarinin saglik ve yetenek durumu.">
      <KPISection kpis={kpis} />

      {/* Filters */}
      <SectionShell title="Baglantilar" flush>
        <div className="flex gap-3 flex-wrap px-4 py-3 border-b border-neutral-100">
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}
            className="text-sm border border-neutral-200 rounded-md px-2 py-1.5 bg-white text-neutral-700">
            <option value="">Tum Kullanicilar</option>
            {(users || []).map((u: UserResponse) => (
              <option key={u.id} value={u.id}>{u.display_name || u.slug}</option>
            ))}
          </select>
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
            className="text-sm border border-neutral-200 rounded-md px-2 py-1.5 bg-white text-neutral-700">
            <option value="">Tum Kanallar</option>
            {(channels || []).map((ch: ChannelProfileResponse) => (
              <option key={ch.id} value={ch.id}>{ch.profile_name}</option>
            ))}
          </select>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-sm border border-neutral-200 rounded-md px-2 py-1.5 bg-white text-neutral-700">
            {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)}
            className="text-sm border border-neutral-200 rounded-md px-2 py-1.5 bg-white text-neutral-700">
            {HEALTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={reauthFilter} onChange={(e) => setReauthFilter(e.target.value)}
            className="text-sm border border-neutral-200 rounded-md px-2 py-1.5 bg-white text-neutral-700">
            {REAUTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-sm text-neutral-400">Yukleniyor...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            Filtreye uyan baglanti bulunamadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500 uppercase tracking-wider">
                  <th className="px-3 py-2 font-medium">Baglanti</th>
                  <th className="px-3 py-2 font-medium">Kanal</th>
                  <th className="px-3 py-2 font-medium">Kullanici</th>
                  <th className="px-3 py-2 font-medium">Durum</th>
                  <th className="px-3 py-2 font-medium">Token</th>
                  <th className="px-3 py-2 font-medium">Yetenekler</th>
                  <th className="px-3 py-2 font-medium">Son Basari</th>
                  <th className="px-3 py-2 font-medium">Sorunlar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((conn) => (
                  <ConnectionRow key={conn.id} conn={conn} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>
    </PageShell>
  );
}

export default AdminConnectionsPage;
