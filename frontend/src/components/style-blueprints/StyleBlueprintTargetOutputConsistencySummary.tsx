import { StyleBlueprintTargetOutputConsistencyBadge } from "./StyleBlueprintTargetOutputConsistencyBadge";

type Level = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return value.trim().length > 0;
}

export function computeStyleBlueprintTargetOutputConsistency(
  visualRulesJson: string | null | undefined,
  motionRulesJson: string | null | undefined,
  layoutRulesJson: string | null | undefined,
  subtitleRulesJson: string | null | undefined,
  thumbnailRulesJson: string | null | undefined,
  previewStrategyJson: string | null | undefined,
): Level {
  const hasInput =
    isNonEmpty(visualRulesJson) ||
    isNonEmpty(motionRulesJson) ||
    isNonEmpty(layoutRulesJson) ||
    isNonEmpty(subtitleRulesJson) ||
    isNonEmpty(thumbnailRulesJson);

  const hasOutput = isNonEmpty(previewStrategyJson);

  if (!hasInput && !hasOutput) return "Artifacts yok";
  if (hasInput && !hasOutput) return "Tek taraflı";
  if (!hasInput && hasOutput) return "Tutarsız";
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

export function StyleBlueprintTargetOutputConsistencySummary({
  visualRulesJson,
  motionRulesJson,
  layoutRulesJson,
  subtitleRulesJson,
  thumbnailRulesJson,
  previewStrategyJson,
}: Props) {
  const level = computeStyleBlueprintTargetOutputConsistency(
    visualRulesJson,
    motionRulesJson,
    layoutRulesJson,
    subtitleRulesJson,
    thumbnailRulesJson,
    previewStrategyJson,
  );
  return <StyleBlueprintTargetOutputConsistencyBadge level={level} />;
}
