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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useJobsList } from "../../hooks/useJobsList";
import {
  markJobsAsTestData,
  cloneJob,
  cancelJob,
  retryJob,
  fetchAllowedActions,
  type AllowedActions,
  type JobResponse,
} from "../../api/jobsApi";
import { JobDetailPanel } from "../../components/jobs/JobDetailPanel";
import { useToast } from "../../hooks/useToast";

// ---------------------------------------------------------------------------
// Helpers — all local to keep the legacy page untouched
// ---------------------------------------------------------------------------

const STATUS_BUCKETS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: "queued", label: "Kuyruk", match: (s) => s === "queued" },
  { key: "running", label: "Çalışıyor", match: (s) => s === "running" || s === "processing" || s === "retrying" },
  { key: "review", label: "İnceleme", match: (s) => s === "pending_review" || s === "review" },
  { key: "completed", label: "Tamamlandı", match: (s) => s === "completed" },
  { key: "failed", label: "Hata", match: (s) => s === "failed" || s === "cancelled" },
];

// Round 2 polish (B): status string'lerini kullanıcıya Türkçe göster.
// Backend hâlâ ham status'u üretiyor (state machine aynı); bu yalnızca bir
// sunum katmanı eşlemesi.
const STATUS_LABELS: Record<string, string> = {
  queued: "Kuyruk",
  running: "Çalışıyor",
  processing: "Çalışıyor",
  retrying: "Yeniden",
  pending_review: "İnceleme",
  review: "İnceleme",
  completed: "Tamamlandı",
  failed: "Hata",
  cancelled: "İptal",
};

function localizeStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function formatAge(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "şimdi";
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
      toast.success("İş arşivlendi");
    },
    onError: () => toast.error("Arşivleme başarısız"),
  });

  const cloneMutation = useMutation({
    mutationFn: (jobId: string) => cloneJob(jobId),
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("İş klonlandı");
      navigate(`/admin/jobs/${newJob.id}`);
    },
    onError: () => toast.error("Klonlama başarısız"),
  });

  // Capability-gated inline actions. We intentionally reuse the existing
  // allowed-actions endpoint — the backend owns the state machine, and this
  // page is forbidden from fabricating new transitions. Disabled buttons are
  // rendered with a title explaining why, so the operator always knows.
  const cancelMutation = useMutation({
    mutationFn: (jobId: string) => cancelJob(jobId),
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job-actions", jobId] });
      toast.success("İş iptal talebi gönderildi");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "İptal başarısız";
      toast.error(msg);
    },
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => retryJob(jobId),
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job-actions", jobId] });
      toast.success("Yeniden deneme tetiklendi");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Yeniden deneme başarısız";
      toast.error(msg);
    },
  });

  // Allowed actions for the currently selected job. Gated entirely by
  // capability flags from the backend — no client-side guessing.
  const { data: allowedActions } = useQuery<AllowedActions>({
    queryKey: ["job-actions", selectedId, includeArchived],
    queryFn: () => fetchAllowedActions(selectedId as string),
    enabled: !!selectedId,
    staleTime: 5_000,
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

  // ----- Keyboard navigation inside the job list -------------------------
  // ArrowUp/Down move the selection, Enter opens the cockpit. Focus is kept
  // on a single tabbable container so Tab still moves the user out cleanly.
  const listRef = useRef<HTMLUListElement | null>(null);
  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return filteredJobs.findIndex((j) => j.id === selectedId);
  }, [filteredJobs, selectedId]);

  const moveSelection = useCallback(
    (delta: number) => {
      if (filteredJobs.length === 0) return;
      const current = selectedIndex >= 0 ? selectedIndex : 0;
      const next = Math.max(0, Math.min(filteredJobs.length - 1, current + delta));
      const nextJob = filteredJobs[next];
      if (nextJob) setSelectedId(nextJob.id);
    },
    [filteredJobs, selectedIndex],
  );

  const handleListKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLUListElement>) => {
      if (filteredJobs.length === 0) return;
      switch (event.key) {
        case "ArrowDown":
        case "j":
          event.preventDefault();
          moveSelection(1);
          break;
        case "ArrowUp":
        case "k":
          event.preventDefault();
          moveSelection(-1);
          break;
        case "Home":
          event.preventDefault();
          setSelectedId(filteredJobs[0]?.id ?? null);
          break;
        case "End":
          event.preventDefault();
          setSelectedId(filteredJobs[filteredJobs.length - 1]?.id ?? null);
          break;
        case "Enter":
          if (selectedId) {
            event.preventDefault();
            navigate(`/admin/jobs/${selectedId}`);
          }
          break;
        default:
          break;
      }
    },
    [filteredJobs, moveSelection, navigate, selectedId],
  );

  // Scroll the selected row into view after keyboard navigation changes it.
  // jsdom (test env) does not implement scrollIntoView, so guard the call.
  useEffect(() => {
    if (!selectedId) return;
    const root = listRef.current;
    if (!root) return;
    const row = root.querySelector<HTMLLIElement>(`[data-testid="bridge-jobs-row-${selectedId}"]`);
    if (row && typeof row.scrollIntoView === "function") {
      row.scrollIntoView({ block: "nearest" });
    }
  }, [selectedId]);

  return (
    <div className="flex flex-col gap-3" data-testid="bridge-jobs-registry">
      {/* ---- Header strip ------------------------------------------------ */}
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="m-0 text-lg font-semibold text-neutral-900">Üretim Kokpiti</h1>
          <p className="m-0 text-xs text-neutral-500">
            İş kuyruğu, adım durumu ve operasyonel aksiyonlar. Operasyonel yoğun görünüm.
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
            Arşivi dahil et
          </label>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-2 py-1 text-xs border border-border-subtle rounded-md bg-surface-page text-neutral-700"
            data-testid="bridge-jobs-module-filter"
          >
            <option value="">Tüm modüller</option>
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
        <div className="border border-border-subtle rounded-md bg-surface-page overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-border-subtle bg-surface-inset flex items-center justify-between sticky top-0 z-10">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
              İşler ({filteredJobs.length})
              <span className="ml-2 text-[10px] font-mono text-neutral-400 normal-case tracking-normal">
                ↑↓ ile gez · Enter ile kokpit
              </span>
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
          {/* Column headers — tabular alignment guide */}
          <div
            className="px-3 py-1 border-b border-border-subtle bg-surface-page flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-neutral-400"
            data-testid="bridge-jobs-column-headers"
          >
            <span className="shrink-0" style={{ width: "84px" }}>durum</span>
            <span className="shrink-0" style={{ width: "110px" }}>modül</span>
            <span className="shrink-0" style={{ width: "40px" }}>yaş</span>
            <span className="flex-1 min-w-0">adım / hata</span>
            <span className="shrink-0" style={{ width: "64px" }}>id</span>
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto flex-1">
            {isLoading && <p className="m-0 p-4 text-sm text-neutral-500">Yükleniyor...</p>}
            {isError && (
              <p className="m-0 p-4 text-sm text-error">
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {!isLoading && !isError && filteredJobs.length === 0 && (
              <p className="m-0 p-4 text-sm text-neutral-500">Bu filtreye uyan kayıt yok. Filtreyi değiştirin ya da temizleyin.</p>
            )}
            <ul
              ref={listRef}
              className="list-none m-0 p-0 focus:outline-none"
              role="listbox"
              aria-label="İş listesi"
              tabIndex={filteredJobs.length > 0 ? 0 : -1}
              onKeyDown={handleListKeyDown}
              data-testid="bridge-jobs-list"
            >
              {filteredJobs.map((job) => {
                const isSelected = selectedId === job.id;
                return (
                  <li
                    key={job.id}
                    onClick={() => setSelectedId(job.id)}
                    role="option"
                    aria-selected={isSelected}
                    className={`px-3 py-2 border-b border-border-subtle cursor-pointer flex flex-col gap-1 border-l-2 ${
                      isSelected
                        ? "bg-brand-50 border-l-brand-500"
                        : "border-l-transparent hover:bg-neutral-50"
                    }`}
                    data-testid={`bridge-jobs-row-${job.id}`}
                    data-selected={isSelected ? "true" : undefined}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`shrink-0 text-center px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${statusTint(job.status)}`}
                        style={{ width: "84px" }}
                        title={job.status}
                      >
                        {localizeStatus(job.status)}
                      </span>
                      <span
                        className="text-xs text-neutral-500 font-mono shrink-0 truncate"
                        style={{ width: "110px" }}
                      >
                        {job.module_type}
                      </span>
                      <span
                        className="text-xs text-neutral-400 shrink-0 tabular-nums"
                        style={{ width: "40px" }}
                      >
                        {formatAge(job.created_at)}
                      </span>
                      <span className="flex-1 min-w-0 text-[11px] text-neutral-500 truncate">
                        {job.current_step_key ? (
                          <>
                            <span className="font-mono text-neutral-700">{job.current_step_key}</span>
                            {job.retry_count > 0 && (
                              <span className="ml-2 text-warning-dark">retry:{job.retry_count}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </span>
                      <span
                        className="text-xs text-neutral-600 font-mono truncate shrink-0 text-right"
                        style={{ width: "64px" }}
                        title={job.id}
                      >
                        {job.id.slice(0, 8)}
                      </span>
                    </div>
                    {job.last_error && (
                      <div className="text-[11px] text-error truncate pl-[86px]" title={job.last_error}>
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
          <div className="px-3 py-2 border-b border-border-subtle bg-surface-inset flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
              Detay
            </span>
            {selectedId && (
              <div className="flex items-center gap-1 flex-wrap">
                {/* Capability-gated inline actions. Backend state machine owns
                    the truth via /allowed-actions — we only mirror it. */}
                <button
                  onClick={() => cancelMutation.mutate(selectedId)}
                  disabled={!allowedActions?.can_cancel || cancelMutation.isPending}
                  title={
                    !allowedActions?.can_cancel
                      ? "Bu durumda iptal edilemez"
                      : "İşi iptal et"
                  }
                  className="text-[10px] px-2 py-0.5 rounded border border-border-subtle bg-surface-page hover:bg-neutral-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  data-testid="bridge-jobs-drawer-cancel"
                >
                  İptal et
                </button>
                <button
                  onClick={() => retryMutation.mutate(selectedId)}
                  disabled={!allowedActions?.can_retry || retryMutation.isPending}
                  title={
                    !allowedActions?.can_retry
                      ? "Bu durumda yeniden deneme yok"
                      : "Yeniden dene"
                  }
                  className="text-[10px] px-2 py-0.5 rounded border border-border-subtle bg-surface-page hover:bg-neutral-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  data-testid="bridge-jobs-drawer-retry"
                >
                  Yeniden dene
                </button>
                <button
                  onClick={() => cloneMutation.mutate(selectedId)}
                  disabled={!(allowedActions?.can_clone ?? true) || cloneMutation.isPending}
                  title={
                    allowedActions && !allowedActions.can_clone
                      ? "Bu iş klonlanamaz"
                      : "İşi klonla"
                  }
                  className="text-[10px] px-2 py-0.5 rounded border border-border-subtle bg-surface-page hover:bg-neutral-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                  Arşivle
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
              <p className="m-0 text-xs text-neutral-500">Detayı görmek için bir iş seçin.</p>
            )}
            {selectedId && <JobDetailPanel selectedId={selectedId} />}
          </div>
        </div>
      </div>
    </div>
  );
}
