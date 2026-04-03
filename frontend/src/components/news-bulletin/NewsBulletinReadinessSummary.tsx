import { NewsBulletinReadinessBadge, ReadinessLevel } from "./NewsBulletinReadinessBadge";

interface Props {
  selectedNewsCount?: number;
  hasScript?: boolean;
  hasMetadata?: boolean;
}

export function computeReadinessLevel(
  selectedNewsCount: number,
  hasScript: boolean,
  hasMetadata: boolean
): ReadinessLevel {
  if (hasScript && hasMetadata) return "Hazır";
  if (!hasScript && hasMetadata) return "Kısmen hazır";
  if (hasScript && !hasMetadata) return "Script hazır";
  if (selectedNewsCount > 0 && !hasScript) return "İçerik seçildi";
  return "Başlangıç";
}

export function NewsBulletinReadinessSummary({ selectedNewsCount, hasScript, hasMetadata }: Props) {
  const raw = selectedNewsCount ?? 0;
  const count = typeof raw === "number" && !isNaN(raw) && isFinite(raw) ? raw : 0;
  const script = hasScript ?? false;
  const meta = hasMetadata ?? false;
  const level = computeReadinessLevel(count, script, meta);

  const parts: string[] = [];
  parts.push(`${count} haber`);
  parts.push(script ? "Script var" : "Script yok");
  parts.push(meta ? "Metadata var" : "Metadata yok");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <NewsBulletinReadinessBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{parts.join(" • ")}</span>
    </div>
  );
}
