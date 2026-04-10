/**
 * ProjectDetailPage — Faz 5a: User project detail view.
 *
 * Shows ContentProject info, linked jobs, and linked content entity status.
 * This is the "home base" for a user's content project.
 *
 * Faz 3 (Canvas): trampoline — delegates to the Canvas project workspace
 * when Canvas registers an override for `user.projects.detail`, falls
 * through to the legacy body otherwise.
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { useContentProject } from "../../hooks/useContentProjects";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import { fetchStandardVideos, startStandardVideoProduction } from "../../api/standardVideoApi";
import { useToast } from "../../hooks/useToast";
import {
  PageShell,
  SectionShell,
  StatusBadge,
  Mono,
} from "../../components/design-system/primitives";
import { formatDateISO } from "../../lib/formatDate";
import { useSurfacePageOverride } from "../../surfaces";

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bulteni",
  product_review: "Urun Degerlendirme",
  educational_video: "Egitim Videosu",
  howto_video: "Nasil Yapilir Videosu",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  in_progress: "Devam Ediyor",
  rendering: "Render Ediliyor",
  completed: "Tamamlandi",
  failed: "Basarisiz",
  published: "Yayinlandi",
  unpublished: "Yayinlanmadi",
  not_required: "Gerekmiyor",
};

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

function LegacyProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: project, isLoading, isError, error } = useContentProject(projectId ?? "");

  // Fetch jobs linked to this project
  const { data: allJobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => fetchJobs(),
    enabled: !!projectId,
  });

  // Fetch standard videos linked to this project (for start-production button)
  const { data: linkedVideos } = useQuery({
    queryKey: ["standard-videos", { content_project_id: projectId }],
    queryFn: () => fetchStandardVideos({ limit: 10 }),
    enabled: !!projectId && project?.module_type === "standard_video",
    select: (videos) => videos.filter((v) => v.content_project_id === projectId),
  });

  const linkedJobs = (allJobs ?? []).filter(
    (j: JobResponse) => j.content_project_id === projectId,
  );

  // The latest non-rendering/completed video eligible for production start
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
      navigate(`/admin/jobs/${data.job_id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Üretim başlatılamadı.");
    },
  });

  if (isLoading) {
    return (
      <PageShell
        title="Proje Detayi"
        breadcrumb={[{ label: "Projelerim", to: "/user/projects" }, { label: "Detay" }]}
        testId="project-detail-loading"
      >
        <p className="text-neutral-500">Yukleniyor...</p>
      </PageShell>
    );
  }

  if (isError || !project) {
    return (
      <PageShell
        title="Proje Detayi"
        breadcrumb={[{ label: "Projelerim", to: "/user/projects" }, { label: "Detay" }]}
        testId="project-detail-error"
      >
        <p className="text-error-dark">
          {error instanceof Error ? error.message : "Proje bulunamadi."}
        </p>
      </PageShell>
    );
  }

  const em = <span className="text-neutral-400">&mdash;</span>;

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
      {/* Overview */}
      <SectionShell title="Proje Bilgileri" testId="project-overview">
        <Row label="Proje ID">
          <Mono>{project.id}</Mono>
        </Row>
        <Row label="Modul">
          <span className="font-medium">
            {MODULE_LABELS[project.module_type] ?? project.module_type}
          </span>
        </Row>
        <Row label="Icerik Durumu">
          <StatusBadge
            status={project.content_status}
            label={STATUS_LABELS[project.content_status] ?? project.content_status}
          />
        </Row>
        <Row label="Yayin Durumu">
          <StatusBadge
            status={project.publish_status}
            label={STATUS_LABELS[project.publish_status] ?? project.publish_status}
          />
        </Row>
        <Row label="Oncellik">
          <span className="capitalize">{project.priority}</span>
        </Row>
        <Row label="Olusturulma">
          {formatDateISO(project.created_at) || em}
        </Row>
        {project.description && (
          <Row label="Aciklama">
            <span className="text-neutral-700">{project.description}</span>
          </Row>
        )}
        {project.active_job_id && (
          <Row label="Aktif Job">
            <Link
              to={`/admin/jobs/${project.active_job_id}`}
              className="text-brand-600 hover:text-brand-700 underline text-sm"
            >
              {project.active_job_id.slice(0, 12)}...
            </Link>
          </Row>
        )}
      </SectionShell>

      {/* Linked Jobs */}
      <SectionShell title="Bagli Isler" testId="project-jobs">
        {linkedJobs.length === 0 ? (
          <p className="text-sm text-neutral-400 m-0 py-2">
            Henuz bu projeye bagli is yok.
          </p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {linkedJobs.map((job: JobResponse) => (
              <div
                key={job.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-brand-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/admin/jobs/${job.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-medium text-neutral-800">
                    Job: <Mono>{job.id.slice(0, 12)}...</Mono>
                  </p>
                  <p className="m-0 mt-0.5 text-xs text-neutral-500">
                    {job.module_type} &middot;{" "}
                    {formatDateISO(job.created_at)}
                  </p>
                </div>
                <StatusBadge status={job.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </SectionShell>

      {/* Quick Actions */}
      <SectionShell title="Aksiyonlar" testId="project-actions">
        <div className="flex gap-3 flex-wrap items-center">
          {/* Üretime Başla — yalnızca standard_video ve bekleyen video varsa */}
          {project.module_type === "standard_video" && pendingVideo && (
            <button
              onClick={() => startProduction(pendingVideo.id)}
              disabled={isStarting}
              className="px-4 py-1.5 text-sm font-medium text-white bg-brand-600 border border-brand-600 rounded-sm cursor-pointer hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? "Başlatılıyor..." : "▶ Üretime Başla"}
            </button>
          )}
          {/* Rendering durumunda bilgi */}
          {project.module_type === "standard_video" &&
            linkedVideos?.some((v) => v.status === "rendering") && (
            <span className="text-sm text-neutral-500">
              ⏳ Render devam ediyor...
            </span>
          )}
          <button
            onClick={() => navigate("/user/projects")}
            className="px-4 py-1.5 text-sm text-neutral-600 bg-transparent border border-border rounded-sm cursor-pointer hover:bg-neutral-50"
          >
            Projelere Don
          </button>
        </div>
      </SectionShell>
    </PageShell>
  );
}
