export type JobArtifactConsistencyLevel =
  | "Artifacts yok"
  | "Tek taraflı"
  | "Tutarsız"
  | "Dengeli";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

const ACTIVE_STATUSES = new Set([
  "running",
  "processing",
  "in_progress",
  "completed",
  "done",
  "finished",
]);

export function computeJobArtifactConsistency(
  sourceContextJson: string | null | undefined,
  templateId: string | null | undefined,
  workspacePath: string | null | undefined,
  status: string | null | undefined,
  currentStepKey: string | null | undefined
): JobArtifactConsistencyLevel {
  const hasContext =
    isNonEmpty(sourceContextJson) || isNonEmpty(templateId) || isNonEmpty(workspacePath);

  const hasOutputSignal =
    (typeof status === "string" && ACTIVE_STATUSES.has(status.toLowerCase())) ||
    isNonEmpty(currentStepKey);

  if (!hasContext && !hasOutputSignal) return "Artifacts yok";
  if (hasContext && !hasOutputSignal) return "Tek taraflı";
  if (!hasContext && hasOutputSignal) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  sourceContextJson: string | null | undefined;
  templateId: string | null | undefined;
  workspacePath: string | null | undefined;
  status: string | null | undefined;
  currentStepKey: string | null | undefined;
}

export function JobArtifactConsistencySummary({
  sourceContextJson,
  templateId,
  workspacePath,
  status,
  currentStepKey,
}: Props) {
  const level = computeJobArtifactConsistency(
    sourceContextJson,
    templateId,
    workspacePath,
    status,
    currentStepKey
  );
  return <JobArtifactConsistencyBadge level={level} />;
}

import { JobArtifactConsistencyBadge } from "./JobArtifactConsistencyBadge";
