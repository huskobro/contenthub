import { StyleBlueprintPublicationSignalBadge } from "./StyleBlueprintPublicationSignalBadge";
import type { StyleBlueprintPublicationSignalLevel } from "./StyleBlueprintPublicationSignalBadge";

function isNonEmpty(val: string | null | undefined): boolean {
  return typeof val === "string" && val.trim().length > 0;
}

export function computeStyleBlueprintPublicationSignal(
  status: string | null | undefined,
  visualRulesJson: string | null | undefined,
  motionRulesJson: string | null | undefined,
  layoutRulesJson: string | null | undefined,
  subtitleRulesJson: string | null | undefined,
  thumbnailRulesJson: string | null | undefined,
  previewStrategyJson: string | null | undefined
): StyleBlueprintPublicationSignalLevel {
  const filledCount = [
    visualRulesJson,
    motionRulesJson,
    layoutRulesJson,
    subtitleRulesJson,
    thumbnailRulesJson,
    previewStrategyJson,
  ].filter(isNonEmpty).length;

  const isActive = status === "active";

  if (filledCount === 0 && isActive) return "Kısmen hazır";
  if (filledCount === 0) return "Başlangıç";
  if (filledCount === 1) return "Taslak";
  if (filledCount >= 3 && isActive) return "Yayına yakın";
  return "Kısmen hazır";
}

interface Props {
  status: string | null | undefined;
  visualRulesJson: string | null | undefined;
  motionRulesJson: string | null | undefined;
  layoutRulesJson: string | null | undefined;
  subtitleRulesJson: string | null | undefined;
  thumbnailRulesJson: string | null | undefined;
  previewStrategyJson: string | null | undefined;
}

export function StyleBlueprintPublicationSignalSummary(props: Props) {
  const level = computeStyleBlueprintPublicationSignal(
    props.status,
    props.visualRulesJson,
    props.motionRulesJson,
    props.layoutRulesJson,
    props.subtitleRulesJson,
    props.thumbnailRulesJson,
    props.previewStrategyJson
  );
  return <StyleBlueprintPublicationSignalBadge level={level} />;
}
