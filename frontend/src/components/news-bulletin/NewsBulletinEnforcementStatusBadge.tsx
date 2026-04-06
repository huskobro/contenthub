export type NewsBulletinEnforcementStatus = "Temiz" | "Uyarı var" | "Bilinmiyor";

const styles: Record<NewsBulletinEnforcementStatus, string> = {
  "Temiz":      "bg-success-light text-success-text border-success-light",
  "Uyarı var":  "bg-warning-light text-warning-text border-warning-light",
  "Bilinmiyor": "bg-neutral-100 text-neutral-500 border-border",
};

interface Props {
  status: NewsBulletinEnforcementStatus;
}

export function NewsBulletinEnforcementStatusBadge({ status }: Props) {
  const s = styles[status] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {status ?? "—"}
    </span>
  );
}
