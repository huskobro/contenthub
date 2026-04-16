/**
 * ProjectDetailPage — PHASE AF: project-centered workflow final surface.
 *
 * Tek bir proje altinda birden fazla is (news_bulletin / standard_video /
 * product_review) calisabilir. Bu sayfa her projenin "ana ussu":
 *   - Overview: proje bilgileri + bagli kanal linki
 *   - Summary: backend aggregate (jobs.total, by_status, by_module, publish.total)
 *   - Launcher: 3 modul karti; tikladiginda ilgili wizard'a
 *     ?contentProjectId=...&channelProfileId=... query param'lariyla gider
 *   - Jobs: status + module filter, per-job preview + detay linki
 *   - Publish: bu projeye bagli yayin kayitlari
 *   - Per-latest-job preview list (reused)
 *
 * Ownership + visibility backend'de zorlanir; frontend ek filtre yapmaz.
 * Canvas surface override'i varsa tramp'lenir.
 */

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useContentProject, useProjectSummary, useProjectJobs } from "../../hooks/useContentProjects";
import { useChannelProfile } from "../../hooks/useChannelProfiles";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import { fetchStandardVideos, startStandardVideoProduction } from "../../api/standardVideoApi";
import { usePublishRecordsByProject } from "../../hooks/usePublish";
import { useToast } from "../../hooks/useToast";
import {
  PageShell,
  SectionShell,
  StatusBadge,
  Mono,
  TabBar,
} from "../../components/design-system/primitives";
import { formatDateISO } from "../../lib/formatDate";
import { useSurfacePageOverride } from "../../surfaces";
import { ProjectAutomationPanel } from "../../components/full-auto/ProjectAutomationPanel";
import { JobPreviewList } from "../../components/preview/JobPreviewList";
import { cn } from "../../lib/cn";

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
  product_review: "Ürün Değerlendirme",
  educational_video: "Eğitim Videosu",
  howto_video: "Nasıl Yapılır Videosu",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  in_progress: "Devam Ediyor",
  rendering: "Render Ediliyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  published: "Yayınlandı",
  unpublished: "Yayınlanmadı",
  not_required: "Gerekmiyor",
  queued: "Sırada",
  running: "Çalışıyor",
  review_required: "İnceleme Bekleniyor",
  cancelled: "İptal",
};

// PHASE AE: per-job next-action hint for user-facing job row.
function nextActionHint(status: string | null | undefined): string | null {
  switch ((status ?? "").toLowerCase()) {
    case "queued":
    case "scheduled":
      return "Sırada — iş başlayınca güncelleme göreceksiniz";
    case "running":
    case "in_progress":
      return "Üretim devam ediyor — detay sayfasından adımları izleyin";
    case "review_required":
    case "pending_review":
    case "awaiting_review":
      return "İnceleme bekleniyor — detay sayfasından onaylayın";
    case "completed":
    case "succeeded":
    case "success":
      return "Hazır — yayın için “Yayına Gönder” düğmesini kullanın";
    case "failed":
    case "error":
      return "Başarısız — detay sayfasında hata ve yeniden deneme";
    case "cancelled":
    case "canceled":
      return "İptal edildi";
    default:
      return null;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-2 border-b border-neutral-100">
      <span className="w-[160px] shrink-0 text-neutral-600 text-sm font-medium">
        {label}
      </span>
      <span className="text-sm text-neutral-800">{children}</span>
    </div>
  );
}

export function ProjectDetailPage() {
  const Override = useSurfacePageOverride("user.projects.detail");
  if (Override) return <Override />;
  return <LegacyProjectDetailPage />;
}

type DetailTab = "general" | "automation";
const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: "general", label: "Genel" },
  { key: "automation", label: "Otomasyon" },
];

// PHASE AF — module launcher card type
interface LauncherSpec {
  moduleType: string;
  label: string;
  description: string;
  path: string;
  icon: string;
}

const LAUNCHERS: LauncherSpec[] = [
  {
    moduleType: "standard_video",
    label: "Video",
    description: "Standart video (YouTube, Shorts) — senaryo + render.",
    path: "/user/create/video",
    icon: "▶",
  },
  {
    moduleType: "news_bulletin",
    label: "Haber Bülteni",
    description: "Kürate haber listesi — bülten video üretimi.",
    path: "/user/create/bulletin",
    icon: "📰",
  },
  {
    moduleType: "product_review",
    label: "Ürün İncelemesi",
    description: "URL → scrape → inceleme video üretimi.",
    path: "/user/create/product-review",
    icon: "★",
  },
];

function LegacyProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<DetailTab>("general");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: project, isLoading, isError, error } = useContentProject(projectId ?? "");

  // PHASE AF — aggregate summary (jobs + publish counts)
  const { data: summary } = useProjectSummary(projectId ?? null);

  // PHASE AF — filtered project jobs via dedicated endpoint
  const { data: projectJobs } = useProjectJobs(projectId ?? null, {
    module_type: moduleFilter || undefined,
    status: statusFilter || undefined,
  });

  // Linked channel for "Kanal" row
  const { data: channel } = useChannelProfile(project?.channel_profile_id ?? "");

  // Standard videos linked to this project — used only for "Üretime Başla"
  // button on the single-video path (pre-PHASE AF projects).
  const { data: linkedVideos } = useQuery({
    queryKey: ["standard-videos", { content_project_id: projectId }],
    queryFn: () => fetchStandardVideos({ limit: 10 }),
    enabled: !!projectId && project?.module_type === "standard_video",
    select: (videos) => videos.filter((v) => v.content_project_id === projectId),
  });

  // Fallback — eger PHASE AF endpoint empty donerse eski path'i kullan;
  // backend ownership ayni sekilde zorlar.
  const { data: fallbackJobs } = useQuery({
    queryKey: ["jobs", { content_project_id: projectId }],
    queryFn: () => fetchJobs({ content_project_id: projectId }),
    enabled: !!projectId && !projectJobs,
  });

  const { data: projectPublishRecords } = usePublishRecordsByProject(projectId);

  // Flatten to JobResponse-like shape
  const linkedJobs: JobResponse[] = (projectJobs as unknown as JobResponse[] | undefined)
    ?? fallbackJobs
    ?? [];

  // Son is icin preview paneli
  const latestJobForPreview: JobResponse | undefined = linkedJobs.length > 0
    ? [...linkedJobs].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0]
    : undefined;

  const pendingVideo = linkedVideos?.find(
    (v) => !["rendering", "completed", "published"].includes(v.status),
  );

  const { mutate: startProduction, isPending: isStarting } = useMutation({
    mutationFn: (videoId: string) => startStandardVideoProduction(videoId),
    onSuccess: (data) => {
      toast.success("Üretim başlatıldı!");
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["standard-videos"] });
      qc.invalidateQueries({ queryKey: ["content-projects"] });
      navigate(`/user/jobs/${data.job_id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Üretim başlatılamadı.");
    },
  });

  if (isLoading) {
    return (
      <PageShell
        title="Proje Detayı"
        breadcrumb={[{ label: "Projelerim", to: "/user/projects" }, { label: "Detay" }]}
        testId="project-detail-loading"
      >
        <p className="text-neutral-500">Yükleniyor...</p>
      </PageShell>
    );
  }

  if (isError || !project) {
    return (
      <PageShell
        title="Proje Detayı"
        breadcrumb={[{ label: "Projelerim", to: "/user/projects" }, { label: "Detay" }]}
        testId="project-detail-error"
      >
        <p className="text-error-dark">
          {error instanceof Error ? error.message : "Proje bulunamadı."}
        </p>
      </PageShell>
    );
  }

  const em = <span className="text-neutral-400">&mdash;</span>;

  // Launcher'a gidisde proje + kanal context'ini tasi.
  function launchModule(path: string) {
    if (!project) return;
    const params = new URLSearchParams();
    params.set("contentProjectId", project.id);
    if (project.channel_profile_id) {
      params.set("channelProfileId", project.channel_profile_id);
    }
    navigate(`${path}?${params.toString()}`);
  }

  return (
    <PageShell
      title={project.title}
      subtitle={MODULE_LABELS[project.module_type] ?? project.module_type}
      breadcrumb={[
        { label: "Projelerim", to: "/user/projects" },
        { label: project.title },
      ]}
      testId="project-detail"
    >
      <TabBar<DetailTab>
        tabs={DETAIL_TABS}
        active={activeTab}
        onChange={setActiveTab}
        testId="project-detail-tabs"
      />

      {activeTab === "automation" && projectId ? (
        <ProjectAutomationPanel
          projectId={projectId}
          moduleType={project.module_type}
          testId="project-detail-automation"
        />
      ) : null}

      {activeTab === "general" ? (
        <>
          {/* Overview */}
          <SectionShell title="Proje Bilgileri" testId="project-overview">
            <Row label="Proje ID">
              <Mono>{project.id}</Mono>
            </Row>
            <Row label="Modül (ana)">
              <span className="font-medium">
                {MODULE_LABELS[project.module_type] ?? project.module_type}
              </span>
            </Row>
            <Row label="Kanal">
              {project.channel_profile_id ? (
                <Link
                  to={`/user/channels/${project.channel_profile_id}`}
                  className="text-brand-600 hover:text-brand-700 underline"
                  data-testid="project-channel-link"
                >
                  {channel?.profile_name ?? channel?.title ?? `...${project.channel_profile_id.slice(-8)}`}
                  {channel?.handle ? (
                    <span className="text-neutral-500 ml-1">@{channel.handle}</span>
                  ) : null}
                </Link>
              ) : (
                em
              )}
            </Row>
            <Row label="İçerik Durumu">
              <StatusBadge
                status={project.content_status}
                label={STATUS_LABELS[project.content_status] ?? project.content_status}
              />
            </Row>
            <Row label="Yayın Durumu">
              <StatusBadge
                status={project.publish_status}
                label={STATUS_LABELS[project.publish_status] ?? project.publish_status}
              />
            </Row>
            <Row label="Öncelik">
              <span className="capitalize">{project.priority}</span>
            </Row>
            <Row label="Oluşturulma">{formatDateISO(project.created_at) || em}</Row>
            {project.description && (
              <Row label="Açıklama">
                <span className="text-neutral-700">{project.description}</span>
              </Row>
            )}
            {project.active_job_id && (
              <Row label="Aktif Job">
                <Link
                  to={`/user/jobs/${project.active_job_id}`}
                  className="text-brand-600 hover:text-brand-700 underline text-sm"
                >
                  {project.active_job_id.slice(0, 12)}...
                </Link>
              </Row>
            )}
          </SectionShell>

          {/* PHASE AF — Summary (aggregate counts, honest) */}
          {summary && (
            <SectionShell title="Proje Özeti" testId="project-summary">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryStat label="Toplam İş" value={summary.jobs.total} />
                <SummaryStat
                  label="Tamamlanan"
                  value={summary.jobs.by_status.completed ?? 0}
                />
                <SummaryStat label="Yayın Kaydı" value={summary.publish.total} />
                <SummaryStat
                  label="Yayınlanan"
                  value={summary.publish.by_status.published ?? 0}
                />
              </div>
              {(Object.keys(summary.jobs.by_module).length > 0 ||
                Object.keys(summary.jobs.by_status).length > 0) && (
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-600">
                  {Object.entries(summary.jobs.by_module).map(([mod, n]) => (
                    <span
                      key={mod}
                      className="px-2 py-0.5 rounded-sm bg-neutral-50 border border-border-subtle"
                      data-testid={`project-summary-module-${mod}`}
                    >
                      {MODULE_LABELS[mod] ?? mod}: <strong>{n}</strong>
                    </span>
                  ))}
                </div>
              )}
              {summary.jobs.last_created_at && (
                <p className="m-0 mt-2 text-[11px] text-neutral-500">
                  Son iş: {formatDateISO(summary.jobs.last_created_at)}
                  {summary.publish.last_published_at
                    ? ` · Son yayın: ${formatDateISO(summary.publish.last_published_at)}`
                    : ""}
                </p>
              )}
            </SectionShell>
          )}

          {/* PHASE AF — Launcher (3 modul) */}
          <SectionShell title="Yeni İş Başlat" testId="project-launcher">
            <p className="m-0 mb-3 text-xs text-neutral-500">
              Proje + kanal bağlamı korunur — wizard açılırken doldurulmuş gelir.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {LAUNCHERS.map((l) => (
                <button
                  key={l.moduleType}
                  type="button"
                  onClick={() => launchModule(l.path)}
                  className="flex flex-col items-start gap-1 px-4 py-3 text-left border rounded-md cursor-pointer transition-colors bg-white text-neutral-700 border-border hover:bg-brand-50 hover:border-brand-300"
                  data-testid={`project-launcher-${l.moduleType}`}
                >
                  <span className="text-base font-semibold text-neutral-900">
                    <span aria-hidden className="mr-1">{l.icon}</span>
                    {l.label}
                  </span>
                  <span className="text-[11px] text-neutral-500 leading-snug">
                    {l.description}
                  </span>
                </button>
              ))}
            </div>
          </SectionShell>

          {/* PHASE AE legacy: standard_video tek-video baslatma kisayolu */}
          {project.module_type === "standard_video" && pendingVideo && (
            <SectionShell title="Bekleyen Video" testId="project-pending-video">
              <div className="flex items-center justify-between">
                <div>
                  <p className="m-0 text-sm text-neutral-700">
                    Taslak video hazır — üretimi başlatabilirsiniz.
                  </p>
                  <p className="m-0 mt-0.5 text-[11px] text-neutral-500">
                    Video ID: <Mono>{pendingVideo.id.slice(0, 12)}...</Mono>
                  </p>
                </div>
                <button
                  onClick={() => startProduction(pendingVideo.id)}
                  disabled={isStarting}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-brand-600 border border-brand-600 rounded-sm cursor-pointer hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="project-action-start-standard-video"
                >
                  {isStarting ? "Başlatılıyor..." : "▶ Üretime Başla"}
                </button>
              </div>
            </SectionShell>
          )}

          {/* PHASE AF — Jobs filter + list */}
          <SectionShell title="Bağlı İşler" testId="project-jobs">
            <div className="flex flex-wrap gap-2 mb-3" data-testid="project-jobs-filter">
              <select
                className="px-2 py-1 text-xs border border-border rounded-sm bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-focus"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                data-testid="project-jobs-filter-module"
                aria-label="Modül filtresi"
              >
                <option value="">Tüm modüller</option>
                <option value="standard_video">Standart Video</option>
                <option value="news_bulletin">Haber Bülteni</option>
                <option value="product_review">Ürün İncelemesi</option>
              </select>
              <select
                className="px-2 py-1 text-xs border border-border rounded-sm bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-focus"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                data-testid="project-jobs-filter-status"
                aria-label="Durum filtresi"
              >
                <option value="">Tüm durumlar</option>
                <option value="queued">Sırada</option>
                <option value="running">Çalışıyor</option>
                <option value="review_required">İnceleme Bekleniyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="failed">Başarısız</option>
                <option value="cancelled">İptal</option>
              </select>
              {(moduleFilter || statusFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setModuleFilter("");
                    setStatusFilter("");
                  }}
                  className="px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900 underline"
                  data-testid="project-jobs-filter-clear"
                >
                  Filtreyi temizle
                </button>
              )}
            </div>
            {linkedJobs.length === 0 ? (
              <p
                className="text-sm text-neutral-400 m-0 py-2"
                data-testid="project-jobs-empty"
              >
                {moduleFilter || statusFilter
                  ? "Bu filtreye uyan iş yok."
                  : "Henüz bu projeye bağlı iş yok. Yukarıdan yeni bir iş başlatabilirsiniz."}
              </p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {linkedJobs.map((job: JobResponse) => {
                  const hint = nextActionHint(job.status);
                  return (
                    <div
                      key={job.id}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 hover:bg-brand-50 cursor-pointer transition-colors",
                      )}
                      onClick={() => navigate(`/user/jobs/${job.id}`)}
                      data-testid={`project-linked-job-${job.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-sm font-medium text-neutral-800">
                          {MODULE_LABELS[job.module_type] ?? job.module_type}
                          {" · "}
                          <Mono>{job.id.slice(0, 12)}...</Mono>
                        </p>
                        <p className="m-0 mt-0.5 text-xs text-neutral-500">
                          {formatDateISO(job.created_at)}
                          {job.current_step_key
                            ? ` · Adım: ${job.current_step_key}`
                            : ""}
                        </p>
                        {hint && (
                          <p
                            className="m-0 mt-1 text-[11px] text-brand-700 font-medium"
                            data-testid={`project-linked-job-${job.id}-hint`}
                          >
                            → {hint}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={job.status} size="sm" />
                    </div>
                  );
                })}
              </div>
            )}
          </SectionShell>

          {/* Son is icin preview + nihai artifact'ler (reused) */}
          {latestJobForPreview && (
            <JobPreviewList
              jobId={latestJobForPreview.id}
              testId="project-detail-previews"
              compactCards
            />
          )}

          {/* PHASE AD — Publish records linked to this project */}
          {projectPublishRecords && projectPublishRecords.length > 0 && (
            <SectionShell title="Yayın Durumu" testId="project-publish-records">
              <div className="divide-y divide-border-subtle">
                {projectPublishRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-brand-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/user/publish/${record.id}`)}
                    data-testid={`project-publish-record-${record.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-sm font-medium text-neutral-800">
                        {record.platform} &middot; <Mono>{record.id.slice(0, 12)}...</Mono>
                      </p>
                      <p className="m-0 mt-0.5 text-xs text-neutral-500">
                        {record.review_state} &middot;{" "}
                        {record.published_at
                          ? `Yayınlandı: ${formatDateISO(record.published_at)}`
                          : record.scheduled_at
                            ? `Planlandı: ${formatDateISO(record.scheduled_at)}`
                            : `Oluşturuldu: ${formatDateISO(record.created_at)}`}
                      </p>
                    </div>
                    <StatusBadge
                      status={record.status}
                      label={STATUS_LABELS[record.status] ?? record.status}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </SectionShell>
          )}

          {/* Genel aksiyonlar */}
          <SectionShell title="Aksiyonlar" testId="project-actions">
            <div className="flex gap-3 flex-wrap items-center">
              {linkedJobs.some((j) => j.status === "completed") && (
                <button
                  onClick={() => navigate(`/user/publish?projectId=${project.id}`)}
                  className="px-4 py-1.5 text-sm font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded-sm cursor-pointer hover:bg-brand-100"
                  data-testid="project-action-publish"
                >
                  📡 Yayına Gönder
                </button>
              )}
              <button
                onClick={() => navigate("/user/projects")}
                className="px-4 py-1.5 text-sm text-neutral-600 bg-transparent border border-border rounded-sm cursor-pointer hover:bg-neutral-50"
              >
                Projelere Dön
              </button>
            </div>
          </SectionShell>
        </>
      ) : null}
    </PageShell>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-md border border-border-subtle bg-white px-3 py-2"
      data-testid={`project-summary-stat-${label}`}
    >
      <p className="m-0 text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="m-0 mt-1 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
