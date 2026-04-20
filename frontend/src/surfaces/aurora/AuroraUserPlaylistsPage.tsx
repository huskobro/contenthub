/**
 * Aurora User Playlists — user.playlists override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/playlists.html
 * Veri: usePlaylists + useSyncPlaylists (gerçek YouTube playlist senkronu).
 * "Yeni liste" butonu mock değil — minimal prompt ile useCreatePlaylist tetikler.
 */
import { useMemo, useState } from "react";
import { useMyChannelProfiles } from "../../hooks/useMyChannelProfiles";
import {
  usePlaylists,
  useSyncPlaylists,
  useCreatePlaylist,
} from "../../hooks/usePlaylists";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} saat önce`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} gün önce`;
  const w = Math.floor(day / 7);
  return `${w} hafta önce`;
}

export function AuroraUserPlaylistsPage() {
  const channelsQ = useMyChannelProfiles();
  const channels = channelsQ.data ?? [];
  const playlistsQ = usePlaylists({ limit: 100 });
  const syncM = useSyncPlaylists();
  const createM = useCreatePlaylist();

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newChannelId, setNewChannelId] = useState<string>("");

  const items = playlistsQ.data ?? [];
  const channelById = useMemo(() => {
    const m = new Map<string, (typeof channels)[number]>();
    for (const c of channels) m.set(c.id, c);
    return m;
  }, [channels]);

  const totalVideos = useMemo(() => items.reduce((s, p) => s + (p.item_count ?? 0), 0), [items]);

  const inspector = (
    <AuroraInspector title="Listelerim">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam liste" value={String(items.length)} />
        <AuroraInspectorRow label="toplam video" value={String(totalVideos)} />
        <AuroraInspectorRow label="kanal sayısı" value={String(channels.length)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Senkron">
        <AuroraButton
          variant="secondary"
          size="sm"
          onClick={() => syncM.mutate({})}
          disabled={syncM.isPending}
          style={{ width: "100%" }}
        >
          {syncM.isPending ? "Senkronlanıyor…" : "Tümünü senkronla"}
        </AuroraButton>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Oynatma listeleri</h1>
            <div className="sub">
              {items.length} liste · {totalVideos} video
            </div>
          </div>
          <AuroraButton
            variant="primary"
            size="sm"
            iconLeft={<Icon name="plus" size={12} />}
            onClick={() => setShowCreate((v) => !v)}
          >
            Yeni liste
          </AuroraButton>
        </div>

        {showCreate && (
          <div className="card card-pad" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 240px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Başlık
                </div>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Yeni oynatma listesi başlığı"
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    border: "1px solid var(--border-default)",
                    borderRadius: 6,
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontFamily: "inherit",
                    fontSize: 12,
                  }}
                />
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Kanal
                </div>
                <select
                  value={newChannelId}
                  onChange={(e) => setNewChannelId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    border: "1px solid var(--border-default)",
                    borderRadius: 6,
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontFamily: "inherit",
                    fontSize: 12,
                  }}
                >
                  <option value="">— kanal seç —</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.handle ?? c.profile_name}
                    </option>
                  ))}
                </select>
              </div>
              <AuroraButton
                variant="primary"
                size="sm"
                disabled={!newTitle.trim() || !newChannelId || createM.isPending}
                onClick={() =>
                  createM.mutate(
                    { title: newTitle.trim(), channelProfileId: newChannelId, privacyStatus: "private" },
                    {
                      onSuccess: () => {
                        setNewTitle("");
                        setShowCreate(false);
                      },
                    },
                  )
                }
              >
                {createM.isPending ? "Oluşturuluyor…" : "Oluştur"}
              </AuroraButton>
              <AuroraButton variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                İptal
              </AuroraButton>
            </div>
          </div>
        )}

        {playlistsQ.isLoading ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Yükleniyor…
          </div>
        ) : items.length === 0 ? (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}
          >
            Henüz senkronlanmış liste yok. "Tümünü senkronla" ile YouTube listelerinizi getirin.
          </div>
        ) : (
          <div className="grid g-3">
            {items.map((pl) => {
              const ch = pl.channel_profile_id ? channelById.get(pl.channel_profile_id) : null;
              return (
                <div
                  key={pl.id}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 10,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "border-color .14s, transform .12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16/9",
                      background: pl.thumbnail_url ? `url(${pl.thumbnail_url}) center/cover` : "var(--bg-inset)",
                      position: "relative",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    {!pl.thumbnail_url && <Icon name="list" size={24} />}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        background: "var(--media-overlay-bg)",
                        color: "var(--media-overlay-fg)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 4,
                      }}
                    >
                      {pl.item_count} video
                    </div>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{pl.title}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
                      {ch?.handle ?? ch?.profile_name ?? pl.platform} · {pl.privacy_status} · {fmtRelative(pl.last_synced_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
