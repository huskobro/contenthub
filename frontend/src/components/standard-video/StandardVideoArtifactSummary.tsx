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
    <div className="flex flex-col gap-[0.2rem]">
      <div className="flex items-center gap-[0.3rem]">
        <span className="text-[0.65rem] text-neutral-600 min-w-[46px]">Script:</span>
        <StandardVideoArtifactStatusBadge status={scriptStatus} />
      </div>
      <div className="flex items-center gap-[0.3rem]">
        <span className="text-[0.65rem] text-neutral-600 min-w-[46px]">Metadata:</span>
        <StandardVideoArtifactStatusBadge status={metaStatus} />
      </div>
    </div>
  );
}
