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
    <div className="flex flex-col gap-[0.15rem]">
      <SourceLinkedNewsStatusBadge status={status} />
      <span className="text-[0.68rem] text-neutral-500">{detail}</span>
    </div>
  );
}
