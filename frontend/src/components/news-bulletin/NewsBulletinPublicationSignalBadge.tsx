export type NewsBulletinPublicationSignalLevel =
  | "Başlangıç"
  | "İçerik toplandı"
  | "Taslak hazır"
  | "Kontrol gerekli"
  | "Yayına yakın";

const styles: Record<NewsBulletinPublicationSignalLevel, string> = {
  "Başlangıç":      "bg-neutral-50 text-neutral-500 border-border",
  "İçerik toplandı":"bg-warning-light text-warning-text border-warning-light",
  "Taslak hazır":   "bg-info-light text-info-dark border-info-light",
  "Kontrol gerekli":"bg-warning-light text-warning-text border-warning-light",
  "Yayına yakın":   "bg-success-light text-success-text border-success-light",
};

interface Props {
  level: NewsBulletinPublicationSignalLevel;
}

export function NewsBulletinPublicationSignalBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
