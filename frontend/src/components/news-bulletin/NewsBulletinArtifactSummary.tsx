import { NewsBulletinArtifactStatusBadge } from "./NewsBulletinArtifactStatusBadge";

interface Props {
  hasScript?: boolean;
  hasMetadata?: boolean;
}

export function NewsBulletinArtifactSummary({ hasScript, hasMetadata }: Props) {
  return (
    <div className="flex gap-1 flex-wrap">
      <NewsBulletinArtifactStatusBadge present={hasScript ?? false} label="Script" />
      <NewsBulletinArtifactStatusBadge present={hasMetadata ?? false} label="Metadata" />
    </div>
  );
}
