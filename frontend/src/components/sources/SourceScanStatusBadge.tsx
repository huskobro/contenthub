function statusClasses(status: string): string {
  if (status === "completed") return "bg-success-light text-success-text border-success-light";
  if (status === "failed") return "bg-error-light text-error-text border-error-light";
  if (status === "running") return "bg-info-light text-info-dark border-info-light";
  return "bg-neutral-100 text-neutral-600 border-border";
}

interface Props {
  status?: string | null;
  scanCount?: number;
}

export function SourceScanStatusBadge({ status, scanCount }: Props) {
  if (!status && (!scanCount || scanCount === 0)) {
    return (
      <span className="text-xs text-neutral-500">Scan yok</span>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {status && (
        <span
          className={`inline-block px-1.5 py-[0.1rem] text-xs rounded-sm whitespace-nowrap border ${statusClasses(status)}`}
        >
          {status ?? "—"}
        </span>
      )}
      {typeof scanCount === "number" && (
        <span className="text-xs text-neutral-500">({scanCount}x)</span>
      )}
    </div>
  );
}
