/**
 * Aurora User Posts — user.posts override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/posts.html
 * Veri: usePosts + usePostStats + useSubmitPost + useDeletePost (gerçek
 * platform community post kayıtları). Hardcoded post yok.
 */
import { useMemo, useState } from "react";
import { usePosts, usePostStats, useSubmitPost, useDeletePost } from "../../hooks/usePosts";
import { useMyChannelProfiles } from "../../hooks/useMyChannelProfiles";
import { useAuthStore } from "../../stores/authStore";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

const STATUS_TONE: Record<string, { label: string; color: string }> = {
  draft: { label: "taslak", color: "var(--text-muted)" },
  queued: { label: "kuyrukta", color: "var(--accent-primary-hover)" },
  posted: { label: "yayınlandı", color: "var(--state-success-fg)" },
  failed: { label: "hatalı", color: "var(--state-danger-fg)" },
};

const FILTERS: { value: string | undefined; label: string }[] = [
  { value: undefined, label: "Tümü" },
  { value: "draft", label: "Taslak" },
  { value: "queued", label: "Kuyrukta" },
  { value: "posted", label: "Yayınlandı" },
  { value: "failed", label: "Hatalı" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString("tr-TR", { month: "short" })}`;
}

export function AuroraUserPostsPage() {
  const user = useAuthStore((s) => s.user);
  const channelsQ = useMyChannelProfiles();
  const channels = channelsQ.data ?? [];
  const channelById = useMemo(() => {
    const m = new Map<string, (typeof channels)[number]>();
    for (const c of channels) m.set(c.id, c);
    return m;
  }, [channels]);

  const [filter, setFilter] = useState<string | undefined>(undefined);
  const postsQ = usePosts({ status: filter, limit: 50 });
  const statsQ = usePostStats();
  const submitM = useSubmitPost();
  const deleteM = useDeletePost();

  const items = postsQ.data ?? [];
  const stats = statsQ.data;

  const inspector = (
    <AuroraInspector title="Gönderiler">
      <AuroraInspectorSection title="Bu hafta">
        <AuroraInspectorRow label="toplam" value={String(stats?.total ?? items.length)} />
        <AuroraInspectorRow label="yayınlanan" value={String(stats?.posted ?? 0)} />
        <AuroraInspectorRow label="kuyruk" value={String(stats?.queued ?? 0)} />
        <AuroraInspectorRow label="taslak" value={String(stats?.draft ?? 0)} />
        <AuroraInspectorRow label="hatalı" value={String(stats?.failed ?? 0)} />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Sosyal gönderiler</h1>
            <div className="sub">Yayınlanan ve kuyruktaki community post içerikleri</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 28,
                padding: "0 12px",
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 500,
                border: "1px solid",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all .12s",
                borderColor: filter === f.value ? "var(--accent-primary)" : "var(--border-default)",
                background: filter === f.value ? "var(--accent-primary-muted)" : "var(--bg-surface)",
                color: filter === f.value ? "var(--accent-primary-hover)" : "var(--text-secondary)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {postsQ.isLoading ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Yükleniyor…
          </div>
        ) : items.length === 0 ? (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}
          >
            Gönderi bulunamadı.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((p) => {
              const ch = p.channel_profile_id ? channelById.get(p.channel_profile_id) : null;
              const tone = STATUS_TONE[p.status] ?? STATUS_TONE.draft;
              return (
                <div key={p.id} className="card card-pad">
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 80,
                        height: 46,
                        borderRadius: 6,
                        background: "var(--bg-inset)",
                        border: "1px solid var(--border-subtle)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="film" size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.title ?? p.body.slice(0, 80)}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent-primary-hover)",
                        }}
                      >
                        {ch?.handle ?? ch?.profile_name ?? "—"} · {p.platform} · {p.post_type}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: tone.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      ● {tone.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        marginLeft: 8,
                      }}
                    >
                      {fmtDate(p.posted_at ?? p.scheduled_for ?? p.created_at)}
                    </span>
                    {p.status === "draft" && user && (
                      <AuroraButton
                        variant="primary"
                        size="sm"
                        disabled={submitM.isPending}
                        onClick={() => submitM.mutate({ postId: p.id, userId: user.id })}
                      >
                        Gönder
                      </AuroraButton>
                    )}
                    {(p.status === "draft" || p.status === "failed") && (
                      <AuroraButton
                        variant="ghost"
                        size="sm"
                        disabled={deleteM.isPending}
                        onClick={() => {
                          if (window.confirm("Bu gönderi silinsin mi?")) deleteM.mutate(p.id);
                        }}
                      >
                        Sil
                      </AuroraButton>
                    )}
                  </div>
                  {p.delivery_error && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "rgba(231,76,60,0.08)",
                        borderLeft: "2px solid var(--state-danger-fg)",
                        fontSize: 11,
                        color: "var(--state-danger-fg)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {p.delivery_error}
                    </div>
                  )}
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
