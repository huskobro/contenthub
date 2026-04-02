import { NewsBulletinInputSpecificityBadge } from "./NewsBulletinInputSpecificityBadge";

type Level = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeNewsBulletinInputSpecificity(
  title: string | null | undefined,
  topic: string | null | undefined,
  selectedNewsCount: number | null | undefined,
  selectedNewsSourceCount: number | null | undefined,
  language: string | null | undefined,
  bulletinStyle: string | null | undefined,
): Level {
  const hasTitleOrTopic = isNonEmpty(title) || isNonEmpty(topic);

  // Neither title nor topic → Genel giriş
  if (!hasTitleOrTopic) return "Genel giriş";

  const hasSelectedNews = (selectedNewsCount ?? 0) > 0;

  // title/topic but no selected news → Kısmi özgüllük
  if (!hasSelectedNews) return "Kısmi özgüllük";

  // title/topic + selected news + (source coverage or language or style) → Belirgin giriş
  const hasCoverage = (selectedNewsSourceCount ?? 0) > 0;
  const hasHelper = isNonEmpty(language) || isNonEmpty(bulletinStyle);

  if (hasCoverage || hasHelper) return "Belirgin giriş";

  return "Kısmi özgüllük";
}

interface Props {
  title: string | null | undefined;
  topic: string | null | undefined;
  selectedNewsCount: number | null | undefined;
  selectedNewsSourceCount: number | null | undefined;
  language: string | null | undefined;
  bulletinStyle: string | null | undefined;
}

export function NewsBulletinInputSpecificitySummary({
  title,
  topic,
  selectedNewsCount,
  selectedNewsSourceCount,
  language,
  bulletinStyle,
}: Props) {
  const level = computeNewsBulletinInputSpecificity(
    title,
    topic,
    selectedNewsCount,
    selectedNewsSourceCount,
    language,
    bulletinStyle,
  );
  return <NewsBulletinInputSpecificityBadge level={level} />;
}
