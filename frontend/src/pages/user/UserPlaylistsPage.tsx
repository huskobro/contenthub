/**
 * UserPlaylistsPage — Faz 8D+E.
 *
 * User panel playlist management:
 * - Channel/platform filters
 * - Playlist list with item count, privacy, sync status
 * - Detail panel with items, sync action
 * - Add video to playlist action
 * - Create new playlist
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  usePlaylists,
  usePlaylistItems,
  useSyncPlaylists,
  useSyncPlaylistItems,
  useCreatePlaylist,
  useAddVideoToPlaylist,
  useRemoveVideoFromPlaylist,
} from "../../hooks/usePlaylists";
import {
  useDeleteYtPlaylist,
  useReorderYtPlaylistItem,
  useUpdateYtPlaylist,
} from "../../hooks/useYoutubeEngagementAdvanced";
import { fetchChannelProfiles, type ChannelProfileResponse } from "../../api/channelProfilesApi";
import { useAuthStore } from "../../stores/authStore";
import { ConnectionCapabilityWarning, useCapabilityStatus } from "../../components/connections/ConnectionCapabilityWarning";
import { useChannelConnection } from "../../hooks/useChannelConnection";
import {
  PageShell,
  SectionShell,
  ActionButton,
  FeedbackBanner,
} from "../../components/design-system/primitives";
import type { SyncedPlaylist, PlaylistListParams } from "../../api/playlistsApi";
import { useSurfacePageOverride } from "../../surfaces";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS = [
  { value: "", label: "Tüm Platformlar" },
  { value: "youtube", label: "YouTube" },
];

const PRIVACY_OPTIONS = [
  { value: "private", label: "Gizli" },
  { value: "unlisted", label: "Liste Dışı" },
  { value: "public", label: "Herkese Açık" },
];

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa önce`;
  const days = Math.floor(hours / 24);
  return `${days}g önce`;
}

function privacyBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "public":
      return { label: "Herkese Açık", className: "bg-success-50 text-success-700 border-success-200" };
    case "unlisted":
      return { label: "Liste Dışı", className: "bg-warning-50 text-warning-700 border-warning-200" };
    default:
      return { label: "Gizli", className: "bg-neutral-50 text-neutral-600 border-neutral-200" };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserPlaylistsPage() {
  const Override = useSurfacePageOverride("user.playlists");
  if (Override) return <Override />;
  return <LegacyUserPlaylistsPage />;
}

function LegacyUserPlaylistsPage() {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  // Filters
  const [channelFilter, setChannelFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Create playlist state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrivacy, setNewPrivacy] = useState("private");

  // Add video state
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [addVideoId, setAddVideoId] = useState("");

  // Fetch user's channel profiles
  const { data: channels } = useQuery({
    queryKey: ["channel-profiles", userId],
    queryFn: () => fetchChannelProfiles(userId || undefined),
    enabled: !!userId,
    staleTime: 60_000,
  });

  // Playlist list params
  const listParams: PlaylistListParams = useMemo(() => {
    const p: PlaylistListParams = { limit: 100 };
    if (channelFilter) p.channel_profile_id = channelFilter;
    if (platformFilter) p.platform = platformFilter;
    return p;
  }, [channelFilter, platformFilter]);

  const { data: playlists, isLoading, isError } = usePlaylists(listParams);
  const { data: playlistItems, isLoading: itemsLoading } = usePlaylistItems(selectedPlaylistId);

  const syncMutation = useSyncPlaylists();
  const syncItemsMutation = useSyncPlaylistItems();
  const createMutation = useCreatePlaylist();
  const addVideoMutation = useAddVideoToPlaylist();
  const removeVideoMutation = useRemoveVideoFromPlaylist();

  // --- User parity: playlist edit/delete/reorder ------------------------
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<"" | "public" | "unlisted" | "private">("");
  const [playlistFeedback, setPlaylistFeedback] = useState<
    { type: "success" | "error"; msg: string } | null
  >(null);

  // Faz 17a: Connection lookup for capability awareness
  const { connectionId: activeConnectionId } = useChannelConnection(channelFilter || undefined);
  const { isBlocked: readBlocked } = useCapabilityStatus(activeConnectionId, "can_read_playlists");
  const { isBlocked: writeBlocked } = useCapabilityStatus(activeConnectionId, "can_write_playlists");

  const selectedPlaylist = useMemo(() => {
    if (!selectedPlaylistId || !playlists) return null;
    return playlists.find((p) => p.id === selectedPlaylistId) ?? null;
  }, [selectedPlaylistId, playlists]);

  // Bind playlist write mutations to the selected playlist's YouTube connection.
  const selectedConnId = selectedPlaylist?.platform_connection_id ?? undefined;
  const updatePlaylistMut = useUpdateYtPlaylist(selectedConnId);
  const deletePlaylistMut = useDeleteYtPlaylist(selectedConnId);
  const reorderItemMut = useReorderYtPlaylistItem(selectedConnId);
  const playlistWriteBusy =
    updatePlaylistMut.isPending ||
    deletePlaylistMut.isPending ||
    reorderItemMut.isPending;

  function beginEditPlaylist() {
    if (!selectedPlaylist) return;
    setIsEditing(true);
    setEditTitle(selectedPlaylist.title);
    setEditDescription(selectedPlaylist.description ?? "");
    setEditPrivacy("");
    setPlaylistFeedback(null);
  }

  function cancelEditPlaylist() {
    setIsEditing(false);
    setEditTitle("");
    setEditDescription("");
    setEditPrivacy("");
  }

  async function savePlaylistEdit() {
    if (!selectedPlaylist || selectedPlaylist.platform !== "youtube") return;
    if (!selectedConnId) {
      setPlaylistFeedback({
        type: "error",
        msg: "Bu playlist için YouTube bağlantısı bulunamadı.",
      });
      return;
    }
    const patch: {
      title?: string;
      description?: string;
      privacy_status?: "public" | "unlisted" | "private";
    } = {};
    if (editTitle.trim() && editTitle.trim() !== selectedPlaylist.title)
      patch.title = editTitle.trim();
    if (editDescription !== (selectedPlaylist.description ?? ""))
      patch.description = editDescription;
    if (editPrivacy) patch.privacy_status = editPrivacy;
    if (Object.keys(patch).length === 0) {
      setPlaylistFeedback({ type: "success", msg: "Değişiklik yok." });
      return;
    }
    try {
      const res = await updatePlaylistMut.mutateAsync({
        externalPlaylistId: selectedPlaylist.external_playlist_id,
        patch,
      });
      setPlaylistFeedback({
        type: "success",
        msg: `Playlist güncellendi: ${res.updated_fields.join(", ") || "(yok)"}`,
      });
      setIsEditing(false);
    } catch (err: unknown) {
      setPlaylistFeedback({
        type: "error",
        msg: `Güncelleme hatası: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async function deleteSelectedPlaylist() {
    if (!selectedPlaylist || selectedPlaylist.platform !== "youtube") return;
    if (!selectedConnId) {
      setPlaylistFeedback({
        type: "error",
        msg: "Bu playlist için YouTube bağlantısı bulunamadı.",
      });
      return;
    }
    if (
      !window.confirm(
        `"${selectedPlaylist.title}" YouTube'dan ve yerel DB'den silinsin mi? Bu işlem geri alınamaz.`,
      )
    ) {
      return;
    }
    try {
      await deletePlaylistMut.mutateAsync(selectedPlaylist.external_playlist_id);
      setPlaylistFeedback({
        type: "success",
        msg: `Playlist silindi: ${selectedPlaylist.title}`,
      });
      setSelectedPlaylistId(null);
      setIsEditing(false);
    } catch (err: unknown) {
      setPlaylistFeedback({
        type: "error",
        msg: `Silme hatası: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async function reorderPlaylistItem(
    externalVideoId: string,
    newPosition: number,
  ) {
    if (!selectedPlaylist || !selectedConnId) return;
    try {
      await reorderItemMut.mutateAsync({
        external_playlist_id: selectedPlaylist.external_playlist_id,
        external_video_id: externalVideoId,
        position: newPosition,
      });
      setPlaylistFeedback({
        type: "success",
        msg: `Video pozisyonu güncellendi: ${newPosition + 1}`,
      });
    } catch (err: unknown) {
      setPlaylistFeedback({
        type: "error",
        msg: `Pozisyon güncelleme hatası: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Handlers
  const handleSync = () => {
    syncMutation.mutate({
      channelProfileId: channelFilter || undefined,
    });
  };

  const handleSyncItems = () => {
    if (selectedPlaylistId) {
      syncItemsMutation.mutate(selectedPlaylistId);
    }
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate(
      {
        title: newTitle.trim(),
        description: newDesc,
        privacyStatus: newPrivacy,
        channelProfileId: channelFilter || undefined,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            setShowCreateForm(false);
            setNewTitle("");
            setNewDesc("");
            setNewPrivacy("private");
          }
        },
      },
    );
  };

  const handleAddVideo = () => {
    if (!selectedPlaylistId || !addVideoId.trim() || !userId) return;
    addVideoMutation.mutate(
      {
        playlistId: selectedPlaylistId,
        videoId: addVideoId.trim(),
        userId,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            setAddVideoId("");
            setShowAddVideo(false);
          }
        },
      },
    );
  };

  const handleRemoveVideo = (externalPlaylistItemId: string) => {
    if (!selectedPlaylistId) return;
    removeVideoMutation.mutate({
      playlistId: selectedPlaylistId,
      externalPlaylistItemId,
    });
  };

  return (
    <PageShell
      title="Playlist'lerim"
      subtitle="YouTube playlist'lerinizi yönetin ve videoları organize edin."
      testId="user-playlists"
    >
      <div className="px-3 py-2 bg-info-light rounded text-xs text-info-dark mb-4" data-testid="playlist-sync-limitation-notice">
        Playlist senkronizasyonu temel CRUD düzeyindedir. Tam engagement entegrasyonu ilerleyen sürümlerde eklenecektir.
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4" data-testid="playlist-filters">
        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          data-testid="playlist-filter-channel"
        >
          <option value="">Tüm Kanallar</option>
          {channels?.map((ch: ChannelProfileResponse) => (
            <option key={ch.id} value={ch.id}>{ch.profile_name}</option>
          ))}
        </select>

        <select
          className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          data-testid="playlist-filter-platform"
        >
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          type="button"
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
          onClick={handleSync}
          disabled={syncMutation.isPending || readBlocked}
          data-testid="playlist-sync-btn"
          title={readBlocked ? "Playlist okuma yeteneği kullanılamaz" : undefined}
        >
          {syncMutation.isPending ? "Sync ediliyor..." : "YouTube'dan Senkronla"}
        </button>

        <button
          type="button"
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-brand-200 text-brand-600 bg-surface-card hover:bg-brand-50 disabled:opacity-50"
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={writeBlocked}
          data-testid="playlist-create-toggle"
          title={writeBlocked ? "Playlist yazma yeteneği kullanılamaz" : undefined}
        >
          Yeni Playlist Oluştur
        </button>
      </div>

      {/* Faz 17a: Capability warnings */}
      {channelFilter && activeConnectionId && (
        <div className="flex flex-col gap-2 mb-3">
          <ConnectionCapabilityWarning connectionId={activeConnectionId} requiredCapability="can_read_playlists" context="user" />
          <ConnectionCapabilityWarning connectionId={activeConnectionId} requiredCapability="can_write_playlists" context="user" />
        </div>
      )}

      {/* Sync result */}
      {syncMutation.isSuccess && syncMutation.data && (
        <p className="text-xs text-success-600 mb-2" data-testid="sync-result">
          {syncMutation.data.new_playlists} yeni, {syncMutation.data.updated_playlists} güncellendi
          {syncMutation.data.errors.length > 0 && ` — ${syncMutation.data.errors.length} hata`}
        </p>
      )}

      {/* Create form */}
      {showCreateForm && (
        <SectionShell title="Yeni Playlist" testId="create-playlist-form">
          <div className="flex flex-col gap-2 max-w-md">
            <input
              type="text"
              className="px-3 py-1.5 text-sm border border-border-default rounded-md"
              placeholder="Playlist adı"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              data-testid="create-playlist-title"
            />
            <textarea
              className="px-3 py-1.5 text-sm border border-border-default rounded-md resize-y min-h-[60px]"
              placeholder="Açıklama (opsiyonel)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              data-testid="create-playlist-desc"
            />
            <select
              className="px-3 py-1.5 text-sm border border-border-default rounded-md"
              value={newPrivacy}
              onChange={(e) => setNewPrivacy(e.target.value)}
              data-testid="create-playlist-privacy"
            >
              {PRIVACY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newTitle.trim()}
                data-testid="create-playlist-submit"
              >
                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </button>
              <button
                type="button"
                className="px-4 py-1.5 text-xs rounded-md border border-border-default text-neutral-600"
                onClick={() => setShowCreateForm(false)}
              >
                İptal
              </button>
            </div>
            {createMutation.isSuccess && createMutation.data?.success && (
              <p className="text-xs text-success-600">Playlist başarıyla oluşturuldu.</p>
            )}
            {createMutation.isSuccess && !createMutation.data?.success && (
              <p className="text-xs text-error-base">{createMutation.data?.error}</p>
            )}
          </div>
        </SectionShell>
      )}

      {/* Loading / Error */}
      {isLoading && <p className="text-sm text-neutral-500 text-center py-8">Playlist'ler yükleniyor...</p>}
      {isError && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-error-light flex items-center justify-center mb-3">
            <span className="text-error-base text-xl">!</span>
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-1">Yüklenemedi</h3>
          <p className="text-sm text-neutral-500">Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>
        </div>
      )}

      {/* Content: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Playlist list */}
        <div className="lg:col-span-2">
          <SectionShell title={`Playlist'ler${playlists ? ` (${playlists.length})` : ""}`} testId="playlist-list-section">
            {playlists && playlists.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                  <span className="text-neutral-400 text-xl">&empty;</span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-1">Henüz kayıt yok</h3>
                <p className="text-sm text-neutral-500 max-w-xs">Henüz playlist bulunamadı.</p>
              </div>
            )}
            <div className="flex flex-col gap-1 max-h-[600px] overflow-y-auto">
              {playlists?.map((p: SyncedPlaylist) => {
                const badge = privacyBadge(p.privacy_status);
                const isSelected = selectedPlaylistId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      isSelected
                        ? "border-brand-400 bg-brand-50"
                        : "border-border-subtle bg-surface-card hover:bg-surface-hover"
                    }`}
                    onClick={() => {
                      setSelectedPlaylistId(p.id);
                      setShowAddVideo(false);
                    }}
                    data-testid={`playlist-item-${p.id}`}
                  >
                    <div className="flex items-start gap-2">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt="" className="w-16 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-10 rounded bg-neutral-200 flex-shrink-0 flex items-center justify-center text-xs text-neutral-400">
                          PL
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 m-0 truncate">{p.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-neutral-500">{p.item_count} video</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${badge.className}`}>{badge.label}</span>
                        </div>
                        <span className="text-xs text-neutral-400">Sync: {timeAgo(p.last_synced_at)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionShell>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selectedPlaylist ? (
            <SectionShell title="Playlist Detayı" testId="playlist-detail-panel">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                {selectedPlaylist.thumbnail_url ? (
                  <img src={selectedPlaylist.thumbnail_url} alt="" className="w-24 h-16 rounded object-cover" />
                ) : (
                  <div className="w-24 h-16 rounded bg-neutral-200 flex items-center justify-center text-neutral-400">PL</div>
                )}
                <div>
                  <p className="text-base font-medium text-neutral-800 m-0">{selectedPlaylist.title}</p>
                  <p className="text-xs text-neutral-500 m-0 mt-0.5">
                    {selectedPlaylist.item_count} video &middot; {privacyBadge(selectedPlaylist.privacy_status).label} &middot; {selectedPlaylist.platform}
                  </p>
                  {selectedPlaylist.description && (
                    <p className="text-sm text-neutral-600 m-0 mt-1">{selectedPlaylist.description}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  className="px-3 py-1 text-xs rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                  onClick={handleSyncItems}
                  disabled={syncItemsMutation.isPending}
                  data-testid="sync-items-btn"
                >
                  {syncItemsMutation.isPending ? "Sync ediliyor..." : "Item'ları Senkronla"}
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs rounded-md border border-brand-200 text-brand-600 hover:bg-brand-50"
                  onClick={() => setShowAddVideo(!showAddVideo)}
                  data-testid="toggle-add-video"
                >
                  Video Ekle
                </button>
                {selectedPlaylist.platform === "youtube" && (
                  <>
                    <ActionButton
                      variant="secondary"
                      size="sm"
                      onClick={beginEditPlaylist}
                      disabled={playlistWriteBusy || writeBlocked}
                      data-testid="user-playlist-edit"
                    >
                      Düzenle
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      size="sm"
                      onClick={deleteSelectedPlaylist}
                      disabled={playlistWriteBusy || writeBlocked}
                      loading={deletePlaylistMut.isPending}
                      data-testid="user-playlist-delete"
                    >
                      Playlist'i Sil
                    </ActionButton>
                  </>
                )}
              </div>

              {playlistFeedback && (
                <div className="mb-3">
                  <FeedbackBanner
                    type={playlistFeedback.type}
                    message={playlistFeedback.msg}
                  />
                </div>
              )}

              {isEditing && selectedPlaylist.platform === "youtube" && (
                <SectionShell
                  title="Playlist'i Düzenle"
                  testId="user-playlist-edit-form"
                >
                  <div className="flex flex-col gap-2 max-w-md">
                    <input
                      type="text"
                      className="px-3 py-1.5 text-sm border border-border-default rounded-md"
                      placeholder="Playlist adı"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      data-testid="user-playlist-edit-title"
                    />
                    <textarea
                      className="px-3 py-1.5 text-sm border border-border-default rounded-md resize-y min-h-[60px]"
                      placeholder="Açıklama (opsiyonel)"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      data-testid="user-playlist-edit-desc"
                    />
                    <select
                      className="px-3 py-1.5 text-sm border border-border-default rounded-md"
                      value={editPrivacy}
                      onChange={(e) =>
                        setEditPrivacy(e.target.value as typeof editPrivacy)
                      }
                      data-testid="user-playlist-edit-privacy"
                    >
                      <option value="">Gizlilik değiştirme</option>
                      {PRIVACY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <ActionButton
                        variant="primary"
                        size="sm"
                        onClick={savePlaylistEdit}
                        disabled={playlistWriteBusy}
                        loading={updatePlaylistMut.isPending}
                        data-testid="user-playlist-edit-save"
                      >
                        Kaydet
                      </ActionButton>
                      <ActionButton
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditPlaylist}
                        disabled={playlistWriteBusy}
                        data-testid="user-playlist-edit-cancel"
                      >
                        İptal
                      </ActionButton>
                    </div>
                  </div>
                </SectionShell>
              )}

              {syncItemsMutation.isSuccess && syncItemsMutation.data && (
                <p className="text-xs text-success-600 mb-2">
                  {syncItemsMutation.data.new_items} yeni, {syncItemsMutation.data.updated_items} güncellendi
                </p>
              )}

              {/* Add video form */}
              {showAddVideo && (
                <div className="p-3 bg-surface-page rounded-md border border-border-subtle mb-3" data-testid="add-video-form">
                  <p className="text-xs font-medium text-neutral-600 m-0 mb-2">Video Ekle</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-1.5 text-sm border border-border-default rounded-md"
                      placeholder="YouTube Video ID (örn: dQw4w9WgXcQ)"
                      value={addVideoId}
                      onChange={(e) => setAddVideoId(e.target.value)}
                      data-testid="add-video-id-input"
                    />
                    <button
                      type="button"
                      className="px-4 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                      onClick={handleAddVideo}
                      disabled={addVideoMutation.isPending || !addVideoId.trim()}
                      data-testid="add-video-submit"
                    >
                      {addVideoMutation.isPending ? "Ekleniyor..." : "Ekle"}
                    </button>
                  </div>
                  {addVideoMutation.isSuccess && addVideoMutation.data?.success && (
                    <p className="text-xs text-success-600 mt-1">Video başarıyla eklendi.</p>
                  )}
                  {addVideoMutation.isSuccess && !addVideoMutation.data?.success && (
                    <p className="text-xs text-error-base mt-1">{addVideoMutation.data?.error}</p>
                  )}
                </div>
              )}

              {/* Items list */}
              <div className="border-t border-border-subtle pt-3">
                <p className="text-xs font-medium text-neutral-600 m-0 mb-2">
                  Videolar ({playlistItems?.length ?? 0})
                </p>
                {itemsLoading && <p className="text-xs text-neutral-500">Yükleniyor...</p>}
                {playlistItems && playlistItems.length === 0 && (
                  <p className="text-xs text-neutral-500">Bu playlist'te henüz video yok. Item'ları senkronlayın veya video ekleyin.</p>
                )}
                <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto">
                  {playlistItems?.map((item, idx) => {
                    const canReorder =
                      selectedPlaylist?.platform === "youtube" &&
                      !!item.external_playlist_item_id &&
                      !!selectedConnId;
                    const canMoveUp = canReorder && idx > 0;
                    const canMoveDown =
                      canReorder &&
                      playlistItems !== undefined &&
                      idx < playlistItems.length - 1;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-md border border-border-subtle bg-surface-card"
                        data-testid={`playlist-video-${item.id}`}
                      >
                        {item.thumbnail_url ? (
                          <img
                            src={item.thumbnail_url}
                            alt=""
                            className="w-16 h-10 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-10 rounded bg-neutral-200 flex-shrink-0 flex items-center justify-center text-xs text-neutral-400">
                            VID
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-800 m-0 truncate">
                            {item.title || item.external_video_id}
                          </p>
                          <p className="text-xs text-neutral-400 m-0">
                            #{item.position} &middot; {item.external_video_id}
                          </p>
                        </div>
                        {canReorder && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              className="text-xs text-neutral-500 hover:text-brand-600 disabled:text-neutral-300 px-1"
                              onClick={() =>
                                reorderPlaylistItem(
                                  item.external_video_id,
                                  Math.max(0, item.position - 1),
                                )
                              }
                              disabled={!canMoveUp || reorderItemMut.isPending}
                              aria-label="Yukarı taşı"
                              data-testid={`user-playlist-reorder-up-${item.id}`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="text-xs text-neutral-500 hover:text-brand-600 disabled:text-neutral-300 px-1"
                              onClick={() =>
                                reorderPlaylistItem(
                                  item.external_video_id,
                                  item.position + 1,
                                )
                              }
                              disabled={!canMoveDown || reorderItemMut.isPending}
                              aria-label="Aşağı taşı"
                              data-testid={`user-playlist-reorder-down-${item.id}`}
                            >
                              ↓
                            </button>
                          </div>
                        )}
                        {item.external_playlist_item_id && (
                          <button
                            type="button"
                            className="text-xs text-error-base hover:text-error-700 px-2 py-1"
                            onClick={() =>
                              handleRemoveVideo(item.external_playlist_item_id!)
                            }
                            disabled={removeVideoMutation.isPending}
                            data-testid={`remove-video-${item.id}`}
                          >
                            Çıkar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionShell>
          ) : (
            <SectionShell title="Playlist Detayı" testId="playlist-detail-empty">
              <p className="text-sm text-neutral-500 text-center py-8">
                Detayını görmek için bir playlist seçin.
              </p>
            </SectionShell>
          )}
        </div>
      </div>
    </PageShell>
  );
}
