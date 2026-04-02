import { NewsBulletinTargetOutputConsistencyBadge } from "./NewsBulletinTargetOutputConsistencyBadge";

type Level = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return value.trim().length > 0;
}

export function computeNewsBulletinTargetOutputConsistency(
  title: string | null | undefined,
  topic: string | null | undefined,
  selectedNewsCount: number | null | undefined,
  language: string | null | undefined,
  bulletinStyle: string | null | undefined,
  hasScript: boolean | null | undefined,
  hasMetadata: boolean | null | undefined,
): Level {
  const hasInput =
    isNonEmpty(title) ||
    isNonEmpty(topic) ||
    (selectedNewsCount ?? 0) > 0 ||
    isNonEmpty(language) ||
    isNonEmpty(bulletinStyle);

  const hasOutput = hasScript === true || hasMetadata === true;

  if (!hasInput && !hasOutput) return "Artifacts yok";
  if (hasInput && !hasOutput) return "Tek taraflı";
  if (!hasInput && hasOutput) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  title: string | null | undefined;
  topic: string | null | undefined;
  selectedNewsCount: number | null | undefined;
  language: string | null | undefined;
  bulletinStyle: string | null | undefined;
  hasScript: boolean | null | undefined;
  hasMetadata: boolean | null | undefined;
}

export function NewsBulletinTargetOutputConsistencySummary({
  title,
  topic,
  selectedNewsCount,
  language,
  bulletinStyle,
  hasScript,
  hasMetadata,
}: Props) {
  const level = computeNewsBulletinTargetOutputConsistency(
    title,
    topic,
    selectedNewsCount,
    language,
    bulletinStyle,
    hasScript,
    hasMetadata,
  );
  return <NewsBulletinTargetOutputConsistencyBadge level={level} />;
}
