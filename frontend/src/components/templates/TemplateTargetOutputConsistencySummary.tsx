import { TemplateTargetOutputConsistencyBadge } from "./TemplateTargetOutputConsistencyBadge";

type Level = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function getPrimaryJson(
  templateType: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined,
): boolean {
  const t = (templateType ?? "").toLowerCase().trim();
  if (t === "style") return isNonEmpty(styleProfileJson);
  if (t === "content") return isNonEmpty(contentRulesJson);
  if (t === "publish") return isNonEmpty(publishProfileJson);
  // Unknown type: any non-empty JSON field counts
  return isNonEmpty(styleProfileJson) || isNonEmpty(contentRulesJson) || isNonEmpty(publishProfileJson);
}

export function computeTemplateTargetOutputConsistency(
  templateType: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined,
  styleLinkCount: number | null | undefined,
): Level {
  const hasInput = getPrimaryJson(templateType, styleProfileJson, contentRulesJson, publishProfileJson);
  const hasOutput = (styleLinkCount ?? 0) > 0;

  if (!hasInput && !hasOutput) return "Artifacts yok";
  if (hasInput && !hasOutput) return "Tek taraflı";
  if (!hasInput && hasOutput) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  templateType: string | null | undefined;
  styleProfileJson: string | null | undefined;
  contentRulesJson: string | null | undefined;
  publishProfileJson: string | null | undefined;
  styleLinkCount: number | null | undefined;
}

export function TemplateTargetOutputConsistencySummary({
  templateType,
  styleProfileJson,
  contentRulesJson,
  publishProfileJson,
  styleLinkCount,
}: Props) {
  const level = computeTemplateTargetOutputConsistency(
    templateType,
    styleProfileJson,
    contentRulesJson,
    publishProfileJson,
    styleLinkCount,
  );
  return <TemplateTargetOutputConsistencyBadge level={level} />;
}
