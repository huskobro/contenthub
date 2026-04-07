/**
 * Job Operational Actions Panel — M16.
 *
 * Gerçek aksiyonlar: Cancel, Retry, Skip Step.
 * Butonlar job durumuna göre enabled/disabled.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { JobResponse, AllowedActions } from "../../api/jobsApi";
import { fetchAllowedActions, cancelJob, retryJob, cloneJob, skipStep } from "../../api/jobsApi";
import { cn } from "../../lib/cn";

interface JobActionsPanelProps {
  job: JobResponse;
}

export function JobActionsPanel({ job }: JobActionsPanelProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: actions } = useQuery<AllowedActions>({
    queryKey: ["job-actions", job.id, job.status],
    queryFn: () => fetchAllowedActions(job.id),
    staleTime: 5_000,
  });

  const canCancel = actions?.can_cancel ?? false;
  const canRetry = actions?.can_retry ?? false;
  const canClone = actions?.can_clone ?? false;
  const skippableSteps = actions?.skippable_steps ?? [];

  const handleAction = async (actionName: string, fn: () => Promise<unknown>) => {
    setLoading(actionName);
    setError(null);
    setSuccess(null);
    try {
      await fn();
      setSuccess(`${actionName} basarili`);
      // Invalidate job queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["job-detail"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-actions"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(null);
    }
  };

  const btnBase = "px-3 py-1.5 text-base font-semibold rounded-sm border cursor-pointer transition-all duration-fast";
  const btnDanger = cn(btnBase, "bg-error-light text-error-text border-error-light");
  const btnPrimary = cn(btnBase, "bg-info-light text-brand-700 border-info-light");
  const btnSecondary = cn(btnBase, "bg-neutral-100 text-neutral-700 border-border-subtle");
  const disabledCls = "opacity-50 cursor-not-allowed";

  return (
    <div
      className="border border-border-subtle rounded-md bg-neutral-50 px-4 py-3 mb-4"
      data-testid="job-actions-panel"
    >
      <h4 className="m-0 mb-2 text-lg text-neutral-900">
        Operasyonel Aksiyonlar
      </h4>

      <div className="flex gap-2 flex-wrap items-center">
        {/* Cancel */}
        <button
          className={cn(btnDanger, (!canCancel || !!loading) && disabledCls)}
          disabled={!canCancel || !!loading}
          onClick={() => handleAction("Cancel", () => cancelJob(job.id))}
          data-testid="action-cancel"
        >
          {loading === "Cancel" ? "Iptal ediliyor..." : "Iptal Et"}
        </button>

        {/* Retry */}
        <button
          className={cn(btnPrimary, (!canRetry || !!loading) && disabledCls)}
          disabled={!canRetry || !!loading}
          onClick={() => handleAction("Retry", () => retryJob(job.id))}
          data-testid="action-retry"
        >
          {loading === "Retry" ? "Yeniden deneniyor..." : "Yeniden Dene"}
        </button>

        {/* Clone */}
        <button
          className={cn(btnSecondary, (!canClone || !!loading) && disabledCls)}
          disabled={!canClone || !!loading}
          onClick={async () => {
            setLoading("Clone");
            setError(null);
            setSuccess(null);
            try {
              const newJob = await cloneJob(job.id);
              queryClient.invalidateQueries({ queryKey: ["jobs"] });
              navigate(`/admin/jobs/${newJob.id}`);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Klonlama hatasi");
            } finally {
              setLoading(null);
            }
          }}
          data-testid="action-clone"
        >
          {loading === "Clone" ? "Klonlaniyor..." : "Klonla"}
        </button>

        {/* Skip Steps */}
        {skippableSteps.map((stepKey) => (
          <button
            key={stepKey}
            className={cn(btnSecondary, !!loading && disabledCls)}
            disabled={!!loading}
            onClick={() => handleAction(`Skip:${stepKey}`, () => skipStep(job.id, stepKey))}
            data-testid={`action-skip-${stepKey}`}
          >
            {loading === `Skip:${stepKey}` ? "Atlaniyor..." : `Atla: ${stepKey}`}
          </button>
        ))}
      </div>

      {/* Durum mesajlari */}
      {error && (
        <p className="mt-2 mb-0 text-base text-error" data-testid="action-error">
          Hata: {error}
        </p>
      )}
      {success && (
        <p className="mt-2 mb-0 text-base text-success-text" data-testid="action-success">
          {success}
        </p>
      )}

      {/* Durum bilgisi */}
      <p className="mt-2 mb-0 text-xs text-neutral-500">
        Mevcut durum: <strong>{job.status}</strong>
        {!canCancel && !canRetry && !canClone && skippableSteps.length === 0 && (
          <span> — bu durumda kullanilabilir aksiyon yok</span>
        )}
      </p>
    </div>
  );
}
