type SpecificityLevel = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

interface Props {
  level: SpecificityLevel;
}

const STYLES: Record<SpecificityLevel, string> = {
  "Genel giriş":    "bg-neutral-100 text-neutral-600",
  "Kısmi özgüllük": "bg-warning-light text-warning-text",
  "Belirgin giriş": "bg-success-light text-success-text",
};

export function JobInputSpecificityBadge({ level }: Props) {
  const s = STYLES[level] ?? "bg-neutral-100 text-neutral-600";
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
