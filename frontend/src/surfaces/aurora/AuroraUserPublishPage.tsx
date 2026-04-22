/**
 * Aurora User Publish — user.publish override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/user-publish.html
 * Veri: usePublish (publish kayıtları) + useContentProjects + useMyChannelProfiles.
 * Hardcoded yok; her satır gerçek bir publish_record / proje bağlamından gelir.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishRecords, type PublishRecordSummary } from "../../api/publishApi";
import { useContentProjects } from "../../hooks/useContentProjects";
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
  draft: { label: "draft", color: "var(--text-muted)" },
  pending_review: { label: "pending_review", color: "var(--state-warning-fg)" },
  approved: { label: "approved", color: "var(--state-success-fg)" },
  scheduled: { label: "scheduled", color: "var(--state-info-fg)" },
  publishing: { label: "publishing", color: "var(--state-info-fg)" },
  published: { label: "published", color: "var(--state-success-fg)" },
  failed: { label: "failed", color: "var(--state-danger-fg)" },
  cancelled: { label: "cancelled", color: "var(--text-muted)" },
  review_rejected: { label: "rejected", color: "var(--state-danger-fg)" },
};

function fmtScheduled(r: PublishRecordSummary): string {
  if (r.published_at) {
    try {
      return new Date(r.published_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Yayında";
    }
  }
  if (r.scheduled_at) {
    try {
      return new Date(r.scheduled_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return r.scheduled_at;
    }
  }
  return "—";
}

// Faz 4.1 — raw UUID "Yayın · e7d0f6d2" yerine okunabilir başlık.
// Öncelik: content_project title → platform + oluşturulma tarihi → UUID fallback.
function humanizePublishTitle(
  r: PublishRecordSummary,
  projectTitle: string | null | undefined,
): string {
  if (projectTitle && projectTitle.trim().length > 0) return projectTitle;
  // Fallback: platform + kısa tarih
  try {
    const when = new Date(r.created_at).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });
    const platformLabel =
      r.platform === "youtube"
        ? "YouTube"
        : r.platform === "tiktok"
          ? "TikTok"
          : r.platform || "Yayın";
    return `${platformLabel} yayını · ${when}`;
  } catch {
    return `Yayın · ${r.id.slice(0, 8)}`;
  }
}

export function AuroraUserPublishPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const baseRoute = isAdmin ? "/admin" : "/user";
  // Admin uses full wizard; users are routed to the content entry hub.
  const newContentRoute = isAdmin ? "/admin/wizard" : "/user/content";

  const recordsQ = useQuery({
    queryKey: ["publish-records", "user-publish-aurora", user?.id ?? ""],
    queryFn: () => fetchPublishRecords({ limit: 50 }),
    refetchInterval: 20_000,
    enabled: !!user,
  });
  const projectsQ = useContentProjects({ user_id: user?.id, limit: 100 });
  const channelsQ = useMyChannelProfiles();

  const records = recordsQ.data ?? [];
  const projects = projectsQ.data ?? [];
  const channels = channelsQ.data ?? [];

  const projectById = useMemo(() => {
    const m = new Map<string, (typeof projects)[number]>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const channelById = useMemo(() => {
    const m = new Map<string, (typeof channels)[number]>();
    for (const c of channels) m.set(c.id, c);
    return m;
  }, [channels]);

  const counts = useMemo(() => {
    const out = { pending: 0, approved: 0, published: 0, failed: 0 };
    for (const r of records) {
      if (r.status === "pending_review") out.pending += 1;
      else if (r.status === "approved" || r.status === "scheduled") out.approved += 1;
      else if (r.status === "published" || r.status === "publishing") out.published += 1;
      else if (r.status === "failed" || r.status === "review_rejected") out.failed += 1;
    }
    return out;
  }, [records]);

  const inspector = (
    <AuroraInspector title="Yayın kuyruğu">
      <AuroraInspectorSection title="Durum">
        <AuroraInspectorRow label="onay bekleyen" value={String(counts.pending)} />
        <AuroraInspectorRow label="onaylandı" value={String(counts.approved)} />
        <AuroraInspectorRow label="yayında" value={String(counts.published)} />
        <AuroraInspectorRow label="başarısız" value={String(counts.failed)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Kanal">
        <AuroraInspectorRow label="bağlı kanal" value={String(channels.length)} />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Yayın</h1>
            <div className="sub">İçerik yayın durumu · {records.length} kayıt</div>
          </div>
          <AuroraButton
            variant="primary"
            size="sm"
            iconLeft={<Icon name="plus" size={12} />}
            onClick={() => navigate(newContentRoute)}
            data-testid="publish-new-content"
          >
            Yeni içerik
          </AuroraButton>
        </div>

        {records.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: 32 }}>
            {recordsQ.isLoading ? "Yükleniyor…" : "Henüz yayın kaydı yok."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {records.map((r) => {
              const project = r.content_project_id ? projectById.get(r.content_project_id) : null;
              const channel = project?.channel_profile_id ? channelById.get(project.channel_profile_id) : null;
              const tone = STATUS_TONE[r.status] ?? { label: r.status, color: "var(--text-muted)" };
              const title = humanizePublishTitle(r, project?.title);
              const channelLabel = channel?.handle ?? channel?.profile_name ?? r.platform ?? "—";
              return (
                <div
                  key={r.id}
                  className="card card-pad"
                  onClick={() => {
                    if (project) navigate(`${baseRoute}/projects/${project.id}`);
                  }}
                  style={{ cursor: project ? "pointer" : "default" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 72,
                        height: 42,
                        borderRadius: 6,
                        background: "var(--bg-inset)",
                        border: "1px solid var(--border-subtle)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="film" size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                        {r.id.slice(0, 8)} · {channelLabel} · {r.platform}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: tone.color, marginBottom: 2 }}>● {tone.label}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{fmtScheduled(r)}</div>
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
