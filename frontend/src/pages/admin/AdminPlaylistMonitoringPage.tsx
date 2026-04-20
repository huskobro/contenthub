/**
 * AdminPlaylistMonitoringPage — Faz 8H.
 *
 * Admin view for all platform playlists across all users/channels.
 * Filters: user, channel profile, platform.
 * Shows: playlist list, sync status, item counts, engagement tasks.
 */

import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePlaylists, usePlaylistSyncStatus } from "../../hooks/usePlaylists";
import { fetchChannelProfiles, type ChannelProfileResponse } from "../../api/channelProfilesApi";
import { fetchUsers, type UserResponse } from "../../api/usersApi";
import { useActiveScope } from "../../hooks/useActiveScope";
import {
  PageShell,
  SectionShell,
  MetricGrid,
  MetricTile,
  ActionButton,
  FeedbackBanner,
} from "../../components/design-system/primitives";
import type { SyncedPlaylist, PlaylistListParams } from "../../api/playlistsApi";
import {
  useDeleteYtPlaylist,
  useUpdateYtPlaylist,
} from "../../hooks/useYoutubeEngagementAdvanced";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

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

/**
 * Public entry — surface override aware (Aurora trampoline).
 * `admin.playlists.monitoring` slot kayıtlıysa onu render eder; aksi halde
 * legacy implementasyon devreye girer. register.tsx'e dokunulmaz.
 */
export function AdminPlaylistMonitoringPage() {
  const Override = useSurfacePageOverride("admin.playlists.monitoring");
  if (Override) return <Override />;
  return <LegacyAdminPlaylistMonitoringPage />;
}

function LegacyAdminPlaylistMonitoringPage() {
  // Redesign REV-2 / P0.3c:
  //   Admin scope (adminScopeStore) focused-user ise userFilter default
  //   olarak o user'a atanır. Manuel dropdown override her zaman kazanır.
  //   Scope "all" ise filter boş — mevcut davranış.
  const scope = useActiveScope();
  const scopedDefaultUser =
    scope.role === "admin" && scope.ownerUserId ? scope.ownerUserId : "";

  const [userFilter, setUserFilter] = useState<string>(scopedDefaultUser);
  const [channelFilter, setChannelFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");

  // Scope admin focus değişince userFilter manuel değilse yeni scope'a snap eder.
  useEffect(() => {
    setUserFilter((prev) => (prev === "" || prev === scopedDefaultUser ? scopedDefaultUser : prev));
  }, [scopedDefaultUser]);

  // Fetch users and channels
  const { data: users } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const { data: channels } = useQuery({
    queryKey: [
      "channel-profiles",
      userFilter || "all",
      { ownerUserId: scope.ownerUserId, isAllUsers: scope.isAllUsers },
    ],
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

  // --- Sprint 3: playlist edit/delete state ----------------------------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<"" | "public" | "unlisted" | "private">("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // The selected playlist row (for connection context)
  const editingPlaylist = useMemo<SyncedPlaylist | null>(() => {
    if (!editingId || !playlists) return null;
    return playlists.find((p) => p.id === editingId) ?? null;
  }, [editingId, playlists]);

  const editingConnId = editingPlaylist?.platform_connection_id ?? undefined;
  const updateMut = useUpdateYtPlaylist(editingConnId);
  const deleteMut = useDeleteYtPlaylist(editingConnId);

  function beginEdit(p: SyncedPlaylist) {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditDescription(p.description ?? "");
    setEditPrivacy("");
    setFeedback(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditPrivacy("");
  }

  async function savePlaylistEdit() {
    if (!editingPlaylist || editingPlaylist.platform !== "youtube") return;
    if (!editingConnId) {
      setFeedback({ type: "error", msg: "Bu playlist icin YouTube baglantisi bulunamadi." });
      return;
    }
    const patch: { title?: string; description?: string; privacy_status?: "public" | "unlisted" | "private" } = {};
    if (editTitle.trim() && editTitle.trim() !== editingPlaylist.title) patch.title = editTitle.trim();
    if (editDescription !== (editingPlaylist.description ?? "")) patch.description = editDescription;
    if (editPrivacy) patch.privacy_status = editPrivacy;
    if (Object.keys(patch).length === 0) {
      setFeedback({ type: "success", msg: "Degisiklik yok." });
      return;
    }
    try {
      const res = await updateMut.mutateAsync({
        externalPlaylistId: editingPlaylist.external_playlist_id,
        patch,
      });
      setFeedback({
        type: "success",
        msg: `Playlist guncellendi: ${res.updated_fields.join(", ") || "(yok)"}`,
      });
      setEditingId(null);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        msg: `Guncelleme hatasi: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async function deletePlaylist(p: SyncedPlaylist) {
    if (p.platform !== "youtube") {
      setFeedback({ type: "error", msg: "Yalniz YouTube playlist'leri silinebilir." });
      return;
    }
    if (!p.platform_connection_id) {
      setFeedback({ type: "error", msg: "Bu playlist icin YouTube baglantisi bulunamadi." });
      return;
    }
    if (!window.confirm(`"${p.title}" YouTube'dan ve yerel DB'den silinsin mi? Bu islem geri alinamaz.`)) return;
    // We intentionally call via the mutation hook — because `deleteMut` is
    // bound to `editingConnId`, force an edit-context first.
    setEditingId(p.id);
    try {
      await deleteMut.mutateAsync(p.external_playlist_id);
      setFeedback({ type: "success", msg: `Playlist silindi: ${p.title}` });
      setEditingId(null);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        msg: `Silme hatasi: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

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

      {/* Sprint 3: inline edit form */}
      {editingPlaylist && (
        <SectionShell
          title={`Playlist Duzenle — ${editingPlaylist.title}`}
          description="Bos birakilan alanlar degistirilmez. Gizlilik '(Degistirme)' ise dokunulmaz."
          testId="admin-playlist-edit-form"
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Baslik</span>
              <input
                type="text"
                value={editTitle}
                maxLength={150}
                onChange={(e) => setEditTitle(e.target.value)}
                className="px-3 py-2 rounded-md border border-border-default bg-surface-page"
                data-testid="admin-playlist-edit-title"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700">Aciklama</span>
              <textarea
                value={editDescription}
                maxLength={5000}
                rows={4}
                onChange={(e) => setEditDescription(e.target.value)}
                className="px-3 py-2 rounded-md border border-border-default bg-surface-page font-mono text-xs"
                data-testid="admin-playlist-edit-description"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm max-w-xs">
              <span className="font-medium text-neutral-700">Gizlilik</span>
              <select
                value={editPrivacy}
                onChange={(e) => setEditPrivacy(e.target.value as typeof editPrivacy)}
                className="px-3 py-2 rounded-md border border-border-default bg-surface-page"
                data-testid="admin-playlist-edit-privacy"
              >
                <option value="">(Degistirme)</option>
                <option value="public">Herkese Acik</option>
                <option value="unlisted">Liste Disi</option>
                <option value="private">Gizli</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <ActionButton variant="ghost" size="sm" onClick={cancelEdit} disabled={updateMut.isPending}>
                Iptal
              </ActionButton>
              <ActionButton
                variant="primary"
                size="sm"
                onClick={savePlaylistEdit}
                loading={updateMut.isPending}
                data-testid="admin-playlist-edit-save"
              >
                Kaydet
              </ActionButton>
            </div>
          </div>
        </SectionShell>
      )}

      {/* Playlist table */}
      <SectionShell
        title="Playlist Listesi"
        description="Duzenle ile YouTube baslik/aciklama/gizlilik guncellenir. Sil YouTube'dan da kaldirir."
        testId="admin-playlist-list"
      >
        {feedback && <FeedbackBanner type={feedback.type} message={feedback.msg} /> }
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
                  <th className="py-2 px-3 text-xs font-medium text-neutral-500 text-right">Islem</th>
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
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex gap-1">
                          <ActionButton
                            size="sm"
                            variant="secondary"
                            onClick={() => beginEdit(p)}
                            disabled={p.platform !== "youtube" || !p.platform_connection_id}
                            data-testid={`admin-playlist-edit-${p.id}`}
                          >
                            Duzenle
                          </ActionButton>
                          <ActionButton
                            size="sm"
                            variant="danger"
                            onClick={() => deletePlaylist(p)}
                            loading={editingId === p.id && deleteMut.isPending}
                            disabled={p.platform !== "youtube" || !p.platform_connection_id || deleteMut.isPending}
                            data-testid={`admin-playlist-delete-${p.id}`}
                          >
                            Sil
                          </ActionButton>
                        </div>
                      </td>
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
