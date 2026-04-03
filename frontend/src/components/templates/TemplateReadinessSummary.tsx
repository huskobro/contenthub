import { TemplateReadinessBadge, TemplateReadinessLevel } from "./TemplateReadinessBadge";

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
  const raw = styleLinkCount ?? 0;
  const count = typeof raw === "number" && !isNaN(raw) && isFinite(raw) ? raw : 0;
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <TemplateReadinessBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{detail}</span>
    </div>
  );
}
