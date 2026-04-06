import {
  StandardVideoReadinessBadge,
  StandardVideoReadinessLevel,
} from "./StandardVideoReadinessBadge";

interface Props {
  topic?: string | null;
  status?: string | null;
}

export function computeStandardVideoReadiness(
  topic: string | null | undefined,
  status: string | null | undefined,
): StandardVideoReadinessLevel {
  if (!topic || !topic.trim()) return "Başlangıç";

  // Use status field which already tracks script/metadata presence
  if (status === "ready") return "Hazır";
  if (status === "metadata_ready") return "Hazır";
  if (status === "script_ready") return "Script hazır";

  // metadata exists but no script (edge case)
  if (status === "metadata_only") return "Kısmen hazır";

  // topic present but still draft
  return "Taslak";
}

export function StandardVideoReadinessSummary({ topic, status }: Props) {
  const level = computeStandardVideoReadiness(topic, status);

  const parts: string[] = [];
  if (status) parts.push(status);
  const detail = parts.length > 0 ? parts.join(" • ") : "durum yok";

  return (
    <div className="flex flex-col gap-[0.15rem]">
      <StandardVideoReadinessBadge level={level} />
      <span className="text-[0.68rem] text-neutral-500">{detail}</span>
    </div>
  );
}
