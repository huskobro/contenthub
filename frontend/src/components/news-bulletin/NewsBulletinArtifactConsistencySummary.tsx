import { NewsBulletinArtifactConsistencyBadge, type ArtifactConsistencyLevel } from "./NewsBulletinArtifactConsistencyBadge";

export function computeNewsBulletinArtifactConsistency(
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

export function NewsBulletinArtifactConsistencySummary({ hasScript, hasMetadata }: Props) {
  const level = computeNewsBulletinArtifactConsistency(hasScript, hasMetadata);
  return <NewsBulletinArtifactConsistencyBadge level={level} />;
}
