export type NewsBulletinInputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeNewsBulletinInputQuality(
  title: string | null | undefined,
  topic: string | null | undefined,
  selectedNewsCount: number | null | undefined,
  selectedNewsSourceCount: number | null | undefined,
  language: string | null | undefined,
  bulletinStyle: string | null | undefined
): NewsBulletinInputQualityLevel {
  const hasTitle = isNonEmpty(title);
  const hasTopic = isNonEmpty(topic);

  if (!hasTitle && !hasTopic) return "Zayıf giriş";

  const hasNews =
    typeof selectedNewsCount === "number" && selectedNewsCount > 0;

  if (!hasNews) return "Kısmi giriş";

  const hasExtra =
    (typeof selectedNewsSourceCount === "number" && selectedNewsSourceCount > 0) ||
    isNonEmpty(language) ||
    isNonEmpty(bulletinStyle);

  if (hasExtra) return "Güçlü giriş";
  return "Kısmi giriş";
}

interface Props {
  title: string | null | undefined;
  topic: string | null | undefined;
  selectedNewsCount: number | null | undefined;
  selectedNewsSourceCount: number | null | undefined;
  language: string | null | undefined;
  bulletinStyle: string | null | undefined;
}

export function NewsBulletinInputQualitySummary({
  title,
  topic,
  selectedNewsCount,
  selectedNewsSourceCount,
  language,
  bulletinStyle,
}: Props) {
  const level = computeNewsBulletinInputQuality(
    title, topic, selectedNewsCount, selectedNewsSourceCount, language, bulletinStyle
  );
  return <NewsBulletinInputQualityBadge level={level} />;
}

import { NewsBulletinInputQualityBadge } from "./NewsBulletinInputQualityBadge";
