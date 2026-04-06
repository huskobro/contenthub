type InputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

interface Props {
  level: InputQualityLevel;
}

const STYLES: Record<InputQualityLevel, string> = {
  "Zayıf giriş": "bg-error-light text-error-text",
  "Kısmi giriş": "bg-warning-light text-warning-text",
  "Güçlü giriş": "bg-success-light text-success-text",
};

export function UsedNewsInputQualityBadge({ level }: Props) {
  const s = STYLES[level] ?? "bg-neutral-100 text-neutral-600";
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
