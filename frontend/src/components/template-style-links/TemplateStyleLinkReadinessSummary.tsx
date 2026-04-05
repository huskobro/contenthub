import { colors } from "../design-system/tokens";
import {
  TemplateStyleLinkReadinessBadge,
  TemplateStyleLinkReadinessLevel,
} from "./TemplateStyleLinkReadinessBadge";

interface Props {
  status?: string | null;
  linkRole?: string | null;
  templateId?: string | null;
  styleBlueprintId?: string | null;
}

export function computeTemplateStyleLinkReadiness(
  status: string | null | undefined,
  linkRole: string | null | undefined,
  templateId: string | null | undefined,
  styleBlueprintId: string | null | undefined,
): TemplateStyleLinkReadinessLevel {
  // Missing IDs → Belirsiz
  if (!templateId || !styleBlueprintId) return "Belirsiz";

  if (!status) return "Belirsiz";
  if (status === "archived") return "Arşiv";
  if (status === "inactive") return "Pasif";

  if (status === "active") {
    if (linkRole === "primary") return "Ana bağ";
    if (linkRole === "fallback") return "Yedek bağ";
    if (linkRole === "experimental") return "Deneysel";
    return "Aktif bağ";
  }

  return "Belirsiz";
}

export function TemplateStyleLinkReadinessSummary({
  status,
  linkRole,
  templateId,
  styleBlueprintId,
}: Props) {
  const level = computeTemplateStyleLinkReadiness(status, linkRole, templateId, styleBlueprintId);

  const parts: string[] = [];
  if (linkRole) parts.push(linkRole);
  if (status) parts.push(status);
  const detail = parts.length > 0 ? parts.join(" • ") : "detay yok";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <TemplateStyleLinkReadinessBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: colors.neutral[500] }}>{detail}</span>
    </div>
  );
}
