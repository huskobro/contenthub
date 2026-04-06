import type { NewsBulletinInputQualityLevel } from "./NewsBulletinInputQualitySummary";

const STYLES: Record<NewsBulletinInputQualityLevel, string> = {
  "Zayıf giriş": "bg-error-light text-error-text",
  "Kısmi giriş": "bg-warning-light text-warning-text",
  "Güçlü giriş": "bg-success-light text-success-text",
};

interface Props {
  level: NewsBulletinInputQualityLevel;
}

export function NewsBulletinInputQualityBadge({ level }: Props) {
  const s = STYLES[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-2 py-[0.125rem] text-sm rounded-full whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
