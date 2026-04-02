import { StandardVideoArtifactConsistencyBadge, type ArtifactConsistencyLevel } from "./StandardVideoArtifactConsistencyBadge";

export function computeStandardVideoArtifactConsistency(
  hasScript: boolean | null | undefined,
  hasMetadata: boolean | null | undefined,
): ArtifactConsistencyLevel {
  const script = hasScript === true;
  const meta = hasMetadata === true;

  if (!script && !meta) return "Artifacts yok";
  if (script && !meta) return "Tek taraflı";
  if (!script && meta) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  hasScript: boolean | null | undefined;
  hasMetadata: boolean | null | undefined;
}

export function StandardVideoArtifactConsistencySummary({ hasScript, hasMetadata }: Props) {
  const level = computeStandardVideoArtifactConsistency(hasScript, hasMetadata);
  return <StandardVideoArtifactConsistencyBadge level={level} />;
}
