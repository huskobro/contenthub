import { TemplatePublicationOutcomeBadge } from "./TemplatePublicationOutcomeBadge";

type Level = "Hazırlanıyor" | "Ham çıktı" | "Aday çıktı" | "Yayına yakın çıktı";

function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return value.trim().length > 0;
}

function getPrimaryJson(
  templateType: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined,
): string | null | undefined {
  if (templateType === "style") return styleProfileJson;
  if (templateType === "content") return contentRulesJson;
  if (templateType === "publish") return publishProfileJson;
  // unknown type: use first non-empty
  return (
    (isNonEmpty(styleProfileJson) && styleProfileJson) ||
    (isNonEmpty(contentRulesJson) && contentRulesJson) ||
    (isNonEmpty(publishProfileJson) && publishProfileJson) ||
    null
  );
}

export function computeTemplatePublicationOutcome(
  templateType: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined,
  styleLinkCount: number | null | undefined,
  status: string | null | undefined,
): Level {
  const primaryJson = getPrimaryJson(templateType, styleProfileJson, contentRulesJson, publishProfileJson);

  if (!isNonEmpty(primaryJson)) return "Hazırlanıyor";

  const hasLinks = (styleLinkCount ?? 0) > 0;
  if (!hasLinks) return "Ham çıktı";

  const isActive = status === "active";
  if (!isActive) return "Aday çıktı";

  return "Yayına yakın çıktı";
}

interface Props {
  templateType: string | null | undefined;
  styleProfileJson: string | null | undefined;
  contentRulesJson: string | null | undefined;
  publishProfileJson: string | null | undefined;
  styleLinkCount: number | null | undefined;
  status: string | null | undefined;
}

export function TemplatePublicationOutcomeSummary({
  templateType,
  styleProfileJson,
  contentRulesJson,
  publishProfileJson,
  styleLinkCount,
  status,
}: Props) {
  const level = computeTemplatePublicationOutcome(
    templateType,
    styleProfileJson,
    contentRulesJson,
    publishProfileJson,
    styleLinkCount,
    status,
  );
  return <TemplatePublicationOutcomeBadge level={level} />;
}
