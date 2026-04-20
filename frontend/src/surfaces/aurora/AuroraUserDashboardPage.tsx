/**
 * Aurora User Dashboard — user.dashboard override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/dashboard.html
 * Veri kaynakları: useAuthStore, useContentProjects, useMyChannelProfiles,
 * fetchJobs (React Query). Hardcoded içerik yok — sadece tasarımdan gelen
 * yapı kalıbı korunur (KPI strip · Spark · Son projeler · Hızlı erişim).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useContentProjects } from "../../hooks/useContentProjects";
import { useMyChannelProfiles } from "../../hooks/useMyChannelProfiles";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import {
  AuroraButton,
  AuroraSpark,
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
const IN_FLIGHT = new Set([
  "queued", "running", "pending", "scheduled", "waiting", "waiting_review",
]);

function moduleLabel(k: string | null | undefined): string {
  if (!k) return "Karma";
  return MODULE_LABELS[k] ?? k;
}

function statusToTone(s: string): { color: string; label: string } {
  if (s === "completed" || s === "published") return { color: "var(--state-success-fg)", label: "tamam" };
  if (s === "failed" || s === "error") return { color: "var(--state-danger-fg)", label: "hata" };
  if (IN_FLIGHT.has(s)) return { color: "var(--state-info-fg)", label: s };
  return { color: "var(--text-muted)", label: s };
}

function progressPct(j: JobResponse): number {
  const total = j.steps?.length ?? 0;
  if (total === 0) return j.status === "completed" ? 100 : 0;
  const done = j.steps.filter((s) => s.status === "completed").length;
  return Math.round((done / total) * 100);
}

export function AuroraUserDashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const userName = user?.display_name ?? user?.email ?? "kullanıcı";

  const projectsQ = useContentProjects({ user_id: user?.id, limit: 24 });
  const channelsQ = useMyChannelProfiles();
  const jobsQ = useQuery<JobResponse[]>({
    queryKey: ["jobs", "user-dashboard", user?.id ?? ""],
    queryFn: () => fetchJobs({}),
    refetchInterval: 15_000,
    enabled: !!user,
  });

  const projects = projectsQ.data ?? [];
  const channels = channelsQ.data ?? [];
  const jobs = jobsQ.data ?? [];

  const inFlight = useMemo(() => jobs.filter((j) => IN_FLIGHT.has(j.status)), [jobs]);
  const completed7d = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    return jobs.filter(
      (j) => j.status === "completed" && new Date(j.finished_at ?? j.updated_at).getTime() >= cutoff,
    );
  }, [jobs]);
  const published7d = useMemo(() => completed7d.length, [completed7d]);

  // 12-noktalı eğilim serisi (tasarımla uyumlu spark genişliği)
  const trendSeries = useMemo(() => {
    const now = Date.now();
    const buckets: number[] = new Array(12).fill(0);
    for (const j of jobs) {
      const ts = new Date(j.created_at).getTime();
      const idx = 11 - Math.floor((now - ts) / (24 * 3600 * 1000));
      if (idx >= 0 && idx < 12) buckets[idx] += 1;
    }
    return buckets;
  }, [jobs]);

  // Son 3 proje (oluşturma tarihine göre azalan)
  const recentProjects = useMemo(
    () =>
      projects
        .slice()
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3),
    [projects],
  );

  const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  const inspector = (
    <AuroraInspector title="Özet">
      <AuroraInspectorSection title="Bu hafta">
        <AuroraInspectorRow label="yeni proje" value={String(projects.filter((p) => Date.now() - new Date(p.created_at).getTime() < 7 * 86400_000).length)} />
        <AuroraInspectorRow label="yayınlanan" value={String(published7d)} />
        <AuroraInspectorRow label="aktif iş" value={String(inFlight.length)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Hızlı başlat">
        <AuroraButton
          variant="primary"
          size="sm"
          onClick={() => navigate("/user/create/bulletin")}
          style={{ width: "100%", marginBottom: 6 }}
        >
          Haber bülteni
        </AuroraButton>
        <AuroraButton
          variant="secondary"
          size="sm"
          onClick={() => navigate("/user/create/product-review")}
          style={{ width: "100%", marginBottom: 6 }}
        >
          Ürün incelemesi
        </AuroraButton>
        <AuroraButton
          variant="secondary"
          size="sm"
          onClick={() => navigate("/user/create/video")}
          style={{ width: "100%" }}
        >
          Standart video
        </AuroraButton>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Genel bakış</h1>
            <div className="sub">
              {userName}
              {channels[0] ? ` · ${channels[0].handle ?? channels[0].profile_name ?? ""}` : ""}
              {" · "}
              {today}
            </div>
          </div>
          <AuroraButton
            variant="primary"
            size="sm"
            iconLeft={<Icon name="plus" size={12} />}
            onClick={() => navigate("/user/content")}
          >
            Yeni içerik
          </AuroraButton>
        </div>

        {/* KPI strip */}
        <div className="grid g-4" style={{ marginBottom: 18 }}>
          <div className="metric">
            <div className="accent" />
            <div className="lbl">Toplam proje</div>
            <span className="val">{projects.length}</span>
            <div style={{ marginTop: 8, height: 28 }}>
              <AuroraSpark data={trendSeries} />
            </div>
          </div>
          <div className="metric">
            <div className="accent" />
            <div className="lbl">Yayınlanan (7g)</div>
            <span className="val">{published7d}</span>
            <div style={{ marginTop: 8, height: 28 }}>
              <AuroraSpark data={trendSeries} color="var(--accent-secondary)" />
            </div>
          </div>
          <div className="metric">
            <div className="accent" />
            <div className="lbl">Kanal</div>
            <span className="val">{channels.length}</span>
            <div style={{ marginTop: 8, height: 28 }}>
              <AuroraSpark data={trendSeries} color="var(--accent-tertiary)" />
            </div>
          </div>
          <div className="metric">
            <div className="accent" />
            <div className="lbl">Aktif iş</div>
            <span className="val">{inFlight.length}</span>
            <div style={{ marginTop: 8, height: 28 }}>
              <AuroraSpark data={trendSeries} color="var(--text-muted)" />
            </div>
          </div>
        </div>

        {/* Recent projects */}
        <div className="section">
          <div className="section-head">
            <div className="title">Son projelerim</div>
            <a
              href="/user/projects"
              className="btn ghost sm"
              style={{ fontSize: 11 }}
              onClick={(e) => {
                e.preventDefault();
                navigate("/user/projects");
              }}
            >
              Tümünü gör →
            </a>
          </div>
          <div className="card">
            {recentProjects.map((p, i) => {
              const job = jobs.find((j) => j.content_project_id === p.id);
              const pct = job ? progressPct(job) : p.publish_status === "published" ? 100 : 0;
              const statusLabel = job?.status ?? p.content_status;
              const tone = statusToTone(statusLabel);
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/user/projects/${p.id}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 160px 80px",
                    gap: 12,
                    alignItems: "center",
                    padding: "11px 16px",
                    borderBottom: i < recentProjects.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.title}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {moduleLabel(p.module_type)} · {p.id.slice(0, 8)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                          background: pct === 100 ? "var(--state-success-fg)" : "var(--gradient-brand)",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)", minWidth: 28 }}>
                      {pct}%
                    </span>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: tone.color }}>
                    {tone.label}
                  </span>
                </div>
              );
            })}
            {recentProjects.length === 0 && (
              <div style={{ padding: 24, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                {projectsQ.isLoading ? "Yükleniyor…" : "Henüz proje yok."}
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="section">
          <div className="section-head">
            <div className="title">Hızlı erişim</div>
          </div>
          <div className="grid g-4">
            {[
              { label: "Kanallarım", icon: "tv", href: "/user/channels", sub: `${channels.length} kanal` },
              { label: "Takvim", icon: "calendar", href: "/user/calendar", sub: "yayın planı" },
              { label: "Analizler", icon: "bar-chart", href: "/user/analytics", sub: "7g rapor" },
              { label: "Yayın kuyruğu", icon: "send", href: "/user/publish", sub: `${inFlight.length} aktif` },
            ].map((q) => (
              <a
                key={q.label}
                href={q.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(q.href);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 16px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 10,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color .14s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "var(--accent-primary-muted)",
                    color: "var(--accent-primary)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon name={q.icon as any} size={15} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{q.label}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {q.sub}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
