import { JobPublicationYieldBadge } from "./JobPublicationYieldBadge";

type YieldLevel =
  | "Sorunlu"
  | "Hazırlanıyor"
  | "Ham çıktı"
  | "Aday çıktı"
  | "Yayına yakın çıktı"
  | "Belirsiz";

const PREP_STATUSES = new Set(["queued", "running", "processing", "in_progress"]);
const DONE_STATUSES = new Set(["completed", "done", "finished"]);

function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasMeaningfulContext(json: string | null | undefined): boolean {
  if (!isNonEmpty(json)) return false;
  try {
    const parsed = JSON.parse(json!);
    return typeof parsed === "object" && parsed !== null && Object.keys(parsed).length > 0;
  } catch {
    // non-parseable but non-empty → treat as meaningful (Ham çıktı threshold)
    return true;
  }
}

export function computeJobPublicationYield(
  status: string | null | undefined,
  sourceContextJson: string | null | undefined,
  templateId: string | null | undefined,
  workspacePath: string | null | undefined,
  currentStepKey: string | null | undefined,
  lastError: string | null | undefined
): YieldLevel {
  const statusNorm = (status ?? "").toLowerCase().trim();
  const hasContext = hasMeaningfulContext(sourceContextJson);
  const hasStep = isNonEmpty(currentStepKey);
  const hasTemplate = isNonEmpty(templateId);
  const hasWorkspace = isNonEmpty(workspacePath);
  const hasError = isNonEmpty(lastError);

  // 1. Error wins
  if (hasError || statusNorm === "failed") return "Sorunlu";

  // 2. Done + context + strong reference → Yayına yakın çıktı
  if (DONE_STATUSES.has(statusNorm) && hasContext && (hasTemplate || hasWorkspace)) {
    return "Yayına yakın çıktı";
  }

  // 3. Done + context → Aday çıktı
  if (DONE_STATUSES.has(statusNorm) && hasContext) return "Aday çıktı";

  // 4. Context or step but no strong completion → Ham çıktı
  if (hasContext || hasStep) return "Ham çıktı";

  // 5. Active status, nothing useful yet → Hazırlanıyor
  if (PREP_STATUSES.has(statusNorm)) return "Hazırlanıyor";

  // 6. Done but no context
  if (DONE_STATUSES.has(statusNorm)) return "Belirsiz";

  return "Belirsiz";
}

interface Props {
  status: string | null | undefined;
  sourceContextJson: string | null | undefined;
  templateId: string | null | undefined;
  workspacePath: string | null | undefined;
  currentStepKey: string | null | undefined;
  lastError: string | null | undefined;
}

export function JobPublicationYieldSummary({
  status,
  sourceContextJson,
  templateId,
  workspacePath,
  currentStepKey,
  lastError,
}: Props) {
  const level = computeJobPublicationYield(
    status,
    sourceContextJson,
    templateId,
    workspacePath,
    currentStepKey,
    lastError
  );
  return <JobPublicationYieldBadge level={level} />;
}
