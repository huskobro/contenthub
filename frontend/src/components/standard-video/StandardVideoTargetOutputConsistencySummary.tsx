import { StandardVideoTargetOutputConsistencyBadge } from "./StandardVideoTargetOutputConsistencyBadge";

type Level = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return value.trim().length > 0;
}

export function computeStandardVideoTargetOutputConsistency(
  topic: string | null | undefined,
  brief: string | null | undefined,
  targetDurationSeconds: number | null | undefined,
  language: string | null | undefined,
  hasScript: boolean | null | undefined,
  hasMetadata: boolean | null | undefined,
): Level {
  const hasInput =
    isNonEmpty(topic) ||
    isNonEmpty(brief) ||
    (typeof targetDurationSeconds === "number" && targetDurationSeconds > 0) ||
    isNonEmpty(language);

  const hasOutput = hasScript === true || hasMetadata === true;

  if (!hasInput && !hasOutput) return "Artifacts yok";
  if (hasInput && !hasOutput) return "Tek taraflı";
  if (!hasInput && hasOutput) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  topic: string | null | undefined;
  brief: string | null | undefined;
  targetDurationSeconds: number | null | undefined;
  language: string | null | undefined;
  hasScript: boolean | null | undefined;
  hasMetadata: boolean | null | undefined;
}

export function StandardVideoTargetOutputConsistencySummary({
  topic,
  brief,
  targetDurationSeconds,
  language,
  hasScript,
  hasMetadata,
}: Props) {
  const level = computeStandardVideoTargetOutputConsistency(
    topic,
    brief,
    targetDurationSeconds,
    language,
    hasScript,
    hasMetadata,
  );
  return <StandardVideoTargetOutputConsistencyBadge level={level} />;
}
