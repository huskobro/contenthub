import type { TemplateStyleLinkResponse } from "../../api/templateStyleLinksApi";
import { formatDateShort } from "../../lib/formatDate";
import { TemplateStyleLinkReadinessSummary } from "./TemplateStyleLinkReadinessSummary";
import { colors, typography } from "../design-system/tokens";

interface TemplateStyleLinksTableProps {
  links: TemplateStyleLinkResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TD_PAD = "0.5rem 0.75rem";
const TH_CELL: React.CSSProperties = { textAlign: "left", padding: TD_PAD, fontWeight: 600, color: colors.neutral[700] };

const STATUS_COLORS: Record<string, string> = {
  active: colors.success.base,
  inactive: colors.neutral[600],
  archived: colors.neutral[500],
};

export function TemplateStyleLinksTable({
  links,
  selectedId,
  onSelect,
}: TemplateStyleLinksTableProps) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.size.md }}>
      <thead>
        <tr style={{ background: colors.neutral[50], borderBottom: `1px solid ${colors.border.subtle}` }}>
          <th style={TH_CELL}>
            Template ID
          </th>
          <th style={TH_CELL}>
            Blueprint ID
          </th>
          <th style={TH_CELL}>
            Role
          </th>
          <th style={TH_CELL}>
            Status
          </th>
          <th style={TH_CELL}>
            Bağ Durumu
          </th>
          <th style={TH_CELL}>
            Created
          </th>
        </tr>
      </thead>
      <tbody>
        {links.map((link) => (
          <tr
            key={link.id}
            onClick={() => onSelect(link.id)}
            style={{
              cursor: "pointer",
              background: selectedId === link.id ? colors.info.light : "transparent",
              borderBottom: `1px solid ${colors.neutral[100]}`,
            }}
          >
            <td style={{ padding: TD_PAD, color: colors.neutral[900], fontFamily: "monospace", fontSize: typography.size.base }}>
              {link.template_id.slice(0, 8)}…
            </td>
            <td style={{ padding: TD_PAD, color: colors.neutral[900], fontFamily: "monospace", fontSize: typography.size.base }}>
              {link.style_blueprint_id.slice(0, 8)}…
            </td>
            <td style={{ padding: TD_PAD, color: colors.neutral[700] }}>
              {link.link_role ?? "—"}
            </td>
            <td style={{ padding: TD_PAD }}>
              <span style={{
                padding: "0.125rem 0.5rem",
                borderRadius: "999px",
                fontSize: typography.size.sm,
                fontWeight: 600,
                color: colors.neutral[0],
                background: STATUS_COLORS[link.status] ?? colors.neutral[500],
              }}>
                {link.status ?? "—"}
              </span>
            </td>
            <td style={{ padding: TD_PAD }}>
              <TemplateStyleLinkReadinessSummary
                status={link.status}
                linkRole={link.link_role}
                templateId={link.template_id}
                styleBlueprintId={link.style_blueprint_id}
              />
            </td>
            <td style={{ padding: TD_PAD, color: colors.neutral[600], fontSize: typography.size.base }}>
              {formatDateShort(link.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
