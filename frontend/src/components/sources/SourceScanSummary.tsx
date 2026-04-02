import { SourceScanStatusBadge } from "./SourceScanStatusBadge";

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
        <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
          {new Date(lastScanFinishedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
