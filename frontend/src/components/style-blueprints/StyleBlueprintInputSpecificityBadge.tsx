type Level = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

const STYLES: Record<Level, string> = {
  "Genel giriş":    "bg-neutral-100 text-neutral-600",
  "Kısmi özgüllük": "bg-warning-light text-warning-text",
  "Belirgin giriş": "bg-success-light text-success-text",
};

interface Props {
  level: Level;
}

export function StyleBlueprintInputSpecificityBadge({ level }: Props) {
  const s = STYLES[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-2 py-[0.125rem] text-sm rounded-full whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
