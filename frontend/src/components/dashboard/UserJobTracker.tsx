import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import { useJobContentRef } from "../../hooks/useJobContentRef";
import { JobProgressBar } from "../jobs/JobProgressBar";
import { StatusBadge } from "../design-system/primitives";
import { formatDateShort } from "../../lib/formatDate";

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
  product_review: "Ürün Değerlendirme",
  educational_video: "Eğitim Videosu",
  howto_video: "Nasıl Yapılır",
};

export function UserJobTracker() {
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => fetchJobs(),
  });

  const activeJobs = (jobs ?? [])
    .filter((j) => ["queued", "running", "waiting", "retrying"].includes(j.status))
    .slice(0, 5);
  // Son 4 tamamlanan iş
  const recentCompleted = (jobs ?? [])
    .filter((j) => j.status === "completed")
    .slice(0, 4);

  if (isLoading) {
    return (
      <div data-testid="user-job-tracker" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
          <p className="text-sm text-neutral-400 m-0">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (activeJobs.length === 0 && recentCompleted.length === 0) {
    return (
      <div data-testid="user-job-tracker" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Aktif İşler</p>
          <p className="text-sm text-neutral-400 m-0">Şu an çalışan iş yok.</p>
        </div>
        <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Son Tamamlanan</p>
          <p className="text-sm text-neutral-400 m-0">Henüz tamamlanan iş yok.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="user-job-tracker" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* SOL — Aktif işler */}
      <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="m-0 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Aktif İşler
          </p>
          {activeJobs.length > 0 && (
            <span className="text-xs bg-warning-light text-warning px-2 py-0.5 rounded-full font-medium">
              {activeJobs.length} çalışıyor
            </span>
          )}
        </div>

        {activeJobs.length === 0 ? (
          <p className="text-sm text-neutral-400 m-0">Şu an çalışan iş yok.</p>
        ) : (
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onClick={() => navigate(`/user/jobs/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* SAĞ — Son tamamlanan */}
      <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="m-0 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Son Tamamlanan
          </p>
          {recentCompleted.length > 0 && (
            <button
              onClick={() => navigate("/user/projects")}
              className="text-xs text-brand-600 hover:text-brand-700 bg-transparent border-0 cursor-pointer p-0"
            >
              Tümünü Gör →
            </button>
          )}
        </div>

        {recentCompleted.length === 0 ? (
          <p className="text-sm text-neutral-400 m-0">Henüz tamamlanan iş yok.</p>
        ) : (
          <div className="space-y-1.5">
            {recentCompleted.map((job) => (
              <CompletedJobRow
                key={job.id}
                job={job}
                onClick={() => navigate(`/user/jobs/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ job, onClick }: { job: JobResponse; onClick: () => void }) {
  const moduleLabel = MODULE_LABELS[job.module_type] ?? job.module_type;
  return (
    <div
      className="p-3 bg-white border border-border-subtle rounded-lg cursor-pointer hover:border-brand-300 transition-colors"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      data-testid={`active-job-${job.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusBadge
            status={job.status === "running" ? "processing" : "warning"}
            label={job.status === "running" ? "Çalışıyor" : job.status === "queued" ? "Kuyrukta" : "Bekliyor"}
            size="sm"
          />
          <span className="text-sm font-medium text-neutral-800">{moduleLabel}</span>
        </div>
      </div>
      <JobProgressBar job={job} />
    </div>
  );
}

function CompletedJobRow({ job, onClick }: { job: JobResponse; onClick: () => void }) {
  const moduleLabel = MODULE_LABELS[job.module_type] ?? job.module_type;
  const { data: contentRef } = useJobContentRef(job.id);

  const hasTitle = !!contentRef?.content_title;
  const displayTitle = hasTitle ? contentRef!.content_title! : moduleLabel;
  const subtitle = hasTitle ? moduleLabel : null;

  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-lg border border-border-subtle bg-white cursor-pointer hover:bg-neutral-50 transition-colors"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      data-testid={`recent-job-${job.id}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
        <div className="min-w-0">
          <span className="text-sm font-medium text-neutral-800 truncate block">{displayTitle}</span>
          {subtitle && (
            <span className="text-xs text-neutral-400">{subtitle}</span>
          )}
        </div>
      </div>
      <span className="text-xs text-neutral-400 shrink-0 ml-2">{formatDateShort(job.created_at)}</span>
    </div>
  );
}
