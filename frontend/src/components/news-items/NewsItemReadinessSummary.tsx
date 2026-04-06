import { NewsItemReadinessBadge, NewsItemReadinessLevel } from "./NewsItemReadinessBadge";
import { safeNumber } from "../../lib/safeNumber";

interface Props {
  title?: string | null;
  url?: string | null;
  status: string;
  sourceId?: string | null;
  usageCount?: number;
  lastUsageType?: string | null;
  lastTargetModule?: string | null;
}

export function computeNewsItemReadiness(
  title: string | null | undefined,
  url: string | null | undefined,
  status: string,
): NewsItemReadinessLevel {
  if (!title || !url) return "Başlangıç";
  if (status === "ignored") return "Hariç";
  if (status === "used") return "Kullanıldı";
  if (status === "reviewed") return "Gözden geçirildi";
  if (status === "new") return "Ham kayıt";
  // unexpected status but fields present
  return "Kısmen hazır";
}

export function NewsItemReadinessSummary({
  title,
  url,
  status,
  sourceId,
  usageCount,
  lastUsageType,
  lastTargetModule,
}: Props) {
  const level = computeNewsItemReadiness(title, url, status);
  const count = safeNumber(usageCount, 0);

  const parts: string[] = [];
  parts.push(sourceId ? "Kaynak var" : "Kaynak yok");
  if (count === 0) {
    parts.push("Kullanım yok");
  } else {
    parts.push(`${count} kullanım`);
    if (lastTargetModule ?? lastUsageType) {
      parts.push(`Son: ${lastTargetModule ?? lastUsageType}`);
    }
  }

  return (
    <div className="flex flex-col gap-[0.15rem]">
      <NewsItemReadinessBadge level={level} />
      <span className="text-[0.68rem] text-neutral-500">{parts.join(" • ")}</span>
    </div>
  );
}
