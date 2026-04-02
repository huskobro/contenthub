import { StandardVideoPublicationSignalBadge } from "./StandardVideoPublicationSignalBadge";
import type { StandardVideoPublicationSignalLevel } from "./StandardVideoPublicationSignalBadge";

function isNonEmpty(val: string | null | undefined): boolean {
  return typeof val === "string" && val.trim().length > 0;
}

export function computeStandardVideoPublicationSignal(
  topic: string | null | undefined,
  hasScript: boolean | null | undefined,
  hasMetadata: boolean | null | undefined
): StandardVideoPublicationSignalLevel {
  if (!isNonEmpty(topic)) return "Başlangıç";
  if (!hasScript) return "Taslak";
  if (!hasMetadata) return "Taslak hazır";
  return "Yayına yakın";
}

interface Props {
  topic: string | null | undefined;
  hasScript: boolean | null | undefined;
  hasMetadata: boolean | null | undefined;
}

export function StandardVideoPublicationSignalSummary({ topic, hasScript, hasMetadata }: Props) {
  const level = computeStandardVideoPublicationSignal(topic, hasScript, hasMetadata);
  return <StandardVideoPublicationSignalBadge level={level} />;
}
