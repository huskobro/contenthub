import { JobOutputRichnessBadge } from "./JobOutputRichnessBadge";
import type { JobOutputRichnessLevel } from "./JobOutputRichnessBadge";

function isNonEmpty(val: string | null | undefined): boolean {
  return typeof val === "string" && val.trim().length > 0;
}

function hasContextContent(sourceContextJson: string | null | undefined): boolean {
  if (!isNonEmpty(sourceContextJson)) return false;
  try {
    const parsed = JSON.parse(sourceContextJson!);
    if (typeof parsed !== "object" || parsed === null) return false;
    return Object.keys(parsed).some((k) => {
      const lower = k.toLowerCase();
      return lower.includes("title") || lower.includes("topic") || lower.includes("name") || lower.includes("id");
    });
  } catch {
    return false;
  }
}

export function computeJobOutputRichness(
  lastError: string | null | undefined,
  sourceContextJson: string | null | undefined,
  templateId: string | null | undefined,
  workspacePath: string | null | undefined
): JobOutputRichnessLevel {
  if (isNonEmpty(lastError)) return "Sorunlu";

  const hasContext = hasContextContent(sourceContextJson);
  const hasRef = isNonEmpty(templateId) || isNonEmpty(workspacePath);

  if (!hasContext && !hasRef) return "Zayıf bağlam";
  if (hasContext && hasRef) return "Zengin bağlam";
  return "Kısmi bağlam";
}

interface Props {
  lastError: string | null | undefined;
  sourceContextJson: string | null | undefined;
  templateId: string | null | undefined;
  workspacePath: string | null | undefined;
}

export function JobOutputRichnessSummary({ lastError, sourceContextJson, templateId, workspacePath }: Props) {
  const level = computeJobOutputRichness(lastError, sourceContextJson, templateId, workspacePath);
  return <JobOutputRichnessBadge level={level} />;
}
