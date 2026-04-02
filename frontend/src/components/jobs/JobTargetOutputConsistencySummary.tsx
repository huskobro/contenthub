import { JobTargetOutputConsistencyBadge } from "./JobTargetOutputConsistencyBadge";

type ConsistencyLevel = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

const ACTIVE_STATUSES = new Set([
  "running", "processing", "in_progress", "completed", "done", "finished",
]);

function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasMeaningfulContext(json: string | null | undefined): boolean {
  if (!isNonEmpty(json)) return false;
  try {
    const parsed = JSON.parse(json!);
    return typeof parsed === "object" && parsed !== null && Object.keys(parsed).length > 0;
  } catch {
    // non-parseable but non-empty → treat as present
    return true;
  }
}

export function computeJobTargetOutputConsistency(
  sourceContextJson: string | null | undefined,
  templateId: string | null | undefined,
  workspacePath: string | null | undefined,
  status: string | null | undefined,
  currentStepKey: string | null | undefined,
  lastError: string | null | undefined
): ConsistencyLevel {
  const hasTarget =
    hasMeaningfulContext(sourceContextJson) ||
    isNonEmpty(templateId) ||
    isNonEmpty(workspacePath);

  const hasOutput =
    ACTIVE_STATUSES.has((status ?? "").toLowerCase().trim()) ||
    isNonEmpty(currentStepKey) ||
    isNonEmpty(lastError);

  if (!hasTarget && !hasOutput) return "Artifacts yok";
  if (hasTarget && !hasOutput) return "Tek taraflı";
  if (!hasTarget && hasOutput) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  sourceContextJson: string | null | undefined;
  templateId: string | null | undefined;
  workspacePath: string | null | undefined;
  status: string | null | undefined;
  currentStepKey: string | null | undefined;
  lastError: string | null | undefined;
}

export function JobTargetOutputConsistencySummary({
  sourceContextJson,
  templateId,
  workspacePath,
  status,
  currentStepKey,
  lastError,
}: Props) {
  const level = computeJobTargetOutputConsistency(
    sourceContextJson,
    templateId,
    workspacePath,
    status,
    currentStepKey,
    lastError
  );
  return <JobTargetOutputConsistencyBadge level={level} />;
}
