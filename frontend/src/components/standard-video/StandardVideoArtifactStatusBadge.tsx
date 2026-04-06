export type ArtifactStatus = "Var" | "Eksik" | "Bilinmiyor";

const STYLES: Record<ArtifactStatus, string> = {
  "Var":        "bg-success-light text-success-text border-success-light",
  "Eksik":      "bg-warning-light text-warning-text border-warning-light",
  "Bilinmiyor": "bg-neutral-100 text-neutral-500 border-border",
};

interface Props {
  status: ArtifactStatus;
}

export function StandardVideoArtifactStatusBadge({ status }: Props) {
  const s = STYLES[status] ?? "bg-neutral-100 text-neutral-500 border-border";
  return (
    <span className={`inline-block px-1.5 py-[0.1rem] text-[0.65rem] rounded-sm whitespace-nowrap border ${s}`}>
      {status ?? "—"}
    </span>
  );
}
