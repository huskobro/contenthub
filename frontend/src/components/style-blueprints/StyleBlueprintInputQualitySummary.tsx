import { StyleBlueprintInputQualityBadge } from "./StyleBlueprintInputQualityBadge";

export type StyleBlueprintInputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeStyleBlueprintInputQuality(
  visualRulesJson: string | null | undefined,
  motionRulesJson: string | null | undefined,
  layoutRulesJson: string | null | undefined,
  subtitleRulesJson: string | null | undefined,
  thumbnailRulesJson: string | null | undefined,
  previewStrategyJson: string | null | undefined
): StyleBlueprintInputQualityLevel {
  const fields = [
    visualRulesJson,
    motionRulesJson,
    layoutRulesJson,
    subtitleRulesJson,
    thumbnailRulesJson,
    previewStrategyJson,
  ];

  const filledCount = fields.filter(isNonEmpty).length;

  if (filledCount === 0) return "Zayıf giriş";
  if (filledCount === 1) return "Kısmi giriş";
  return "Güçlü giriş";
}

interface Props {
  visualRulesJson: string | null | undefined;
  motionRulesJson: string | null | undefined;
  layoutRulesJson: string | null | undefined;
  subtitleRulesJson: string | null | undefined;
  thumbnailRulesJson: string | null | undefined;
  previewStrategyJson: string | null | undefined;
}

export function StyleBlueprintInputQualitySummary({
  visualRulesJson,
  motionRulesJson,
  layoutRulesJson,
  subtitleRulesJson,
  thumbnailRulesJson,
  previewStrategyJson,
}: Props) {
  const level = computeStyleBlueprintInputQuality(
    visualRulesJson,
    motionRulesJson,
    layoutRulesJson,
    subtitleRulesJson,
    thumbnailRulesJson,
    previewStrategyJson
  );
  return <StyleBlueprintInputQualityBadge level={level} />;
}
