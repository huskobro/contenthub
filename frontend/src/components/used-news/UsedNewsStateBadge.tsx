export type UsedNewsStateLevel =
  | "Rezerve"
  | "Planlandı"
  | "Taslakta"
  | "Yayınlandı"
  | "Kayıtlı"
  | "Belirsiz";

const styles: Record<UsedNewsStateLevel, string> = {
  "Rezerve":   "bg-warning-light text-warning-text border-warning-light",
  "Planlandı": "bg-info-light text-info-dark border-info-light",
  "Taslakta":  "bg-neutral-50 text-neutral-700 border-border-subtle",
  "Yayınlandı":"bg-success-light text-success-text border-success-light",
  "Kayıtlı":   "bg-success-light text-success-text border-success-light",
  "Belirsiz":  "bg-neutral-100 text-neutral-500 border-border",
};

interface Props {
  level: UsedNewsStateLevel;
}

export function UsedNewsStateBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
