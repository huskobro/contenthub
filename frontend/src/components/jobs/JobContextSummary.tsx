import { JobContextBadge } from "./JobContextBadge";

interface Props {
  moduleType: string;
  sourceContextJson: string | null;
}

function extractContextTitle(json: string | null): string | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed === "object" && parsed !== null) {
      const val = parsed.title ?? parsed.topic ?? parsed.name ?? null;
      if (typeof val === "string" && val.trim()) return val.trim();
    }
  } catch {
    // ignore malformed JSON
  }
  return null;
}

export function JobContextSummary({ moduleType, sourceContextJson }: Props) {
  const contextTitle = extractContextTitle(sourceContextJson);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <JobContextBadge moduleType={moduleType} />
      {contextTitle && (
        <span style={{ fontSize: "0.68rem", color: "#64748b" }}>{contextTitle}</span>
      )}
    </div>
  );
}

export { extractContextTitle };
