export type TemplateStyleLinkReadinessLevel =
  | "Ana bağ"
  | "Yedek bağ"
  | "Deneysel"
  | "Aktif bağ"
  | "Pasif"
  | "Arşiv"
  | "Belirsiz";

const styles: Record<TemplateStyleLinkReadinessLevel, string> = {
  "Ana bağ":   "bg-success-light text-success-text border-success-light",
  "Yedek bağ": "bg-info-light text-info-dark border-info-light",
  "Deneysel":  "bg-brand-50 text-brand-700 border-border-subtle",
  "Aktif bağ": "bg-success-light text-success-text border-success-light",
  "Pasif":     "bg-neutral-50 text-neutral-700 border-border-subtle",
  "Arşiv":     "bg-neutral-100 text-neutral-500 border-border",
  "Belirsiz":  "bg-warning-light text-warning-text border-warning-light",
};

interface Props {
  level: TemplateStyleLinkReadinessLevel;
}

export function TemplateStyleLinkReadinessBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
