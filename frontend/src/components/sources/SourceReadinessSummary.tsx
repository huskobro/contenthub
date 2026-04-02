import { SourceReadinessBadge, SourceReadinessLevel } from "./SourceReadinessBadge";

interface Props {
  sourceType: string;
  status: string;
  baseUrl?: string | null;
  feedUrl?: string | null;
  apiEndpoint?: string | null;
  scanCount?: number;
  lastScanStatus?: string | null;
}

function hasRequiredUrl(
  sourceType: string,
  baseUrl: string | null | undefined,
  feedUrl: string | null | undefined,
  apiEndpoint: string | null | undefined,
): boolean {
  if (sourceType === "rss") return !!feedUrl;
  if (sourceType === "manual_url") return !!baseUrl;
  if (sourceType === "api") return !!apiEndpoint;
  // fallback: any url present
  return !!(feedUrl ?? baseUrl ?? apiEndpoint);
}

export function computeSourceReadiness(
  sourceType: string,
  status: string,
  baseUrl: string | null | undefined,
  feedUrl: string | null | undefined,
  apiEndpoint: string | null | undefined,
  scanCount: number,
  lastScanStatus: string | null | undefined,
): SourceReadinessLevel {
  if (!hasRequiredUrl(sourceType, baseUrl, feedUrl, apiEndpoint)) return "Başlangıç";
  if (lastScanStatus === "failed") return "Dikkat gerekli";
  if (status === "active" && lastScanStatus === "completed") return "Hazır";
  if (status === "active" && scanCount <= 0) return "Kısmen hazır";
  if (scanCount <= 0) return "Yapılandı";
  return "Yapılandı";
}

export function SourceReadinessSummary({
  sourceType,
  status,
  baseUrl,
  feedUrl,
  apiEndpoint,
  scanCount,
  lastScanStatus,
}: Props) {
  const count = scanCount ?? 0;
  const level = computeSourceReadiness(
    sourceType,
    status,
    baseUrl,
    feedUrl,
    apiEndpoint,
    count,
    lastScanStatus,
  );

  const urlPresent = hasRequiredUrl(sourceType, baseUrl, feedUrl, apiEndpoint);
  const urlLabel = sourceType === "rss" ? "Feed" : sourceType === "api" ? "API" : "URL";
  const parts: string[] = [];
  parts.push(urlPresent ? `${urlLabel} var` : `${urlLabel} yok`);
  parts.push(`${count} scan`);
  if (lastScanStatus) parts.push(`Son: ${lastScanStatus}`);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <SourceReadinessBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{parts.join(" • ")}</span>
    </div>
  );
}
