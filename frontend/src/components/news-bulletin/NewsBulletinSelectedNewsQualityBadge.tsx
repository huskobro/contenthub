export type QualityLevel = "İçerik yok" | "Zayıf set" | "Kısmi set" | "Güçlü set" | "Bilinmiyor";

const STYLES: Record<QualityLevel, string> = {
  "İçerik yok": "bg-neutral-100 text-neutral-600",
  "Zayıf set":  "bg-error-light text-error-text",
  "Kısmi set":  "bg-warning-light text-warning-text",
  "Güçlü set":  "bg-success-light text-success-text",
  "Bilinmiyor": "bg-neutral-100 text-neutral-500",
};

interface Props {
  level: QualityLevel;
  detail?: string;
}

export function NewsBulletinSelectedNewsQualityBadge({ level, detail }: Props) {
  const s = STYLES[level] ?? STYLES["Bilinmiyor"];
  return (
    <span className={`inline-flex flex-col px-2 py-[0.125rem] rounded-md text-sm font-medium whitespace-nowrap gap-px ${s}`}>
      <span>{level ?? "—"}</span>
      {detail && (
        <span className="text-[0.65rem] font-normal opacity-80">{detail}</span>
      )}
    </span>
  );
}
