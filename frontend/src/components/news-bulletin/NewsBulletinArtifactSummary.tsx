import { NewsBulletinArtifactStatusBadge } from "./NewsBulletinArtifactStatusBadge";

interface Props {
  hasScript?: boolean;
  hasMetadata?: boolean;
}

export function NewsBulletinArtifactSummary({ hasScript, hasMetadata }: Props) {
  return (
    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
      <NewsBulletinArtifactStatusBadge present={hasScript ?? false} label="Script" />
      <NewsBulletinArtifactStatusBadge present={hasMetadata ?? false} label="Metadata" />
    </div>
  );
}
