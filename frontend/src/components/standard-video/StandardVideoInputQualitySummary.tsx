import { StandardVideoInputQualityBadge, type InputQualityLevel } from "./StandardVideoInputQualityBadge";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function hasDuration(v: number | null | undefined): boolean {
  return typeof v === "number" && v > 0;
}

export function computeStandardVideoInputQuality(
  topic: string | null | undefined,
  brief: string | null | undefined,
  targetDurationSeconds: number | null | undefined,
  language: string | null | undefined,
): InputQualityLevel {
  const hasTopic = isNonEmpty(topic);
  const hasBrief = isNonEmpty(brief);
  const hasDur = hasDuration(targetDurationSeconds);
  const hasLang = isNonEmpty(language);

  if (!hasTopic) return "Zayıf giriş";
  if (hasTopic && hasBrief && hasDur && hasLang) return "Güçlü giriş";
  return "Kısmi giriş";
}

interface Props {
  topic: string | null | undefined;
  brief: string | null | undefined;
  targetDurationSeconds: number | null | undefined;
  language: string | null | undefined;
}

export function StandardVideoInputQualitySummary({
  topic,
  brief,
  targetDurationSeconds,
  language,
}: Props) {
  const level = computeStandardVideoInputQuality(topic, brief, targetDurationSeconds, language);
  return <StandardVideoInputQualityBadge level={level} />;
}
