import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import { JobProgressBar } from "../jobs/JobProgressBar";
import { StatusBadge } from "../design-system/primitives";

export function UserJobTracker() {
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  });

  const activeJobs = (jobs ?? []).filter(
    (j) => ["queued", "running", "waiting", "retrying"].includes(j.status),
  );
  const recentCompleted = (jobs ?? [])
    .filter((j) => j.status === "completed")
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="mt-4 max-w-[720px]" data-testid="user-job-tracker">
        <h3 className="m-0 mb-2 text-lg font-semibold text-neutral-900">Is Takibi</h3>
        <p className="text-sm text-neutral-400 m-0">Yukleniyor...</p>
      </div>
    );
  }

  if (activeJobs.length === 0 && recentCompleted.length === 0) {
    return (
      <div className="mt-4 max-w-[720px]" data-testid="user-job-tracker">
        <h3 className="m-0 mb-2 text-lg font-semibold text-neutral-900">Is Takibi</h3>
        <p className="text-sm text-neutral-500 m-0">Henuz aktif veya tamamlanmis is yok.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 max-w-[720px]" data-testid="user-job-tracker">
      <h3 className="m-0 mb-2 text-lg font-semibold text-neutral-900">Is Takibi</h3>

      {activeJobs.length > 0 && (
        <div className="space-y-2 mb-3">
          {activeJobs.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => navigate(`/admin/jobs/${job.id}`)} />
          ))}
        </div>
      )}

      {recentCompleted.length > 0 && (
        <>
          <p className="m-0 mb-1 text-xs text-neutral-400 font-medium">Son Tamamlanan</p>
          <div className="space-y-1.5">
            {recentCompleted.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-2 bg-neutral-50 rounded-md border border-border-subtle cursor-pointer hover:bg-neutral-100 transition-colors"
                onClick={() => navigate(`/admin/jobs/${job.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/admin/jobs/${job.id}`)}
                data-testid={`recent-job-${job.id}`}
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status="ready" label="Tamamlandi" size="sm" />
                  <span className="text-xs text-neutral-600">{job.module_type}</span>
                </div>
                <code className="text-[10px] text-neutral-400">{job.id.slice(0, 8)}</code>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function JobCard({ job, onClick }: { job: JobResponse; onClick: () => void }) {
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
          <StatusBadge status={job.status === "running" ? "processing" : "warning"} label={job.status} size="sm" />
          <span className="text-sm font-medium text-neutral-800">{job.module_type}</span>
        </div>
        <code className="text-[10px] text-neutral-400">{job.id.slice(0, 8)}</code>
      </div>
      <JobProgressBar job={job} />
    </div>
  );
}
