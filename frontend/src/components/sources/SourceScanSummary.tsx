import { SourceScanStatusBadge } from "./SourceScanStatusBadge";
import { formatDateShort } from "../../lib/formatDate";
import { colors } from "../design-system/tokens";

interface Props {
  scanCount?: number;
  lastScanStatus?: string | null;
  lastScanFinishedAt?: string | null;
}

export function SourceScanSummary({ scanCount, lastScanStatus, lastScanFinishedAt }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <SourceScanStatusBadge status={lastScanStatus} scanCount={scanCount} />
      {lastScanFinishedAt && (
        <span style={{ fontSize: "0.68rem", color: colors.neutral[500] }}>
          {formatDateShort(lastScanFinishedAt)}
        </span>
      )}
    </div>
  );
}
