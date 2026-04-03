import { JobActionabilityBadge, JobActionabilityLevel } from "./JobActionabilityBadge";
import { formatDuration } from "../../lib/formatDuration";

const RUNNING_STATUSES = new Set(["running", "processing", "in_progress"]);
const COMPLETED_STATUSES = new Set(["completed", "done", "finished"]);

interface Props {
  status?: string | null;
  lastError?: string | null;
  retryCount?: number | null;
  currentStepKey?: string | null;
  estimatedRemainingSeconds?: number | null;
}

export function computeJobActionability(
  status: string | null | undefined,
  lastError: string | null | undefined,
): JobActionabilityLevel {
  if (!status) return "Belirsiz";
  if (lastError || status === "failed") return "Dikkat gerekli";
  if (status === "queued") return "Bekliyor";
  if (RUNNING_STATUSES.has(status)) return "Çalışıyor";
  if (COMPLETED_STATUSES.has(status)) return "Tamamlandı";
  return "Belirsiz";
}

export function JobActionabilitySummary({
  status,
  lastError,
  retryCount,
  currentStepKey,
  estimatedRemainingSeconds,
}: Props) {
  const level = computeJobActionability(status, lastError);

  const parts: string[] = [];
  if (currentStepKey) parts.push(currentStepKey);
  if (retryCount != null && !isNaN(retryCount) && isFinite(retryCount) && retryCount > 0) parts.push(`${retryCount}x retry`);
  if (estimatedRemainingSeconds != null && estimatedRemainingSeconds > 0) {
    parts.push(`ETA: ${formatDuration(estimatedRemainingSeconds)}`);
  }
  const detail = parts.length > 0 ? parts.join(" • ") : "detay yok";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <JobActionabilityBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{detail}</span>
    </div>
  );
}
