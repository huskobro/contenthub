/**
 * Aurora My Projects — user.projects.list override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/projects.html
 * Veri: useContentProjects + fetchJobs (progress %). Filtre çubuğu ve grid/list
 * görünüm tasarımdan; içerik tamamen backend'ten.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useContentProjects } from "../../hooks/useContentProjects";
import { useMyChannelProfiles } from "../../hooks/useMyChannelProfiles";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import type { ContentProjectResponse } from "../../api/contentProjectsApi";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
  product_review: "Ürün İncelemesi",
  educational_video: "Eğitim",
  howto_video: "Nasıl Yapılır",
  mixed: "Karma",
};
const IN_FLIGHT = new Set(["queued", "running", "pending", "scheduled", "waiting", "waiting_review"]);

type FilterKey = "all" | "running" | "done" | "draft" | "failed";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Tümü",
  running: "Çalışıyor",
  done: "Tamamlandı",
  draft: "Taslak",
  failed: "Başarısız",
};

const STATUS_COLOR: Record<string, string> = {
  running: "var(--state-info-fg)",
  done: "var(--state-success-fg)",
  failed: "var(--state-danger-fg)",
  pending: "var(--state-warning-fg)",
  draft: "var(--text-muted)",
};
const STATUS_LABEL: Record<string, string> = {
  running: "Çalışıyor",
  done: "Tamamlandı",
  failed: "Başarısız",
  pending: "Bekliyor",
  draft: "Taslak",
};

function moduleLabel(k: string | null | undefined): string {
  if (!k) return "Karma";
  return MODULE_LABELS[k] ?? k;
}

function classifyProject(p: ContentProjectResponse, job?: JobResponse): FilterKey {
  if (job) {
    if (IN_FLIGHT.has(job.status)) return "running";
    if (job.status === "failed" || job.status === "error") return "failed";
    if (job.status === "completed") return "done";
  }
  if (p.publish_status === "published") return "done";
  if (p.content_status === "draft" || !p.active_job_id) return "draft";
  return "running";
}

function progressPct(job: JobResponse | undefined): number {
  if (!job) return 0;
  const total = job.steps?.length ?? 0;
  if (total === 0) return job.status === "completed" ? 100 : 0;
  const done = job.steps.filter((s) => s.status === "completed").length;
  return Math.round((done / total) * 100);
}

export function AuroraMyProjectsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const baseRoute = isAdmin ? "/admin" : "/user";
  // Admin users can open the full wizard; regular users go through /user/content.
  const newContentRoute = isAdmin ? "/admin/wizard" : "/user/content";
  const projectsQ = useContentProjects({ user_id: user?.id, limit: 100 });
  const channelsQ = useMyChannelProfiles();
  const jobsQ = useQuery<JobResponse[]>({
    queryKey: ["jobs", "user-projects", user?.id ?? ""],
    queryFn: () => fetchJobs({}),
    refetchInterval: 20_000,
    enabled: !!user,
  });

  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<FilterKey>("all");

  const projects = projectsQ.data ?? [];
  const channels = channelsQ.data ?? [];
  const jobs = jobsQ.data ?? [];

  const jobsByProject = useMemo(() => {
    const map = new Map<string, JobResponse>();
    for (const j of jobs) {
      if (!j.content_project_id) continue;
      const existing = map.get(j.content_project_id);
      if (!existing || new Date(j.updated_at) > new Date(existing.updated_at)) {
        map.set(j.content_project_id, j);
      }
    }
    return map;
  }, [jobs]);

  const channelLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of channels) map.set(c.id, c.handle ?? c.profile_name ?? c.id);
    return map;
  }, [channels]);

  const enriched = useMemo(
    () =>
      projects.map((p) => {
        const job = jobsByProject.get(p.id);
        const cls = classifyProject(p, job);
        return { p, job, cls, pct: progressPct(job) };
      }),
    [projects, jobsByProject],
  );

  const filtered = useMemo(
    () => (filter === "all" ? enriched : enriched.filter((e) => e.cls === filter)),
    [enriched, filter],
  );

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: enriched.length, running: 0, done: 0, draft: 0, failed: 0 };
    for (const e of enriched) c[e.cls] += 1;
    return c;
  }, [enriched]);

  const inspector = (
    <AuroraInspector title="Projelerim">
      <AuroraInspectorSection title="Özet">
        <AuroraInspectorRow label="toplam" value={String(counts.all)} />
        <AuroraInspectorRow label="çalışıyor" value={String(counts.running)} />
        <AuroraInspectorRow label="tamamlandı" value={String(counts.done)} />
        <AuroraInspectorRow label="taslak" value={String(counts.draft)} />
        <AuroraInspectorRow label="başarısız" value={String(counts.failed)} />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Projelerim</h1>
            <div className="sub">
              {projectsQ.isLoading
                ? "yükleniyor…"
                : `${counts.all} proje · ${counts.running} aktif`}
            </div>
          </div>
          <div className="hstack">
            <div style={{ display: "flex", gap: 2 }}>
              <button
                className={"btn sm" + (view === "grid" ? " primary" : " secondary")}
                onClick={() => setView("grid")}
                aria-label="Izgara görünüm"
              >
                <Icon name="grid" size={12} />
              </button>
              <button
                className={"btn sm" + (view === "list" ? " primary" : " secondary")}
                onClick={() => setView("list")}
                aria-label="Liste görünüm"
              >
                <Icon name="list" size={12} />
              </button>
            </div>
            <AuroraButton
              variant="primary"
              size="sm"
              iconLeft={<Icon name="plus" size={12} />}
              onClick={() => navigate(newContentRoute)}
              data-testid="my-projects-new"
            >
              Yeni proje
            </AuroraButton>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map((v) => {
            const active = filter === v;
            return (
              <button
                key={v}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 28,
                  padding: "0 12px",
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 500,
                  border: "1px solid",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all .12s",
                  borderColor: active ? "rgba(var(--accent-primary-rgb), 0.4)" : "var(--border-default)",
                  background: active ? "var(--accent-primary-muted)" : "var(--bg-surface)",
                  color: active ? "var(--accent-primary-hover)" : "var(--text-secondary)",
                }}
                onClick={() => setFilter(v)}
              >
                {FILTER_LABELS[v]}
                <span className="mono" style={{ fontSize: 10, opacity: 0.7 }}>
                  {counts[v]}
                </span>
              </button>
            );
          })}
        </div>

        {view === "grid" ? (
          <div className="grid g-3">
            {filtered.map(({ p, cls, pct }) => {
              const channelLabel = channelLabelById.get(p.channel_profile_id) ?? "—";
              return (
                <div
                  key={p.id}
                  className="aurora-project-card"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 12,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "border-color .14s, transform .14s",
                  }}
                  onClick={() => navigate(`${baseRoute}/projects/${p.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16/9",
                      background: "var(--bg-inset)",
                      position: "relative",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--text-muted)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "var(--gradient-brand)",
                        opacity: 0.12,
                      }}
                    />
                    <Icon name="film" size={24} />
                    <div style={{ position: "absolute", top: 8, right: 8 }}>
                      <span
                        className="mono"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 9,
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: "rgba(13,8,24,0.7)",
                          color: STATUS_COLOR[cls],
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: STATUS_COLOR[cls],
                          }}
                        />
                        {STATUS_LABEL[cls]}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
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
                      {p.title}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>{p.id.slice(0, 8)}</span>
                      <span>·</span>
                      <span style={{ color: "var(--accent-primary-hover)" }}>{channelLabel}</span>
                    </div>
                    {pct > 0 && pct < 100 && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 3,
                            borderRadius: 2,
                            background: "var(--bg-inset)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: pct + "%",
                              background: "var(--gradient-brand)",
                              borderRadius: 2,
                            }}
                          />
                        </div>
                        <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          {pct}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span className="chip" style={{ fontSize: 10 }}>
                      {moduleLabel(p.module_type)}
                    </span>
                  </div>
                </div>
              );
            })}
            {!projectsQ.isLoading && filtered.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: 32,
                  textAlign: "center",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                {filter === "all" ? "Henüz proje yok." : "Bu filtreye uyan proje yok."}
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            {filtered.map(({ p, cls, pct }, i) => {
              const channelLabel = channelLabelById.get(p.channel_profile_id) ?? "—";
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`${baseRoute}/projects/${p.id}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 200px 100px 100px",
                    gap: 12,
                    alignItems: "center",
                    padding: "11px 16px",
                    borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.title}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {p.id.slice(0, 8)} · {moduleLabel(p.module_type)}
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--accent-primary-hover)" }}>
                    {channelLabel}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: STATUS_COLOR[cls] }}>
                    ● {STATUS_LABEL[cls]}
                  </div>
                  <div className="mono" style={{ fontSize: 11, textAlign: "right" }}>
                    {pct}%
                  </div>
                </div>
              );
            })}
            {!projectsQ.isLoading && filtered.length === 0 && (
              <div style={{ padding: 24, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                {filter === "all" ? "Henüz proje yok." : "Bu filtreye uyan proje yok."}
              </div>
            )}
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
