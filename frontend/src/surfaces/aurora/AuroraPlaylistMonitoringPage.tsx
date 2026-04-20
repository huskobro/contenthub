/**
 * AuroraPlaylistMonitoringPage — Aurora Dusk Cockpit / Playlist İzleme (admin).
 *
 * Slot: `admin.playlists.monitoring` (rota: /admin/playlists)
 * Veri: usePlaylists + usePlaylistSyncStatus + fetchUsers + fetchChannelProfiles
 *
 * Tasarım hedefi:
 *   - Sol/üst: filter çubuğu (kullanıcı, kanal, platform) + playlist tablosu
 *     (kanal, isim, video sayısı, gizlilik, sync durumu, son güncelleme)
 *   - Sağ: Aurora Inspector — toplam playlist, toplam video, en uzun playlist,
 *     son güncellenen, sync özeti
 *
 * Trampoline: Legacy AdminPlaylistMonitoringPage `useSurfacePageOverride` ile
 * `admin.playlists.monitoring` slot'una bu sayfayı bağlar (register.tsx
 * dokunulmaz; surface manifest sistemi bu kaydı kendi yerinde tutar).
 */
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  usePlaylists,
  usePlaylistSyncStatus,
} from "../../hooks/usePlaylists";
import {
  fetchChannelProfiles,
  type ChannelProfileResponse,
} from "../../api/channelProfilesApi";
import { fetchUsers, type UserResponse } from "../../api/usersApi";
import { useActiveScope } from "../../hooks/useActiveScope";
import type {
  SyncedPlaylist,
  PlaylistListParams,
} from "../../api/playlistsApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
  type AuroraStatusTone,
} from "./primitives";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS = [
  { value: "", label: "Tüm platformlar" },
  { value: "youtube", label: "YouTube" },
];

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}sn önce`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}sa önce`;
  const day = Math.floor(hr / 24);
  return `${day}g önce`;
}

function privacyLabel(status: string): string {
  switch (status) {
    case "public":
      return "Herkese açık";
    case "unlisted":
      return "Liste dışı";
    case "private":
      return "Gizli";
    default:
      return status || "—";
  }
}

function syncTone(
  status: string,
): { label: string; tone: AuroraStatusTone } {
  switch (status) {
    case "synced":
      return { label: "synced", tone: "success" };
    case "stale":
      return { label: "eski", tone: "warning" };
    case "error":
      return { label: "hata", tone: "danger" };
    case "pending":
      return { label: "bekliyor", tone: "info" };
    default:
      return { label: status || "—", tone: "neutral" };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuroraPlaylistMonitoringPage() {
  // Admin scope focus → default user filter (legacy davranışla aynı).
  const scope = useActiveScope();
  const scopedDefaultUser =
    scope.role === "admin" && scope.ownerUserId ? scope.ownerUserId : "";

  const [userFilter, setUserFilter] = useState<string>(scopedDefaultUser);
  const [channelFilter, setChannelFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");

  useEffect(() => {
    setUserFilter((prev) =>
      prev === "" || prev === scopedDefaultUser ? scopedDefaultUser : prev,
    );
  }, [scopedDefaultUser]);

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

  const { data: syncStatus } = usePlaylistSyncStatus();

  const listParams: PlaylistListParams = useMemo(() => {
    const p: PlaylistListParams = { limit: 200 };
    if (channelFilter) p.channel_profile_id = channelFilter;
    if (platformFilter) p.platform = platformFilter;
    return p;
  }, [channelFilter, platformFilter]);

  const {
    data: playlists,
    isLoading,
    isError,
    error,
  } = usePlaylists(listParams);

  const list: SyncedPlaylist[] = playlists ?? [];

  const channelById = useMemo(() => {
    const m = new Map<string, ChannelProfileResponse>();
    for (const c of channels ?? []) m.set(c.id, c);
    return m;
  }, [channels]);

  const stats = useMemo(() => {
    const total = list.length;
    const totalVideos = list.reduce((acc, p) => acc + (p.item_count ?? 0), 0);
    const publicCount = list.filter((p) => p.privacy_status === "public").length;
    const errorCount = list.filter((p) => p.sync_status === "error").length;
    const longest = list.reduce<SyncedPlaylist | null>(
      (best, p) =>
        best === null || (p.item_count ?? 0) > (best.item_count ?? 0) ? p : best,
      null,
    );
    const recent = list.reduce<SyncedPlaylist | null>((best, p) => {
      if (!p.last_synced_at) return best;
      if (!best || !best.last_synced_at) return p;
      return new Date(p.last_synced_at).getTime() >
        new Date(best.last_synced_at).getTime()
        ? p
        : best;
    }, null);
    return { total, totalVideos, publicCount, errorCount, longest, recent };
  }, [list]);

  function handleUserChange(val: string) {
    setUserFilter(val);
    setChannelFilter("");
  }

  function clearFilters() {
    setUserFilter(scopedDefaultUser);
    setChannelFilter("");
    setPlatformFilter("");
  }

  // -------------------------------------------------------------------------
  // Inspector
  // -------------------------------------------------------------------------

  const inspector = (
    <AuroraInspector title="Playlist İzleme">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam playlist" value={String(stats.total)} />
        <AuroraInspectorRow label="toplam video" value={String(stats.totalVideos)} />
        <AuroraInspectorRow
          label="herkese açık"
          value={String(stats.publicCount)}
        />
        <AuroraInspectorRow
          label="sync hatası"
          value={String(stats.errorCount)}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="En uzun playlist">
        {stats.longest ? (
          <>
            <AuroraInspectorRow label="başlık" value={stats.longest.title} />
            <AuroraInspectorRow
              label="video sayısı"
              value={String(stats.longest.item_count ?? 0)}
            />
            <AuroraInspectorRow
              label="platform"
              value={stats.longest.platform}
            />
          </>
        ) : (
          <AuroraInspectorRow label="durum" value="—" />
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Son güncellenen">
        {stats.recent ? (
          <>
            <AuroraInspectorRow label="başlık" value={stats.recent.title} />
            <AuroraInspectorRow
              label="zaman"
              value={timeAgo(stats.recent.last_synced_at)}
            />
            <AuroraInspectorRow
              label="durum"
              value={syncTone(stats.recent.sync_status).label}
            />
          </>
        ) : (
          <AuroraInspectorRow label="durum" value="—" />
        )}
      </AuroraInspectorSection>

      {(userFilter || channelFilter || platformFilter) && (
        <AuroraInspectorSection title="Filtre">
          <div style={{ marginTop: 4 }}>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              style={{ width: "100%" }}
            >
              Filtreleri temizle
            </AuroraButton>
          </div>
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Playlist izleme</h1>
            <div className="sub">
              Tüm kullanıcı ve kanal playlist'lerini tek panelden izleyin.
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {stats.total} playlist · {stats.totalVideos} video
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div
          className="card card-pad"
          style={{
            marginBottom: 14,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
          data-testid="aurora-playlist-filters"
        >
          <FilterField label="Kullanıcı">
            <select
              value={userFilter}
              onChange={(e) => handleUserChange(e.target.value)}
              data-testid="aurora-playlist-filter-user"
              style={selectStyle}
            >
              <option value="">Tüm kullanıcılar</option>
              {users?.map((u: UserResponse) => (
                <option key={u.id} value={u.id}>
                  {u.display_name || u.email}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Kanal">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              data-testid="aurora-playlist-filter-channel"
              style={selectStyle}
            >
              <option value="">Tüm kanallar</option>
              {channels?.map((ch: ChannelProfileResponse) => (
                <option key={ch.id} value={ch.id}>
                  {ch.handle ?? ch.profile_name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Platform">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              data-testid="aurora-playlist-filter-platform"
              style={selectStyle}
            >
              {PLATFORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FilterField>
        </div>

        {/* Sync overview strip */}
        {syncStatus && syncStatus.length > 0 && (
          <div
            className="card card-pad"
            style={{
              marginBottom: 14,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
            data-testid="aurora-playlist-sync-strip"
          >
            {syncStatus.slice(0, 8).map((s) => {
              const tone = syncTone(s.sync_status);
              return (
                <div
                  key={s.id}
                  style={{
                    minWidth: 180,
                    padding: "8px 10px",
                    border: "1px solid var(--border-default)",
                    borderRadius: 6,
                    background: "var(--bg-inset)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--text-muted)",
                      marginTop: 2,
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    <AuroraStatusChip tone={tone.tone}>{tone.label}</AuroraStatusChip>
                    <span>{s.item_count} video</span>
                    <span>·</span>
                    <span>{timeAgo(s.last_synced_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading / error / empty */}
        {isLoading && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", color: "var(--text-muted)" }}
          >
            Yükleniyor…
          </div>
        )}

        {isError && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
          </div>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--text-muted)",
            }}
          >
            Seçilen filtrelerde playlist bulunamadı.
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && list.length > 0 && (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="reg-tbl" data-testid="aurora-playlist-table">
              <thead>
                <tr>
                  <th>Kanal</th>
                  <th>Playlist</th>
                  <th style={{ textAlign: "right" }}>Video</th>
                  <th>Gizlilik</th>
                  <th>Platform</th>
                  <th>Sync</th>
                  <th>Son güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const ch = p.channel_profile_id
                    ? channelById.get(p.channel_profile_id)
                    : null;
                  const tone = syncTone(p.sync_status);
                  return (
                    <tr
                      key={p.id}
                      data-testid={`aurora-playlist-row-${p.id}`}
                    >
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {ch?.handle ?? ch?.profile_name ?? "—"}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {p.thumbnail_url ? (
                            <img
                              src={p.thumbnail_url}
                              alt=""
                              style={{
                                width: 36,
                                height: 24,
                                objectFit: "cover",
                                borderRadius: 3,
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 36,
                                height: 24,
                                borderRadius: 3,
                                background: "var(--bg-inset)",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 9,
                                color: "var(--text-muted)",
                                flexShrink: 0,
                              }}
                            >
                              PL
                            </div>
                          )}
                          <span
                            style={{
                              maxWidth: 260,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={p.title}
                          >
                            {p.title}
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          textAlign: "right",
                        }}
                      >
                        {p.item_count ?? 0}
                      </td>
                      <td
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {privacyLabel(p.privacy_status)}
                      </td>
                      <td>
                        <span className="chip" style={{ fontSize: 10 }}>
                          {p.platform}
                        </span>
                      </td>
                      <td>
                        <AuroraStatusChip tone={tone.tone}>{tone.label}</AuroraStatusChip>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {timeAgo(p.last_synced_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const selectStyle: React.CSSProperties = {
  padding: "6px 9px",
  border: "1px solid var(--border-default)",
  borderRadius: 6,
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  fontFamily: "inherit",
  fontSize: 12,
  minWidth: 160,
};

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
