import { SourceLinkedNewsStatusBadge, SourceLinkedNewsStatus } from "./SourceLinkedNewsStatusBadge";

interface Props {
  linkedNewsCount?: number;
}

export function computeSourceLinkedNewsStatus(
  linkedNewsCount: number | undefined,
): SourceLinkedNewsStatus {
  if (linkedNewsCount == null) return "Bilinmiyor";
  if (linkedNewsCount <= 0) return "İçerik yok";
  return "İçerik var";
}

export function SourceLinkedNewsSummary({ linkedNewsCount }: Props) {
  const status = computeSourceLinkedNewsStatus(linkedNewsCount);

  const detail =
    linkedNewsCount != null && linkedNewsCount > 0
      ? `${linkedNewsCount} haber bağlı`
      : "henüz içerik yok";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <SourceLinkedNewsStatusBadge status={status} />
      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{detail}</span>
    </div>
  );
}
