import { StyleBlueprintArtifactConsistencyBadge, type ArtifactConsistencyLevel } from "./StyleBlueprintArtifactConsistencyBadge";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeStyleBlueprintArtifactConsistency(
  visualRulesJson: string | null | undefined,
  motionRulesJson: string | null | undefined,
  layoutRulesJson: string | null | undefined,
  subtitleRulesJson: string | null | undefined,
  thumbnailRulesJson: string | null | undefined,
  previewStrategyJson: string | null | undefined,
): ArtifactConsistencyLevel {
  const hasRules =
    isNonEmpty(visualRulesJson) ||
    isNonEmpty(motionRulesJson) ||
    isNonEmpty(layoutRulesJson) ||
    isNonEmpty(subtitleRulesJson) ||
    isNonEmpty(thumbnailRulesJson);

  const hasPreview = isNonEmpty(previewStrategyJson);

  if (!hasRules && !hasPreview) return "Artifacts yok";
  if (hasRules && !hasPreview) return "Tek taraflı";
  if (!hasRules && hasPreview) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  visualRulesJson: string | null | undefined;
  motionRulesJson: string | null | undefined;
  layoutRulesJson: string | null | undefined;
  subtitleRulesJson: string | null | undefined;
  thumbnailRulesJson: string | null | undefined;
  previewStrategyJson: string | null | undefined;
}

export function StyleBlueprintArtifactConsistencySummary({
  visualRulesJson,
  motionRulesJson,
  layoutRulesJson,
  subtitleRulesJson,
  thumbnailRulesJson,
  previewStrategyJson,
}: Props) {
  const level = computeStyleBlueprintArtifactConsistency(
    visualRulesJson,
    motionRulesJson,
    layoutRulesJson,
    subtitleRulesJson,
    thumbnailRulesJson,
    previewStrategyJson,
  );
  return <StyleBlueprintArtifactConsistencyBadge level={level} />;
}
