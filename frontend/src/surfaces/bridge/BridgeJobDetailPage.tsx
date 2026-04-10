/**
 * BridgeJobDetailPage — "cockpit" override for admin.jobs.detail
 *
 * Faz 2 — Bridge prototype.
 *
 * Drop-in replacement for `JobDetailPage`. Mission:
 *   - Present the same data that the legacy page shows, arranged for ops.
 *   - A header "vitals" strip (id, module, status, elapsed, ETA, retry count)
 *   - Three side-by-side panels (timeline / system / actions) with a
 *     stacked fallback on narrow widths via CSS grid
 *   - Inline publish-status strip so operators don't have to scroll
 *   - Reuse the existing panel components so backend contracts stay stable
 *
 * Contract preservation:
 *   - Routes: /admin/jobs/:jobId, same useParams
 *   - Data: useJobDetail, usePublishRecordForJob, useCreatePublishRecordFromJob
 *   - SSE: same useSSE call, same event types
 *   - Actions: reuses JobActionsPanel (retry / cancel / skip live here)
 *   - Review-gate: publish creation still uses the existing mutation; it does
 *     NOT bypass the review state machine.
 */

import { useParams, useNavigate } from "react-router-dom";
import { useJobDetail } from "../../hooks/useJobDetail";
import { useSSE } from "../../hooks/useSSE";
import {
  usePublishRecordForJob,
  useCreatePublishRecordFromJob,
} from "../../hooks/usePublish";
import { JobTimelinePanel } from "../../components/jobs/JobTimelinePanel";
import { JobSystemPanels } from "../../components/jobs/JobSystemPanels";
import { JobActionsPanel } from "../../components/jobs/JobActionsPanel";
import { useToast } from "../../hooks/useToast";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtSeconds(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return "\u2014";
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return `${m}d ${r.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}sa ${mm}d`;
}

function statusTint(status: string): string {
  if (status === "queued") return "bg-neutral-100 text-neutral-700 border-border-subtle";
  if (status === "running" || status === "processing" || status === "retrying")
    return "bg-brand-50 text-brand-700 border-brand-300";
  if (status === "pending_review") return "bg-warning-light text-warning-dark border-warning";
  if (status === "completed") return "bg-success-light text-success-dark border-success";
  if (status === "failed" || status === "cancelled") return "bg-error-light text-error-dark border-error";
  return "bg-neutral-100 text-neutral-700 border-border-subtle";
}

function publishStatusTint(status: string): string {
  if (status === "published") return "bg-success-light text-success-dark border-success";
  if (status === "approved" || status === "scheduled" || status === "publishing")
    return "bg-brand-50 text-brand-700 border-brand-300";
  if (status === "pending_review") return "bg-warning-light text-warning-dark border-warning";
  if (status === "failed" || status === "cancelled" || status === "review_rejected")
    return "bg-error-light text-error-dark border-error";
  return "bg-neutral-100 text-neutral-700 border-border-subtle";
}

// ---------------------------------------------------------------------------
// Cockpit
// ---------------------------------------------------------------------------

export function BridgeJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: job, isLoading, isError, error } = useJobDetail(jobId ?? null);
  const { data: publishRecords } = usePublishRecordForJob(jobId);
  const createPublishMutation = useCreatePublishRecordFromJob();

  const isActiveJob = !!job && ["queued", "running", "processing", "retrying"].includes(job.status);
  const { connected: sseConnected, reconnecting: sseReconnecting } = useSSE({
    url: `/api/v1/sse/jobs/${jobId}`,
    enabled: !!jobId && isActiveJob,
    invalidateKeys: [["job", jobId ?? ""]],
    eventTypes: ["job:status_changed", "job:step_changed"],
  });

  // ---- Loading / error states ---------------------------------------------
  if (isLoading) {
    return (
      <div data-testid="bridge-job-detail-loading" className="flex flex-col gap-3">
        <h1 className="m-0 text-lg font-semibold text-neutral-900">Job Kokpit</h1>
        <p className="m-0 text-xs text-neutral-500">Yukleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="bridge-job-detail-error" className="flex flex-col gap-3">
        <h1 className="m-0 text-lg font-semibold text-neutral-900">Job Kokpit</h1>
        <p className="m-0 text-xs text-error">
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      </div>
    );
  }

  if (!job) {
    return (
      <div data-testid="bridge-job-detail-empty" className="flex flex-col gap-3">
        <h1 className="m-0 text-lg font-semibold text-neutral-900">Job Kokpit</h1>
        <p className="m-0 text-xs text-neutral-500">Job bulunamadi.</p>
      </div>
    );
  }

  const publish = publishRecords?.[0];

  return (
    <div className="flex flex-col gap-3" data-testid="bridge-job-detail">
      {/* ---- Breadcrumb + title ----------------------------------------- */}
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-0.5">
            <button
              onClick={() => navigate("/admin/jobs")}
              className="bg-transparent border-none cursor-pointer p-0 text-neutral-400 hover:text-neutral-800"
            >
              isler
            </button>{" "}
            / kokpit
          </div>
          <h1 className="m-0 text-lg font-semibold text-neutral-900">Job Kokpit</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${statusTint(
              job.status,
            )}`}
            data-testid="bridge-job-status"
          >
            {job.status}
          </span>
          <span className="text-xs text-neutral-500 font-mono">{job.module_type}</span>
        </div>
      </div>

      {/* ---- SSE banner ------------------------------------------------- */}
      {isActiveJob && !sseConnected && (
        <div
          className={`flex items-center gap-2 text-xs text-warning-dark bg-warning-light border border-warning rounded-md px-3 py-1.5 ${
            sseReconnecting ? "animate-pulse" : ""
          }`}
          data-testid="bridge-sse-banner"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-warning shrink-0" />
          Canli baglanti kesildi — yeniden baglaniliyor...
        </div>
      )}

      {/* ---- Vitals strip ----------------------------------------------- */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
        data-testid="bridge-job-vitals"
      >
        <Vital label="Job ID" value={job.id.slice(0, 8)} mono />
        <Vital label="Modul" value={job.module_type} mono />
        <Vital label="Adim" value={job.current_step_key ?? "\u2014"} mono />
        <Vital label="Gecti" value={fmtSeconds(job.elapsed_total_seconds ?? job.elapsed_seconds)} />
        <Vital label="ETA" value={fmtSeconds(job.estimated_remaining_seconds ?? job.eta_seconds)} />
        <Vital
          label="Retry"
          value={String(job.retry_count ?? 0)}
          warn={(job.retry_count ?? 0) > 0}
        />
      </div>

      {/* ---- 2-column ops grid ------------------------------------------ */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" }}
      >
        {/* Left: timeline (primary focus) ------------------------------- */}
        <section
          className="border border-border-subtle rounded-md bg-surface-page p-3"
          data-testid="bridge-cockpit-timeline"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-2">
            Adim Hattisi
          </div>
          <JobTimelinePanel steps={job.steps} />
        </section>

        {/* Right: actions + system panels ------------------------------- */}
        <div className="flex flex-col gap-3">
          <section
            className="border border-border-subtle rounded-md bg-surface-page p-3"
            data-testid="bridge-cockpit-actions"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-2">
              Aksiyonlar
            </div>
            <JobActionsPanel job={job} />
          </section>

          {/* Publish linkage (review gate preserved) ------------------- */}
          <section
            className="border border-border-subtle rounded-md bg-surface-page p-3"
            data-testid="bridge-cockpit-publish"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-2">
              Yayin Baglantisi
            </div>
            {publish ? (
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${publishStatusTint(
                    publish.status,
                  )}`}
                  data-testid="bridge-cockpit-publish-status"
                >
                  {publish.status}
                </span>
                <span className="text-xs text-neutral-600 capitalize">{publish.platform}</span>
                <button
                  onClick={() => navigate(`/admin/publish/${publish.id}`)}
                  className="ml-auto text-[10px] px-2 py-0.5 rounded border border-brand-400 bg-brand-50 text-brand-700 hover:bg-brand-100 cursor-pointer"
                  data-testid="bridge-cockpit-publish-open"
                >
                  Detay &rarr;
                </button>
              </div>
            ) : job.status === "completed" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Yayin kaydi yok.</span>
                <button
                  disabled={createPublishMutation.isPending}
                  onClick={async () => {
                    try {
                      const record = await createPublishMutation.mutateAsync({
                        jobId: job.id,
                        body: {
                          platform: "youtube",
                          content_ref_type: job.module_type,
                        },
                      });
                      toast.success("Yayin kaydi olusturuldu.");
                      navigate(`/admin/publish/${record.id}`);
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : "Islem basarisiz.");
                    }
                  }}
                  className="ml-auto text-[10px] px-2 py-0.5 rounded border border-brand-400 bg-brand-50 text-brand-700 hover:bg-brand-100 cursor-pointer disabled:opacity-50"
                  data-testid="bridge-cockpit-publish-create"
                >
                  Yayina Hazirla
                </button>
              </div>
            ) : (
              <p className="m-0 text-xs text-neutral-500">
                Job tamamlandiginda yayin kaydi olusturulabilir.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* ---- System panels (logs, artifacts, provider trace) ---------- */}
      <section
        className="border border-border-subtle rounded-md bg-surface-page p-3"
        data-testid="bridge-cockpit-system"
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-2">
          Sistem
        </div>
        <JobSystemPanels steps={job.steps} jobId={job.id} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vital cell — small, dense stat for the top strip
// ---------------------------------------------------------------------------

function Vital({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 border border-border-subtle rounded-md bg-surface-page">
      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums truncate ${mono ? "font-mono" : ""} ${
          warn ? "text-warning-dark" : "text-neutral-900"
        }`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
