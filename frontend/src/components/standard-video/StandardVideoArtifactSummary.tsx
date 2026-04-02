import { ArtifactStatus, StandardVideoArtifactStatusBadge } from "./StandardVideoArtifactStatusBadge";

interface Props {
  hasScript?: boolean | null;
  hasMetadata?: boolean | null;
}

function toStatus(value: boolean | null | undefined): ArtifactStatus {
  if (value == null) return "Bilinmiyor";
  return value ? "Var" : "Eksik";
}

export function StandardVideoArtifactSummary({ hasScript, hasMetadata }: Props) {
  const scriptStatus = toStatus(hasScript);
  const metaStatus = toStatus(hasMetadata);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <span style={{ fontSize: "0.65rem", color: "#64748b", minWidth: "46px" }}>Script:</span>
        <StandardVideoArtifactStatusBadge status={scriptStatus} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <span style={{ fontSize: "0.65rem", color: "#64748b", minWidth: "46px" }}>Metadata:</span>
        <StandardVideoArtifactStatusBadge status={metaStatus} />
      </div>
    </div>
  );
}
