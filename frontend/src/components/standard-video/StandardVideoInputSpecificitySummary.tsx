import { StandardVideoInputSpecificityBadge } from "./StandardVideoInputSpecificityBadge";

type Level = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function hasValidDuration(v: number | null | undefined): boolean {
  return typeof v === "number" && v > 0;
}

export function computeStandardVideoInputSpecificity(
  topic: string | null | undefined,
  brief: string | null | undefined,
  targetDurationSeconds: number | null | undefined,
  language: string | null | undefined,
): Level {
  // No topic → Genel giriş
  if (!isNonEmpty(topic)) return "Genel giriş";

  const hasDescription = isNonEmpty(brief);
  const hasDuration = hasValidDuration(targetDurationSeconds);
  const hasLanguage = isNonEmpty(language);

  // topic + description + duration + language → Belirgin giriş
  if (hasDescription && hasDuration && hasLanguage) return "Belirgin giriş";

  // topic present, anything else present → Kısmi özgüllük
  return "Kısmi özgüllük";
}

interface Props {
  topic: string | null | undefined;
  brief: string | null | undefined;
  targetDurationSeconds: number | null | undefined;
  language: string | null | undefined;
}

export function StandardVideoInputSpecificitySummary({
  topic,
  brief,
  targetDurationSeconds,
  language,
}: Props) {
  const level = computeStandardVideoInputSpecificity(topic, brief, targetDurationSeconds, language);
  return <StandardVideoInputSpecificityBadge level={level} />;
}
