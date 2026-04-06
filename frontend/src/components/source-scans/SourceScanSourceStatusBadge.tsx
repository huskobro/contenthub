export type SourceScanSourceStatus =
  | "Bağlı"
  | "Kaynak yok"
  | "Kaynak bulunamadı"
  | "Bilinmiyor";

const styles: Record<SourceScanSourceStatus, string> = {
  "Bağlı":            "bg-success-light text-success-text border-success-light",
  "Kaynak yok":       "bg-neutral-100 text-neutral-500 border-border",
  "Kaynak bulunamadı":"bg-warning-light text-warning-text border-warning-light",
  "Bilinmiyor":       "bg-neutral-50 text-neutral-700 border-border-subtle",
};

interface Props {
  status: SourceScanSourceStatus;
}

export function SourceScanSourceStatusBadge({ status }: Props) {
  const s = styles[status] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {status ?? "—"}
    </span>
  );
}
