import { JobInputSpecificityBadge } from "./JobInputSpecificityBadge";

type SpecificityLevel = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasMeaningfulContext(json: string | null | undefined): boolean {
  if (!isNonEmpty(json)) return false;
  try {
    const parsed = JSON.parse(json!);
    return typeof parsed === "object" && parsed !== null && Object.keys(parsed).length > 0;
  } catch {
    return false; // parse failed — non-empty but not meaningful object
  }
}

function isUnparsedNonEmpty(json: string | null | undefined): boolean {
  if (!isNonEmpty(json)) return false;
  try {
    JSON.parse(json!);
    return false; // parseable — handled by hasMeaningfulContext
  } catch {
    return true; // unparseable non-empty string
  }
}

export function computeJobInputSpecificity(
  sourceContextJson: string | null | undefined,
  templateId: string | null | undefined,
  workspacePath: string | null | undefined
): SpecificityLevel {
  const hasContext = hasMeaningfulContext(sourceContextJson);
  const hasUnparsedContext = isUnparsedNonEmpty(sourceContextJson);
  const hasTemplate = isNonEmpty(templateId);
  const hasWorkspace = isNonEmpty(workspacePath);

  // 1. Meaningful context + strong reference → Belirgin giriş
  if (hasContext && (hasTemplate || hasWorkspace)) return "Belirgin giriş";

  // 2. Meaningful context but no extra reference → Kısmi özgüllük
  if (hasContext) return "Kısmi özgüllük";

  // 3. Unparsed non-empty context or single weak signal → Kısmi özgüllük
  if (hasUnparsedContext || hasTemplate || hasWorkspace) return "Kısmi özgüllük";

  // 4. Nothing useful → Genel giriş
  return "Genel giriş";
}

interface Props {
  sourceContextJson: string | null | undefined;
  templateId: string | null | undefined;
  workspacePath: string | null | undefined;
}

export function JobInputSpecificitySummary({
  sourceContextJson,
  templateId,
  workspacePath,
}: Props) {
  const level = computeJobInputSpecificity(sourceContextJson, templateId, workspacePath);
  return <JobInputSpecificityBadge level={level} />;
}
