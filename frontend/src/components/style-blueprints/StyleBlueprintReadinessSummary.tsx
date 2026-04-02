import {
  StyleBlueprintReadinessBadge,
  StyleBlueprintReadinessLevel,
} from "./StyleBlueprintReadinessBadge";

interface Props {
  status?: string | null;
  visualRulesJson?: string | null;
  motionRulesJson?: string | null;
  layoutRulesJson?: string | null;
  subtitleRulesJson?: string | null;
  thumbnailRulesJson?: string | null;
  previewStrategyJson?: string | null;
}

export function computeStyleBlueprintReadiness(
  status: string | null | undefined,
  visualRulesJson: string | null | undefined,
  motionRulesJson: string | null | undefined,
  layoutRulesJson: string | null | undefined,
  subtitleRulesJson: string | null | undefined,
  thumbnailRulesJson: string | null | undefined,
  previewStrategyJson: string | null | undefined,
): StyleBlueprintReadinessLevel {
  const fields = [
    visualRulesJson,
    motionRulesJson,
    layoutRulesJson,
    subtitleRulesJson,
    thumbnailRulesJson,
    previewStrategyJson,
  ];

  const filledCount = fields.filter((f) => f != null && f.trim() !== "").length;

  if (filledCount === 0) return "Başlangıç";
  if (filledCount === 1) return "Taslak";

  // 2+ fields filled
  if (filledCount >= 3 && status === "active") return "Hazır";
  return "Kısmen hazır";
}

export function StyleBlueprintReadinessSummary({
  status,
  visualRulesJson,
  motionRulesJson,
  layoutRulesJson,
  subtitleRulesJson,
  thumbnailRulesJson,
  previewStrategyJson,
}: Props) {
  const level = computeStyleBlueprintReadiness(
    status,
    visualRulesJson,
    motionRulesJson,
    layoutRulesJson,
    subtitleRulesJson,
    thumbnailRulesJson,
    previewStrategyJson,
  );

  const fields = [
    visualRulesJson,
    motionRulesJson,
    layoutRulesJson,
    subtitleRulesJson,
    thumbnailRulesJson,
    previewStrategyJson,
  ];
  const filledCount = fields.filter((f) => f != null && f.trim() !== "").length;
  const detail = `${filledCount}/6 alan dolu`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <StyleBlueprintReadinessBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{detail}</span>
    </div>
  );
}
