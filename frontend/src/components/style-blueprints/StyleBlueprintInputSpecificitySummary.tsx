import { StyleBlueprintInputSpecificityBadge } from "./StyleBlueprintInputSpecificityBadge";

type Level = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

function isFilledField(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeStyleBlueprintInputSpecificity(
  visualRulesJson: string | null | undefined,
  motionRulesJson: string | null | undefined,
  layoutRulesJson: string | null | undefined,
  subtitleRulesJson: string | null | undefined,
  thumbnailRulesJson: string | null | undefined,
  previewStrategyJson: string | null | undefined,
): Level {
  const filledCount = [
    visualRulesJson,
    motionRulesJson,
    layoutRulesJson,
    subtitleRulesJson,
    thumbnailRulesJson,
    previewStrategyJson,
  ].filter(isFilledField).length;

  if (filledCount === 0) return "Genel giriş";
  if (filledCount === 1) return "Kısmi özgüllük";
  return "Belirgin giriş";
}

interface Props {
  visualRulesJson: string | null | undefined;
  motionRulesJson: string | null | undefined;
  layoutRulesJson: string | null | undefined;
  subtitleRulesJson: string | null | undefined;
  thumbnailRulesJson: string | null | undefined;
  previewStrategyJson: string | null | undefined;
}

export function StyleBlueprintInputSpecificitySummary({
  visualRulesJson,
  motionRulesJson,
  layoutRulesJson,
  subtitleRulesJson,
  thumbnailRulesJson,
  previewStrategyJson,
}: Props) {
  const level = computeStyleBlueprintInputSpecificity(
    visualRulesJson,
    motionRulesJson,
    layoutRulesJson,
    subtitleRulesJson,
    thumbnailRulesJson,
    previewStrategyJson,
  );
  return <StyleBlueprintInputSpecificityBadge level={level} />;
}
