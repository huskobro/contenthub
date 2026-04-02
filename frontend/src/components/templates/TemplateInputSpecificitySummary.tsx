import { TemplateInputSpecificityBadge } from "./TemplateInputSpecificityBadge";

type Level = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function getKeyCount(jsonStr: string | null | undefined): number {
  if (!isNonEmpty(jsonStr)) return 0;
  try {
    const parsed = JSON.parse(jsonStr!.trim());
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.keys(parsed).length;
    }
    return 0;
  } catch {
    return -1; // unparseable non-empty string
  }
}

function getPrimaryJson(
  templateType: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined,
): string | null | undefined {
  const t = (templateType ?? "").toLowerCase().trim();
  if (t === "style") return styleProfileJson;
  if (t === "content") return contentRulesJson;
  if (t === "publish") return publishProfileJson;
  // Unknown type: use first non-empty
  return isNonEmpty(styleProfileJson)
    ? styleProfileJson
    : isNonEmpty(contentRulesJson)
    ? contentRulesJson
    : publishProfileJson;
}

export function computeTemplateInputSpecificity(
  templateType: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined,
  styleLinkCount: number | null | undefined,
  primaryLinkRole: string | null | undefined,
): Level {
  const primaryJson = getPrimaryJson(templateType, styleProfileJson, contentRulesJson, publishProfileJson);
  const keyCount = getKeyCount(primaryJson);

  // No primary JSON → Genel giriş
  if (keyCount === 0) return "Genel giriş";

  // Unparseable or only 1 key → Kısmi özgüllük
  if (keyCount < 0 || keyCount === 1) return "Kısmi özgüllük";

  // 2+ keys — check for style link reference
  const hasStyleLink = (styleLinkCount ?? 0) > 0 || isNonEmpty(primaryLinkRole);
  if (hasStyleLink) return "Belirgin giriş";

  // 2+ keys but no style link
  return "Kısmi özgüllük";
}

interface Props {
  templateType: string | null | undefined;
  styleProfileJson: string | null | undefined;
  contentRulesJson: string | null | undefined;
  publishProfileJson: string | null | undefined;
  styleLinkCount: number | null | undefined;
  primaryLinkRole: string | null | undefined;
}

export function TemplateInputSpecificitySummary({
  templateType,
  styleProfileJson,
  contentRulesJson,
  publishProfileJson,
  styleLinkCount,
  primaryLinkRole,
}: Props) {
  const level = computeTemplateInputSpecificity(
    templateType,
    styleProfileJson,
    contentRulesJson,
    publishProfileJson,
    styleLinkCount,
    primaryLinkRole,
  );
  return <TemplateInputSpecificityBadge level={level} />;
}
