import { NewsBulletinReadinessBadge, ReadinessLevel } from "./NewsBulletinReadinessBadge";
import { safeNumber } from "../../lib/safeNumber";

interface Props {
  selectedNewsCount?: number;
  hasScript?: boolean;
  hasMetadata?: boolean;
}

export function computeReadinessLevel(
  selectedNewsCount: number,
  hasScript: boolean,
  hasMetadata: boolean
): ReadinessLevel {
  if (hasScript && hasMetadata) return "Hazır";
  if (!hasScript && hasMetadata) return "Kısmen hazır";
  if (hasScript && !hasMetadata) return "Script hazır";
  if (selectedNewsCount > 0 && !hasScript) return "İçerik seçildi";
  return "Başlangıç";
}

export function NewsBulletinReadinessSummary({ selectedNewsCount, hasScript, hasMetadata }: Props) {
  const count = safeNumber(selectedNewsCount, 0);
  const script = hasScript ?? false;
  const meta = hasMetadata ?? false;
  const level = computeReadinessLevel(count, script, meta);

  const parts: string[] = [];
  parts.push(`${count} haber`);
  parts.push(script ? "Script var" : "Script yok");
  parts.push(meta ? "Metadata var" : "Metadata yok");

  return (
    <div className="flex flex-col gap-[0.15rem]">
      <NewsBulletinReadinessBadge level={level} />
      <span className="text-[0.68rem] text-neutral-500">{parts.join(" • ")}</span>
    </div>
  );
}
