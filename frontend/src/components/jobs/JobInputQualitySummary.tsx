export type JobInputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function hasMeaningfulContext(raw: string | null | undefined): boolean {
  if (!isNonEmpty(raw)) return false;
  try {
    const parsed = JSON.parse(raw!);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.keys(parsed).length > 0;
    }
    if (Array.isArray(parsed)) return parsed.length > 0;
    return false;
  } catch {
    // Non-parseable but non-empty → treat as Kısmi
    return false;
  }
}

function hasPartialContext(raw: string | null | undefined): boolean {
  if (!isNonEmpty(raw)) return false;
  try {
    JSON.parse(raw!);
    return false; // parseable handled by hasMeaningfulContext
  } catch {
    return true; // non-parseable non-empty string
  }
}

export function computeJobInputQuality(
  sourceContextJson: string | null | undefined,
  templateId: string | null | undefined,
  workspacePath: string | null | undefined
): JobInputQualityLevel {
  const hasContext = hasMeaningfulContext(sourceContextJson);
  const hasPartial = hasPartialContext(sourceContextJson);
  const hasTemplate = isNonEmpty(templateId);
  const hasWorkspace = isNonEmpty(workspacePath);
  const hasExtra = hasTemplate || hasWorkspace;

  // All empty
  if (!hasContext && !hasPartial && !hasExtra) return "Zayıf giriş";

  // Meaningful context + extra ref
  if (hasContext && hasExtra) return "Güçlü giriş";

  // Everything else is partial: context without extra, extra without context, partial context
  return "Kısmi giriş";
}

interface Props {
  sourceContextJson: string | null | undefined;
  templateId: string | null | undefined;
  workspacePath: string | null | undefined;
}

export function JobInputQualitySummary({ sourceContextJson, templateId, workspacePath }: Props) {
  const level = computeJobInputQuality(sourceContextJson, templateId, workspacePath);
  return <JobInputQualityBadge level={level} />;
}

import { JobInputQualityBadge } from "./JobInputQualityBadge";
