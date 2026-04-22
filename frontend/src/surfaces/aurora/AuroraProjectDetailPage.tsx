/**
 * Aurora Project Detail — user.projects.detail override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/project-detail.html
 * Veri: useContentProject + useProjectJobs (gerçek backend hook'ları).
 * Hardcoded mockup verisi yok; tüm pipeline / log adımları job.steps'ten gelir.
 */
import { useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useContentProject, useProjectJobs } from "../../hooks/useContentProjects";
import {
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraButton,
} from "./primitives";
import { Icon } from "./icons";
import type { JobResponse, JobStepResponse } from "../../api/jobsApi";

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
  product_review: "Ürün İncelemesi",
  educational_video: "Eğitim",
  howto_video: "Nasıl Yapılır",
  mixed: "Karma",
};

const STATUS_TONE: Record<string, string> = {
  completed: "var(--state-success-fg)",
  failed: "var(--state-danger-fg)",
  error: "var(--state-danger-fg)",
  running: "var(--state-info-fg)",
  pending: "var(--state-info-fg)",
  queued: "var(--state-info-fg)",
};

function moduleLabel(k: string | null | undefined): string {
  if (!k) return "Karma";
  return MODULE_LABELS[k] ?? k;
}

function progressPct(steps: JobStepResponse[] | undefined, status: string): number {
  if (!steps || steps.length === 0) return status === "completed" ? 100 : 0;
  const done = steps.filter((s) => s.status === "completed").length;
  return Math.round((done / steps.length) * 100);
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "—";
  }
}

function fmtFull(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("tr-TR");
  } catch {
    return "—";
  }
}

function elapsedSec(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.max(0, Math.round((e - s) / 1000));
  const m = Math.floor(sec / 60);
  const ss = String(sec % 60).padStart(2, "0");
  return `${String(m).padStart(2, "0")}:${ss}`;
}

export function AuroraProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const projectQ = useContentProject(projectId ?? "");
  const jobsQ = useProjectJobs(projectId ?? null);
  const [tab, setTab] = useState<"overview" | "pipeline" | "logs">("overview");
  // Shell Branching Rule (CLAUDE.md): derive from URL, not role. Admin visiting
  // /user/projects/:id must stay in the user shell; role-based derivation
  // silently crossed users into the admin shell on CTA clicks.
  const baseRoute = location.pathname.startsWith("/admin") ? "/admin" : "/user";

  const project = projectQ.data;
  const jobs = (jobsQ.data ?? []) as unknown as JobResponse[];
  const latestJob = useMemo(() => {
    if (jobs.length === 0) return null;
    return [...jobs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  }, [jobs]);

  const pct = latestJob ? progressPct(latestJob.steps, latestJob.status) : 0;
  const activeStep = latestJob?.steps?.find((s) => s.status === "running" || s.status === "pending");
  const tone = latestJob ? STATUS_TONE[latestJob.status] ?? "var(--text-muted)" : "var(--text-muted)";

  if (projectQ.isLoading) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div style={{ padding: 32, color: "var(--text-muted)", fontSize: 13 }}>Yükleniyor…</div>
        </div>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div style={{ padding: 32, color: "var(--text-muted)", fontSize: 13 }}>Proje bulunamadı.</div>
        </div>
      </div>
    );
  }

  const inspector = (
    <AuroraInspector title={project.title}>
      <AuroraInspectorSection title="Meta">
        <AuroraInspectorRow label="modül" value={moduleLabel(project.module_type)} />
        <AuroraInspectorRow label="durum" value={latestJob?.status ?? project.content_status ?? "—"} />
        <AuroraInspectorRow label="kanal" value={project.channel_profile_id ? project.channel_profile_id.slice(0, 8) : "—"} />
        <AuroraInspectorRow label="proje id" value={project.id.slice(0, 8)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Eylemler">
        <AuroraButton
          variant="secondary"
          size="sm"
          onClick={() => navigate(`${baseRoute}/projects`)}
          style={{ width: "100%", marginBottom: 6 }}
          iconLeft={<Icon name="arrow-left" size={11} />}
        >
          Projelere dön
        </AuroraButton>
        <AuroraButton
          variant="primary"
          size="sm"
          onClick={() =>
            navigate(`${baseRoute}/projects/${project.id}/automation-center`)
          }
          style={{ width: "100%", marginBottom: 6 }}
          data-testid="proj-detail-go-automation"
        >
          Automation Center
        </AuroraButton>
        {latestJob && (
          <AuroraButton
            variant="secondary"
            size="sm"
            onClick={() => navigate(`${baseRoute}/jobs/${latestJob.id}`)}
            style={{ width: "100%" }}
          >
            İş detayı
          </AuroraButton>
        )}
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>{project.title}</h1>
            <div className="sub" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {project.id.slice(0, 12)} · {moduleLabel(project.module_type)}
              {latestJob && (
                <>
                  {" · "}
                  <span style={{ color: tone }}>{latestJob.status} {pct}%</span>
                </>
              )}
            </div>
          </div>
        </div>

        {latestJob && (
          <div className="card card-pad" style={{ marginBottom: 14 }}>
            <div style={{ height: 5, borderRadius: 3, background: "var(--bg-inset)", overflow: "hidden", marginBottom: 8 }}>
              <div
                style={{
                  height: "100%",
                  width: pct + "%",
                  background: pct === 100 ? "var(--state-success-fg)" : "var(--gradient-brand)",
                  boxShadow: pct === 100 ? "none" : "var(--glow-accent)",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
              <span>{activeStep ? `${activeStep.step_key} — ${pct}%` : `${pct}% tamamlandı`}</span>
              <span>geçen {elapsedSec(latestJob.started_at, latestJob.finished_at)}</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border-subtle)", marginBottom: 16 }}>
          {([
            ["overview", "Özet"],
            ["pipeline", "Adımlar"],
            ["logs", "Log"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 500,
                background: "none",
                border: "none",
                borderBottom: "2px solid " + (tab === id ? "var(--accent-primary)" : "transparent"),
                color: tab === id ? "var(--accent-primary-hover)" : "var(--text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="card card-pad">
            {project.description ? (
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
                {project.description}
              </div>
            ) : null}
            {[
              ["Modül", moduleLabel(project.module_type)],
              ["Sahip", project.user_id?.slice(0, 8) ?? "—"],
              ["Oluşturulma", fmtFull(project.created_at)],
              ["Güncellenme", fmtFull(project.updated_at)],
              ["İçerik durumu", project.content_status ?? "—"],
              ["Yayın durumu", project.publish_status ?? "—"],
              ["Toplam iş", String(jobs.length)],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: 12,
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", minWidth: 130 }}>{k}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "pipeline" && (
          <div className="card card-pad">
            {!latestJob || (latestJob.steps ?? []).length === 0 ? (
              <div style={{ padding: 14, color: "var(--text-muted)", fontSize: 12 }}>
                Henüz işlenecek adım yok.
              </div>
            ) : (
              latestJob.steps.map((s, i) => {
                const stepTone =
                  s.status === "completed" ? "var(--state-success-fg)"
                  : s.status === "running" ? "var(--gradient-brand)"
                  : s.status === "failed" ? "var(--state-danger-fg)"
                  : "var(--bg-inset)";
                return (
                  <div
                    key={s.id ?? i}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "8px 0",
                      borderBottom: i < latestJob.steps.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 10,
                        fontWeight: 600,
                        flexShrink: 0,
                        background: stepTone,
                        border: s.status === "pending" ? "1px solid var(--border-default)" : "none",
                        color: s.status === "pending" ? "var(--text-muted)" : "#fff",
                        marginTop: 2,
                      }}
                    >
                      {s.status === "completed" ? <Icon name="check" size={11} /> : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{s.step_key}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                        {s.status} · {elapsedSec(s.started_at, s.finished_at)}
                      </div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
                      {fmtTime(s.finished_at ?? s.started_at)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "logs" && (
          <div
            className="card card-pad"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.8 }}
          >
            {!latestJob || (latestJob.steps ?? []).length === 0 ? (
              <div style={{ color: "var(--text-muted)" }}>Log verisi yok.</div>
            ) : (
              latestJob.steps.map((s, i) => {
                const ts = s.finished_at ?? s.started_at;
                const c =
                  s.status === "completed" ? "var(--state-success-fg)"
                  : s.status === "failed" ? "var(--state-danger-fg)"
                  : "var(--state-info-fg)";
                return (
                  <div key={s.id ?? i}>
                    <span style={{ color: "var(--text-muted)" }}>[{fmtTime(ts)}]</span>{" "}
                    <span style={{ color: c }}>{s.status}</span> {s.step_key}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
