import { StyleBlueprintPublicationOutcomeBadge } from "./StyleBlueprintPublicationOutcomeBadge";

type Level = "Hazırlanıyor" | "Ham çıktı" | "Aday çıktı" | "Yayına yakın çıktı";

function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return value.trim().length > 0;
}

export function computeStyleBlueprintPublicationOutcome(
  visualRulesJson: string | null | undefined,
  motionRulesJson: string | null | undefined,
  layoutRulesJson: string | null | undefined,
  subtitleRulesJson: string | null | undefined,
  thumbnailRulesJson: string | null | undefined,
  previewStrategyJson: string | null | undefined,
  status: string | null | undefined,
): Level {
  const hasRules =
    isNonEmpty(visualRulesJson) ||
    isNonEmpty(motionRulesJson) ||
    isNonEmpty(layoutRulesJson) ||
    isNonEmpty(subtitleRulesJson) ||
    isNonEmpty(thumbnailRulesJson);

  const hasPreview = isNonEmpty(previewStrategyJson);

  if (!hasRules && !hasPreview) return "Hazırlanıyor";
  if (hasRules && !hasPreview) return "Ham çıktı";

  // hasRules && hasPreview (or edge: !hasRules && hasPreview treated as Ham)
  if (!hasRules) return "Ham çıktı";

  const isActive = status === "active";
  if (!isActive) return "Aday çıktı";

  return "Yayına yakın çıktı";
}

interface Props {
  visualRulesJson: string | null | undefined;
  motionRulesJson: string | null | undefined;
  layoutRulesJson: string | null | undefined;
  subtitleRulesJson: string | null | undefined;
  thumbnailRulesJson: string | null | undefined;
  previewStrategyJson: string | null | undefined;
  status: string | null | undefined;
}

export function StyleBlueprintPublicationOutcomeSummary({
  visualRulesJson,
  motionRulesJson,
  layoutRulesJson,
  subtitleRulesJson,
  thumbnailRulesJson,
  previewStrategyJson,
  status,
}: Props) {
  const level = computeStyleBlueprintPublicationOutcome(
    visualRulesJson,
    motionRulesJson,
    layoutRulesJson,
    subtitleRulesJson,
    thumbnailRulesJson,
    previewStrategyJson,
    status,
  );
  return <StyleBlueprintPublicationOutcomeBadge level={level} />;
}
