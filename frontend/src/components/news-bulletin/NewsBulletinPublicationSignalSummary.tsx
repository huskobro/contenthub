import { NewsBulletinPublicationSignalBadge } from "./NewsBulletinPublicationSignalBadge";
import type { NewsBulletinPublicationSignalLevel } from "./NewsBulletinPublicationSignalBadge";

export function computeNewsBulletinPublicationSignal(
  selectedNewsCount: number | null | undefined,
  hasScript: boolean | null | undefined,
  hasMetadata: boolean | null | undefined,
  selectedNewsWarningCount: number | null | undefined
): NewsBulletinPublicationSignalLevel {
  const count = selectedNewsCount ?? 0;
  const script = !!hasScript;
  const metadata = !!hasMetadata;
  const warnings = selectedNewsWarningCount ?? 0;

  if (!script && !metadata && count <= 0) return "Başlangıç";
  if (!script) return "İçerik toplandı";
  if (!metadata) return "Taslak hazır";
  if (warnings > 0) return "Kontrol gerekli";
  return "Yayına yakın";
}

interface Props {
  selectedNewsCount: number | null | undefined;
  hasScript: boolean | null | undefined;
  hasMetadata: boolean | null | undefined;
  selectedNewsWarningCount: number | null | undefined;
}

export function NewsBulletinPublicationSignalSummary({
  selectedNewsCount,
  hasScript,
  hasMetadata,
  selectedNewsWarningCount,
}: Props) {
  const level = computeNewsBulletinPublicationSignal(
    selectedNewsCount,
    hasScript,
    hasMetadata,
    selectedNewsWarningCount
  );
  return <NewsBulletinPublicationSignalBadge level={level} />;
}
