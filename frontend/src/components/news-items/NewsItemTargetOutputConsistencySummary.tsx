import { NewsItemTargetOutputConsistencyBadge } from "./NewsItemTargetOutputConsistencyBadge";

type Level = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return value.trim().length > 0;
}

export function computeNewsItemTargetOutputConsistency(
  title: string | null | undefined,
  url: string | null | undefined,
  summary: string | null | undefined,
  usedNewsLinkCount: number | null | undefined,
  hasPublishedUsedNewsLink: boolean | null | undefined,
  hasScheduledUsedNewsLink: boolean | null | undefined,
): Level {
  const hasInput = isNonEmpty(title) || isNonEmpty(url) || isNonEmpty(summary);

  const hasOutput =
    (usedNewsLinkCount ?? 0) > 0 ||
    hasPublishedUsedNewsLink === true ||
    hasScheduledUsedNewsLink === true;

  if (!hasInput && !hasOutput) return "Artifacts yok";
  if (hasInput && !hasOutput) return "Tek taraflı";
  if (!hasInput && hasOutput) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  title: string | null | undefined;
  url: string | null | undefined;
  summary: string | null | undefined;
  usedNewsLinkCount: number | null | undefined;
  hasPublishedUsedNewsLink: boolean | null | undefined;
  hasScheduledUsedNewsLink: boolean | null | undefined;
}

export function NewsItemTargetOutputConsistencySummary({
  title,
  url,
  summary,
  usedNewsLinkCount,
  hasPublishedUsedNewsLink,
  hasScheduledUsedNewsLink,
}: Props) {
  const level = computeNewsItemTargetOutputConsistency(
    title,
    url,
    summary,
    usedNewsLinkCount,
    hasPublishedUsedNewsLink,
    hasScheduledUsedNewsLink,
  );
  return <NewsItemTargetOutputConsistencyBadge level={level} />;
}
