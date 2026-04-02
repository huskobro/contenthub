import { UsedNewsPublicationLinkageBadge } from "./UsedNewsPublicationLinkageBadge";

type Level = "Taslağa bağlı" | "Planlandı" | "Yayınlandı" | "Bağ eksik" | "Belirsiz";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeUsedNewsPublicationLinkage(
  usageType: string | null | undefined,
  targetEntityId: string | null | undefined,
): Level {
  const hasTarget = isNonEmpty(targetEntityId);
  if (!isNonEmpty(usageType)) return hasTarget ? "Belirsiz" : "Bağ eksik";
  if (!hasTarget) return "Bağ eksik";

  const type = (usageType as string).toLowerCase();
  if (type.includes("published")) return "Yayınlandı";
  if (type.includes("scheduled")) return "Planlandı";
  if (type.includes("draft")) return "Taslağa bağlı";
  return "Belirsiz";
}

interface Props {
  usageType: string | null | undefined;
  targetEntityId: string | null | undefined;
}

export function UsedNewsPublicationLinkageSummary({ usageType, targetEntityId }: Props) {
  const level = computeUsedNewsPublicationLinkage(usageType, targetEntityId);
  return <UsedNewsPublicationLinkageBadge level={level} />;
}
