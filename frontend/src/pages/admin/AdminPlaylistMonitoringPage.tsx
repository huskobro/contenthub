/**
 * AdminPlaylistMonitoringPage — Faz 8H.
 *
 * Admin view for all platform playlists across all users/channels.
 * Filters: user, channel profile, platform.
 * Shows: playlist list, sync status, item counts, engagement tasks.
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePlaylists, usePlaylistSyncStatus } from "../../hooks/usePlaylists";
import { fetchChannelProfiles, type ChannelProfileResponse } from "../../api/channelProfilesApi";
import { fetchUsers, type UserResponse } from "../../api/usersApi";
import {
  PageShell,
  SectionShell,
  MetricGrid,
  MetricTile,
} from "../../components/design-system/primitives";
import type { SyncedPlaylist, PlaylistListParams } from "../../api/playlistsApi";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS = [
  { value: "", label: "Tum Platformlar" },
  { value: "youtube", label: "YouTube" },
];

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

function privacyLabel(status: string): string {
  switch (status) {
    case "public": return "Herkese Acik";
    case "unlisted": return "Liste Disi";
    default: return "Gizli";
  }
}

function syncStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "synced":
      return { label: "Synced", className: "bg-success-50 text-success-700 border-success-200" };
    case "stale":
      return { label: "Eski", className: "bg-warning-50 text-warning-700 border-warning-200" };
    case "error":
      return { label: "Hata", className: "bg-error-50 text-error-700 border-error-200" };
    default:
      return { label: status, className: "bg-neutral-50 text-neutral-600 border-neutral-200" };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminPlaylistMonitoringPage() {
  const [userFilter, setUserFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");

  // Fetch users and channels
  const { data: users } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const { data: channels } = useQuery({
    queryKey: ["channel-profiles", userFilter || "all"],
    queryFn: () => fetchChannelProfiles(userFilter || undefined),
    staleTime: 60_000,
  });

  // Sync status
  const { data: syncStatus } = usePlaylistSyncStatus();

  // Playlist list
  const listParams: PlaylistListParams = useMemo(() => {
    const p: PlaylistListParams = { limit: 200 };
    if (channelFilter) p.channel_profile_id = channelFilter;
    if (platformFilter) p.platform = platformFilter;
    return p;
  }, [channelFilter, platformFilter]);

  const { data: playlists, isLoading, isError } = usePlaylists(listParams);

  // KPIs
  const kpis = useMemo(() => {
    if (!playlists) return { total: 0, totalVideos: 0, publicCount: 0, errorCount: 0 };
    return {
      total: playlists.length,
      totalVideos: playlists.reduce((acc, p) => acc + p.item_count, 0),
      publicCount: playlists.filter((p) => p.privacy_status === "public").length,
      errorCount: playlists.filter((p) => p.sync_status === "error").length,
    };
  }, [playlists]);

  const handleUserChange = (val: string) => {
    setUserFilter(val);
    setChannelFilter("");
  };

  return (
    <PageShell
      title="Playlist Izleme"
      subtitle="Tum kullanici ve kanal playlist'lerini izleyin."
      testId="admin-playlist-monitoring"
    >
      {/* Faz 17a: Connection context link */}
      <div className="flex items-center gap-2 mb-3 text-xs text-neutral-500" data-testid="admin-playlist-connection-link">
        <span>Playlist senkronizasyon sorunlari icin:</span>
        <Link to="/admin/connections" className="text-brand-600 hover:text-brand-700 underline">
          Baglanti Durumu
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4" data-testid="admin-playlist-filters">
        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={userFilter}
          onChange={(e) => handleUserChange(e.target.value)}
          data-testid="admin-playlist-filter-user"
        >
          <option value="">Tum Kullanicilar</option>
          {users?.map((u: UserResponse) => (
            <option key={u.id} value={u.id}>{u.display_name || u.email}</option>
          ))}
        </select>

        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          data-testid="admin-playlist-filter-channel"
        >
          <option value="">Tum Kanallar</option>
          {channels?.map((ch: ChannelProfileResponse) => (
            <option key={ch.id} value={ch.id}>{ch.profile_name}</option>
          ))}
        </select>

        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          data-testid="admin-playlist-filter-platform"
        >
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <SectionShell title="Playlist Ozeti" testId="playlist-kpi">
        <MetricGrid>
          <MetricTile label="Toplam Playlist" value={String(kpis.total)} testId="metric-total-playlists" loading={isLoading} />
          <MetricTile label="Toplam Video" value={String(kpis.totalVideos)} testId="metric-total-videos" loading={isLoading} />
          <MetricTile label="Herkese Acik" value={String(kpis.publicCount)} testId="metric-public" loading={isLoading} accentColor="var(--ch-success-base)" />
          <MetricTile label="Sync Hatasi" value={String(kpis.errorCount)} testId="metric-sync-errors" loading={isLoading} accentColor="var(--ch-error-base)" />
        </MetricGrid>
      </SectionShell>

      {/* Sync Status Overview */}
      {syncStatus && syncStatus.length > 0 && (
        <SectionShell title="Sync Durumu" testId="playlist-sync-status">
          <div className="flex flex-wrap gap-3">
            {syncStatus.map((s) => {
              const badge = syncStatusBadge(s.sync_status);
              return (
                <div
                  key={s.id}
                  className="p-2 bg-surface-card border border-border-subtle rounded-md text-xs min-w-[180px]"
                >
                  <p className="m-0 font-medium text-neutral-700 truncate">{s.title}</p>
                  <p className="m-0 text-neutral-500">{s.item_count} video</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`px-1 py-0.5 rounded border ${badge.className}`}>{badge.label}</span>
                    <span className="text-neutral-400">{timeAgo(s.last_synced_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionShell>
      )}

      {/* Loading / Error */}
      {isLoading && <p className="text-sm text-neutral-500 text-center py-8">Playlist'ler yukleniyor...</p>}
      {isError && <p className="text-sm text-error-base text-center py-8">Playlist'ler yuklenirken hata olustu.</p>}

      {/* Playlist table */}
      <SectionShell title="Playlist Listesi" testId="admin-playlist-list">
        {playlists && playlists.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-4">Secilen filtrelerde playlist bulunamadi.</p>
        )}
        {playlists && playlists.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="playlist-table">
              <thead>
                <tr className="border-b border-border-subtle text-left">
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Playlist</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Video</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Gizlilik</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Platform</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Sync</th>
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500">Son Sync</th>
                </tr>
              </thead>
              <tbody>
                {playlists.map((p: SyncedPlaylist) => {
                  const sBadge = syncStatusBadge(p.sync_status);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border-subtle hover:bg-surface-hover transition-colors"
                      data-testid={`admin-playlist-row-${p.id}`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {p.thumbnail_url ? (
                            <img src={p.thumbnail_url} alt="" className="w-12 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-8 rounded bg-neutral-200 flex items-center justify-center text-xs text-neutral-400">PL</div>
                          )}
                          <span className="text-neutral-800 truncate max-w-[200px]">{p.title}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-neutral-600">{p.item_count}</td>
                      <td className="py-2 px-3 text-xs text-neutral-500">{privacyLabel(p.privacy_status)}</td>
                      <td className="py-2 px-3 text-xs text-neutral-500">{p.platform}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${sBadge.className}`}>{sBadge.label}</span>
                      </td>
                      <td className="py-2 px-3 text-xs text-neutral-400">{timeAgo(p.last_synced_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>
    </PageShell>
  );
}
