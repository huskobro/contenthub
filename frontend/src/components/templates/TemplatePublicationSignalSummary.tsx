import { TemplatePublicationSignalBadge } from "./TemplatePublicationSignalBadge";
import type { TemplatePublicationSignalLevel } from "./TemplatePublicationSignalBadge";

function isNonEmpty(val: string | null | undefined): boolean {
  return typeof val === "string" && val.trim().length > 0;
}

function getMainJson(
  templateType: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined
): string | null | undefined {
  const t = (templateType ?? "").toLowerCase();
  if (t === "style") return styleProfileJson;
  if (t === "content") return contentRulesJson;
  if (t === "publish") return publishProfileJson;
  return null;
}

export function computeTemplatePublicationSignal(
  templateType: string | null | undefined,
  status: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined,
  styleLinkCount: number | null | undefined
): TemplatePublicationSignalLevel {
  const mainJson = getMainJson(templateType, styleProfileJson, contentRulesJson, publishProfileJson);
  const hasJson = isNonEmpty(mainJson);
  const isActive = status === "active";
  const hasLinks = (styleLinkCount ?? 0) > 0;

  if (!hasJson && isActive) return "Kısmen hazır";
  if (!hasJson) return "Başlangıç";
  if (!hasLinks) return "Taslak";
  if (!isActive) return "Bağlandı";
  return "Yayına yakın";
}

interface Props {
  templateType: string | null | undefined;
  status: string | null | undefined;
  styleProfileJson: string | null | undefined;
  contentRulesJson: string | null | undefined;
  publishProfileJson: string | null | undefined;
  styleLinkCount: number | null | undefined;
}

export function TemplatePublicationSignalSummary({
  templateType,
  status,
  styleProfileJson,
  contentRulesJson,
  publishProfileJson,
  styleLinkCount,
}: Props) {
  const level = computeTemplatePublicationSignal(
    templateType,
    status,
    styleProfileJson,
    contentRulesJson,
    publishProfileJson,
    styleLinkCount
  );
  return <TemplatePublicationSignalBadge level={level} />;
}
