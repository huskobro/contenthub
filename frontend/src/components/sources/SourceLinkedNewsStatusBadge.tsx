export type SourceLinkedNewsStatus =
  | "İçerik yok"
  | "İçerik var"
  | "Bilinmiyor";

const styles: Record<SourceLinkedNewsStatus, string> = {
  "İçerik yok": "bg-neutral-100 text-neutral-500 border-border",
  "İçerik var": "bg-success-light text-success-text border-success-light",
  "Bilinmiyor": "bg-neutral-50 text-neutral-700 border-border-subtle",
};

interface Props {
  status: SourceLinkedNewsStatus;
}

export function SourceLinkedNewsStatusBadge({ status }: Props) {
  const s = styles[status] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {status ?? "—"}
    </span>
  );
}
