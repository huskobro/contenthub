import { TemplateReadinessBadge, TemplateReadinessLevel } from "./TemplateReadinessBadge";
import { safeNumber } from "../../lib/safeNumber";

interface Props {
  templateType: string;
  status: string;
  styleProfileJson?: string | null;
  contentRulesJson?: string | null;
  publishProfileJson?: string | null;
  styleLinkCount?: number;
}

function getPrimaryJson(
  templateType: string,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined,
): string | null {
  if (templateType === "style") return styleProfileJson ?? null;
  if (templateType === "content") return contentRulesJson ?? null;
  if (templateType === "publish") return publishProfileJson ?? null;
  // fallback: use whichever is present
  return styleProfileJson ?? contentRulesJson ?? publishProfileJson ?? null;
}

export function computeTemplateReadiness(
  templateType: string,
  status: string,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined,
  styleLinkCount: number,
): TemplateReadinessLevel {
  const primaryJson = getPrimaryJson(templateType, styleProfileJson, contentRulesJson, publishProfileJson);
  const hasJson = !!primaryJson && primaryJson.trim().length > 0;
  const hasLink = styleLinkCount > 0;
  const isActive = status === "active";

  if (isActive && hasJson && hasLink) return "Hazır";
  if (isActive && (!hasJson || !hasLink)) return "Kısmen hazır";
  if (hasJson && hasLink) return "Bağlandı";
  if (hasJson && !hasLink) return "Taslak";
  return "Başlangıç";
}

export function TemplateReadinessSummary({
  templateType,
  status,
  styleProfileJson,
  contentRulesJson,
  publishProfileJson,
  styleLinkCount,
}: Props) {
  const count = safeNumber(styleLinkCount, 0);
  const level = computeTemplateReadiness(
    templateType,
    status,
    styleProfileJson,
    contentRulesJson,
    publishProfileJson,
    count,
  );

  const primaryJson = getPrimaryJson(templateType, styleProfileJson, contentRulesJson, publishProfileJson);
  const hasJson = !!primaryJson && primaryJson.trim().length > 0;
  const detail = `${hasJson ? "JSON var" : "JSON yok"} • ${count} bağ`;

  return (
    <div className="flex flex-col gap-[0.15rem]">
      <TemplateReadinessBadge level={level} />
      <span className="text-[0.68rem] text-neutral-500">{detail}</span>
    </div>
  );
}
