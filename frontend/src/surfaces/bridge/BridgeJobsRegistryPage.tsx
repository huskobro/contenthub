/**
 * BridgeJobsRegistryPage — ops-dense jobs registry override
 *
 * Faz 2 — Bridge prototype.
 *
 * Drop-in replacement for `JobsRegistryPage` that registers itself under the
 * page key `admin.jobs.registry`. Uses the SAME hooks and mutations as the
 * legacy page (no new backend contracts) but re-presents the data with:
 *
 *   - A dense left column: filterable job list with status/module/step/age
 *   - A right column: inline detail drawer (no modal), resized to ~40%
 *   - A strip of bucket counters along the top (queued / running / failed / ...)
 *   - Consistent "archive" and "clone" mutations reused from the legacy page
 *
 * Contract preservation:
 *   - Routes: unchanged. Navigate to /admin/jobs/:jobId uses react-router.
 *   - Data: useJobsList, markJobsAsTestData, cloneJob (legacy API surface)
 *   - Visibility: this override is only reachable when the bridge surface is
 *     resolved for the admin scope, so no new visibility gates are needed.
 *   - Fallback: if bridge is not active, useSurfacePageOverride returns null
 *     and the legacy page renders instead. No code path here runs.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useJobsList } from "../../hooks/useJobsList";
import { markJobsAsTestData, cloneJob, type JobResponse } from "../../api/jobsApi";
import { JobDetailPanel } from "../../components/jobs/JobDetailPanel";
import { useToast } from "../../hooks/useToast";

// ---------------------------------------------------------------------------
// Helpers — all local to keep the legacy page untouched
// ---------------------------------------------------------------------------

const STATUS_BUCKETS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: "queued", label: "Kuyruk", match: (s) => s === "queued" },
  { key: "running", label: "Calisiyor", match: (s) => s === "running" || s === "processing" || s === "retrying" },
  { key: "review", label: "Review", match: (s) => s === "pending_review" || s === "review" },
  { key: "completed", label: "Tamamlandi", match: (s) => s === "completed" },
  { key: "failed", label: "Hata", match: (s) => s === "failed" || s === "cancelled" },
];

function formatAge(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "simdi";
  if (m < 60) return `${m}d`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  const d = Math.floor(h / 24);
  return `${d}g`;
}

function statusTint(status: string): string {
  if (status === "queued") return "bg-neutral-100 text-neutral-700 border-border-subtle";
  if (status === "running" || status === "processing" || status === "retrying")
    return "bg-brand-50 text-brand-700 border-brand-200";
  if (status === "pending_review") return "bg-warning-light text-warning-dark border-warning";
  if (status === "completed") return "bg-success-light text-success-dark border-success";
  if (status === "failed" || status === "cancelled") return "bg-error-light text-error-dark border-error";
  return "bg-neutral-100 text-neutral-700 border-border-subtle";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function BridgeJobsRegistryPage() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: jobs, isLoading, isError, error } = useJobsList(includeArchived);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bucketFilter, setBucketFilter] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: (jobIds: string[]) => markJobsAsTestData(jobIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job arsivlendi");
    },
    onError: () => toast.error("Arsivleme basarisiz"),
  });

  const cloneMutation = useMutation({
    mutationFn: (jobId: string) => cloneJob(jobId),
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job klonlandi");
      navigate(`/admin/jobs/${newJob.id}`);
    },
    onError: () => toast.error("Klonlama basarisiz"),
  });

  const rawJobs: JobResponse[] = jobs ?? [];

  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const bucket of STATUS_BUCKETS) counts[bucket.key] = 0;
    for (const job of rawJobs) {
      for (const bucket of STATUS_BUCKETS) {
        if (bucket.match(job.status)) counts[bucket.key]++;
      }
    }
    return counts;
  }, [rawJobs]);

  const moduleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const j of rawJobs) if (j.module_type) set.add(j.module_type);
    return Array.from(set).sort();
  }, [rawJobs]);

  const filteredJobs = useMemo(() => {
    return rawJobs.filter((j) => {
      if (moduleFilter && j.module_type !== moduleFilter) return false;
      if (bucketFilter) {
        const bucket = STATUS_BUCKETS.find((b) => b.key === bucketFilter);
        if (!bucket || !bucket.match(j.status)) return false;
      }
      return true;
    });
  }, [rawJobs, bucketFilter, moduleFilter]);

  return (
    <div className="flex flex-col gap-3" data-testid="bridge-jobs-registry">
      {/* ---- Header strip ------------------------------------------------ */}
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="m-0 text-lg font-semibold text-neutral-900">Uretim Kokpiti</h1>
          <p className="m-0 text-xs text-neutral-500">
            Job kuyrugu, adim durumu ve operasyonel aksiyonlar. Ops-dense gorunum.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              data-testid="bridge-jobs-archived-toggle"
            />
            Arsivi dahil et
          </label>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-2 py-1 text-xs border border-border-subtle rounded-md bg-surface-page text-neutral-700"
            data-testid="bridge-jobs-module-filter"
          >
            <option value="">Tum moduller</option>
            {moduleOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ---- Bucket counters --------------------------------------------- */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${STATUS_BUCKETS.length}, minmax(0, 1fr))` }}
        data-testid="bridge-jobs-buckets"
      >
        {STATUS_BUCKETS.map((bucket) => {
          const active = bucketFilter === bucket.key;
          return (
            <button
              key={bucket.key}
              onClick={() => setBucketFilter(active ? null : bucket.key)}
              className={`flex flex-col items-start gap-1 px-3 py-2 rounded-md border text-left cursor-pointer transition-colors ${
                active
                  ? "bg-brand-50 border-brand-400 text-brand-700"
                  : "bg-surface-page border-border-subtle text-neutral-700 hover:border-brand-300"
              }`}
              data-testid={`bridge-jobs-bucket-${bucket.key}`}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                {bucket.label}
              </span>
              <span className="text-xl font-semibold leading-none tabular-nums">
                {bucketCounts[bucket.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---- Split view: list (left) + inline drawer (right) ------------- */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" }}>
        {/* ---- Dense job list --------------------------------------------- */}
        <div className="border border-border-subtle rounded-md bg-surface-page overflow-hidden">
          <div className="px-3 py-2 border-b border-border-subtle bg-surface-inset flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
              Isler ({filteredJobs.length})
            </span>
            {bucketFilter && (
              <button
                onClick={() => setBucketFilter(null)}
                className="text-[10px] text-neutral-500 hover:text-neutral-800 bg-transparent border-none cursor-pointer p-0"
                data-testid="bridge-jobs-clear-bucket"
              >
                filtreyi temizle
              </button>
            )}
          </div>
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {isLoading && <p className="m-0 p-4 text-sm text-neutral-500">Yukleniyor...</p>}
            {isError && (
              <p className="m-0 p-4 text-sm text-error">
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {!isLoading && !isError && filteredJobs.length === 0 && (
              <p className="m-0 p-4 text-sm text-neutral-500">Filtreye uygun kayit yok.</p>
            )}
            <ul className="list-none m-0 p-0">
              {filteredJobs.map((job) => {
                const isSelected = selectedId === job.id;
                return (
                  <li
                    key={job.id}
                    onClick={() => setSelectedId(job.id)}
                    className={`px-3 py-2 border-b border-border-subtle cursor-pointer ${
                      isSelected ? "bg-brand-50" : "hover:bg-neutral-50"
                    }`}
                    data-testid={`bridge-jobs-row-${job.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`shrink-0 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${statusTint(job.status)}`}
                      >
                        {job.status}
                      </span>
                      <span className="text-xs text-neutral-500 font-mono shrink-0">
                        {job.module_type}
                      </span>
                      <span className="text-xs text-neutral-400 shrink-0">
                        {formatAge(job.created_at)}
                      </span>
                      <span className="text-xs text-neutral-600 font-mono truncate ml-auto">
                        {job.id.slice(0, 8)}
                      </span>
                    </div>
                    {job.current_step_key && (
                      <div className="mt-1 text-[11px] text-neutral-500 truncate">
                        adim: <span className="font-mono text-neutral-700">{job.current_step_key}</span>
                        {job.retry_count > 0 && (
                          <span className="ml-2 text-warning-dark">retry: {job.retry_count}</span>
                        )}
                      </div>
                    )}
                    {job.last_error && (
                      <div className="mt-1 text-[11px] text-error truncate" title={job.last_error}>
                        err: {job.last_error}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* ---- Inline detail drawer ---------------------------------------- */}
        <div className="border border-border-subtle rounded-md bg-surface-page flex flex-col" data-testid="bridge-jobs-drawer">
          <div className="px-3 py-2 border-b border-border-subtle bg-surface-inset flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
              Detay
            </span>
            {selectedId && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cloneMutation.mutate(selectedId)}
                  disabled={cloneMutation.isPending}
                  className="text-[10px] px-2 py-0.5 rounded border border-border-subtle bg-surface-page hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
                  data-testid="bridge-jobs-drawer-clone"
                >
                  Klonla
                </button>
                <button
                  onClick={() => archiveMutation.mutate([selectedId])}
                  disabled={archiveMutation.isPending}
                  className="text-[10px] px-2 py-0.5 rounded border border-border-subtle bg-surface-page hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
                  data-testid="bridge-jobs-drawer-archive"
                >
                  Arsivle
                </button>
                <button
                  onClick={() => navigate(`/admin/jobs/${selectedId}`)}
                  className="text-[10px] px-2 py-0.5 rounded border border-brand-400 bg-brand-50 text-brand-700 hover:bg-brand-100 cursor-pointer"
                  data-testid="bridge-jobs-drawer-open"
                >
                  Kokpit &rarr;
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {!selectedId && (
              <p className="m-0 text-xs text-neutral-500">Detayi gormek icin bir job sec.</p>
            )}
            {selectedId && <JobDetailPanel selectedId={selectedId} />}
          </div>
        </div>
      </div>
    </div>
  );
}
