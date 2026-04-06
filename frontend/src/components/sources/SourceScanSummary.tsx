import { SourceScanStatusBadge } from "./SourceScanStatusBadge";
import { formatDateShort } from "../../lib/formatDate";

interface Props {
  scanCount?: number;
  lastScanStatus?: string | null;
  lastScanFinishedAt?: string | null;
}

export function SourceScanSummary({ scanCount, lastScanStatus, lastScanFinishedAt }: Props) {
  return (
    <div className="flex flex-col gap-[0.15rem]">
      <SourceScanStatusBadge status={lastScanStatus} scanCount={scanCount} />
      {lastScanFinishedAt && (
        <span className="text-[0.68rem] text-neutral-500">
          {formatDateShort(lastScanFinishedAt)}
        </span>
      )}
    </div>
  );
}
