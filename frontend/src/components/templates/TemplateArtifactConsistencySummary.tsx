import { TemplateArtifactConsistencyBadge, type ArtifactConsistencyLevel } from "./TemplateArtifactConsistencyBadge";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function hasMainJson(
  templateType: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined,
): boolean {
  if (!templateType) {
    // Unknown type: any non-empty JSON counts
    return isNonEmpty(styleProfileJson) || isNonEmpty(contentRulesJson) || isNonEmpty(publishProfileJson);
  }
  const t = templateType.toLowerCase();
  if (t === "style") return isNonEmpty(styleProfileJson);
  if (t === "content") return isNonEmpty(contentRulesJson);
  if (t === "publish") return isNonEmpty(publishProfileJson);
  // For other/unknown types check all
  return isNonEmpty(styleProfileJson) || isNonEmpty(contentRulesJson) || isNonEmpty(publishProfileJson);
}

export function computeTemplateArtifactConsistency(
  templateType: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined,
  styleLinkCount: number | null | undefined,
): ArtifactConsistencyLevel {
  const hasJson = hasMainJson(templateType, styleProfileJson, contentRulesJson, publishProfileJson);
  const hasLinks = typeof styleLinkCount === "number" && styleLinkCount > 0;

  if (!hasJson && !hasLinks) return "Artifacts yok";
  if (hasJson && !hasLinks) return "Tek taraflı";
  if (!hasJson && hasLinks) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  templateType: string | null | undefined;
  styleProfileJson: string | null | undefined;
  contentRulesJson: string | null | undefined;
  publishProfileJson: string | null | undefined;
  styleLinkCount: number | null | undefined;
}

export function TemplateArtifactConsistencySummary({
  templateType,
  styleProfileJson,
  contentRulesJson,
  publishProfileJson,
  styleLinkCount,
}: Props) {
  const level = computeTemplateArtifactConsistency(
    templateType,
    styleProfileJson,
    contentRulesJson,
    publishProfileJson,
    styleLinkCount,
  );
  return <TemplateArtifactConsistencyBadge level={level} />;
}
