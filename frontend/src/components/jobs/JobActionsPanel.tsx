/**
 * Job Operational Actions Panel — M16.
 *
 * Gerçek aksiyonlar: Cancel, Retry, Skip Step.
 * Butonlar job durumuna göre enabled/disabled.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { JobResponse, AllowedActions } from "../../api/jobsApi";
import { fetchAllowedActions, cancelJob, retryJob, skipStep } from "../../api/jobsApi";
import { colors, radius, typography } from "../design-system/tokens";

interface JobActionsPanelProps {
  job: JobResponse;
}

const BTN: React.CSSProperties = {
  padding: "0.4rem 0.85rem",
  fontSize: typography.size.base,
  fontWeight: 600,
  borderRadius: radius.sm,
  border: `1px solid ${colors.border.subtle}`,
  cursor: "pointer",
  transition: "all 0.15s",
};

const BTN_DANGER: React.CSSProperties = {
  ...BTN,
  background: colors.error.light,
  color: colors.error.text,
  borderColor: colors.error.light,
};

const BTN_PRIMARY: React.CSSProperties = {
  ...BTN,
  background: colors.info.light,
  color: colors.brand[700],
  borderColor: colors.info.light,
};

const BTN_SECONDARY: React.CSSProperties = {
  ...BTN,
  background: colors.neutral[100],
  color: colors.neutral[700],
  borderColor: colors.border.subtle,
};

const DISABLED: React.CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

export function JobActionsPanel({ job }: JobActionsPanelProps) {
  const queryClient = useQueryClient();
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

  return (
    <div
      style={{
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.md,
        background: colors.neutral[50],
        padding: "0.75rem 1rem",
        marginBottom: "1rem",
      }}
      data-testid="job-actions-panel"
    >
      <h4 style={{ margin: "0 0 0.5rem", fontSize: typography.size.lg, color: colors.neutral[900] }}>
        Operasyonel Aksiyonlar
      </h4>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* Cancel */}
        <button
          style={canCancel && !loading ? BTN_DANGER : { ...BTN_DANGER, ...DISABLED }}
          disabled={!canCancel || !!loading}
          onClick={() => handleAction("Cancel", () => cancelJob(job.id))}
          data-testid="action-cancel"
        >
          {loading === "Cancel" ? "Iptal ediliyor..." : "Iptal Et"}
        </button>

        {/* Retry */}
        <button
          style={canRetry && !loading ? BTN_PRIMARY : { ...BTN_PRIMARY, ...DISABLED }}
          disabled={!canRetry || !!loading}
          onClick={() => handleAction("Retry", () => retryJob(job.id))}
          data-testid="action-retry"
        >
          {loading === "Retry" ? "Yeniden deneniyor..." : "Yeniden Dene"}
        </button>

        {/* Skip Steps */}
        {skippableSteps.map((stepKey) => (
          <button
            key={stepKey}
            style={!loading ? BTN_SECONDARY : { ...BTN_SECONDARY, ...DISABLED }}
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
        <p style={{ margin: "0.5rem 0 0", fontSize: typography.size.base, color: colors.error.base }} data-testid="action-error">
          Hata: {error}
        </p>
      )}
      {success && (
        <p style={{ margin: "0.5rem 0 0", fontSize: typography.size.base, color: colors.success.text }} data-testid="action-success">
          {success}
        </p>
      )}

      {/* Durum bilgisi */}
      <p style={{ margin: "0.5rem 0 0", fontSize: typography.size.xs, color: colors.neutral[500] }}>
        Mevcut durum: <strong>{job.status}</strong>
        {!canCancel && !canRetry && skippableSteps.length === 0 && (
          <span> — bu durumda kullanilabilir aksiyon yok</span>
        )}
      </p>
    </div>
  );
}
