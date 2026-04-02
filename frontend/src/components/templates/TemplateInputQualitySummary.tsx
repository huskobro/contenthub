import { TemplateInputQualityBadge } from "./TemplateInputQualityBadge";

export type TemplateInputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

function getRelevantJson(
  templateType: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined
): string | null | undefined {
  const t = (templateType ?? "").toLowerCase();
  if (t === "style") return styleProfileJson;
  if (t === "content") return contentRulesJson;
  if (t === "publish") return publishProfileJson;
  // Unknown type: use first non-empty
  return styleProfileJson || contentRulesJson || publishProfileJson;
}

function scoreJson(raw: string | null | undefined): TemplateInputQualityLevel {
  if (!raw || raw.trim().length === 0) return "Zayıf giriş";
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const keyCount = Object.keys(parsed).length;
      if (keyCount === 0) return "Zayıf giriş";
      if (keyCount === 1) return "Kısmi giriş";
      return "Güçlü giriş";
    }
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return "Zayıf giriş";
      if (parsed.length === 1) return "Kısmi giriş";
      return "Güçlü giriş";
    }
    // Scalar: non-empty string is kısmi
    return "Kısmi giriş";
  } catch {
    // Non-parseable but non-empty string → kısmi
    return "Kısmi giriş";
  }
}

export function computeTemplateInputQuality(
  templateType: string | null | undefined,
  styleProfileJson: string | null | undefined,
  contentRulesJson: string | null | undefined,
  publishProfileJson: string | null | undefined
): TemplateInputQualityLevel {
  const relevant = getRelevantJson(templateType, styleProfileJson, contentRulesJson, publishProfileJson);
  return scoreJson(relevant);
}

interface Props {
  templateType: string | null | undefined;
  styleProfileJson: string | null | undefined;
  contentRulesJson: string | null | undefined;
  publishProfileJson: string | null | undefined;
}

export function TemplateInputQualitySummary({
  templateType,
  styleProfileJson,
  contentRulesJson,
  publishProfileJson,
}: Props) {
  const level = computeTemplateInputQuality(templateType, styleProfileJson, contentRulesJson, publishProfileJson);
  return <TemplateInputQualityBadge level={level} />;
}
