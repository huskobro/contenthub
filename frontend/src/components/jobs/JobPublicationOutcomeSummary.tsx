import { JobPublicationOutcomeBadge } from "./JobPublicationOutcomeBadge";

type Level = "Sorunlu" | "Hazırlanıyor" | "Taslak çıktı" | "Yayına yakın çıktı" | "Belirsiz";

const ACTIVE_STATUSES = new Set(["queued", "running", "processing", "in_progress", "active"]);
const DONE_STATUSES = new Set(["completed", "done", "finished", "success"]);

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function hasContextContent(json: string | null | undefined): boolean {
  if (!isNonEmpty(json)) return false;
  try {
    const obj = JSON.parse(json as string);
    if (typeof obj !== "object" || obj === null) return false;
    return ["title", "topic", "name", "id"].some(
      (k) => typeof obj[k] === "string" && obj[k].trim().length > 0
    );
  } catch {
    return false;
  }
}

export function computeJobPublicationOutcome(
  status: string | null | undefined,
  lastError: string | null | undefined,
  sourceContextJson: string | null | undefined,
  templateId: string | null | undefined,
  workspacePath: string | null | undefined,
): Level {
  if (!isNonEmpty(status)) return "Belirsiz";

  const s = (status as string).toLowerCase();

  if (s === "failed" || isNonEmpty(lastError)) return "Sorunlu";
  if (ACTIVE_STATUSES.has(s)) return "Hazırlanıyor";

  if (DONE_STATUSES.has(s)) {
    const hasContext = hasContextContent(sourceContextJson);
    const hasRef = isNonEmpty(templateId) || isNonEmpty(workspacePath);
    if (hasContext && hasRef) return "Yayına yakın çıktı";
    return "Taslak çıktı";
  }

  return "Belirsiz";
}

interface Props {
  status: string | null | undefined;
  lastError: string | null | undefined;
  sourceContextJson: string | null | undefined;
  templateId: string | null | undefined;
  workspacePath: string | null | undefined;
}

export function JobPublicationOutcomeSummary({
  status,
  lastError,
  sourceContextJson,
  templateId,
  workspacePath,
}: Props) {
  const level = computeJobPublicationOutcome(status, lastError, sourceContextJson, templateId, workspacePath);
  return <JobPublicationOutcomeBadge level={level} />;
}
