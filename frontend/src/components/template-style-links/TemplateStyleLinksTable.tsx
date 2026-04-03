import type { TemplateStyleLinkResponse } from "../../api/templateStyleLinksApi";
import { formatDateShort } from "../../lib/formatDate";
import { TemplateStyleLinkReadinessSummary } from "./TemplateStyleLinkReadinessSummary";

interface TemplateStyleLinksTableProps {
  links: TemplateStyleLinkResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TD_PAD = "0.5rem 0.75rem";
const TH_CELL: React.CSSProperties = { textAlign: "left", padding: TD_PAD, fontWeight: 600, color: "#475569" };

const STATUS_COLORS: Record<string, string> = {
  active: "#16a34a",
  inactive: "#64748b",
  archived: "#94a3b8",
};

export function TemplateStyleLinksTable({
  links,
  selectedId,
  onSelect,
}: TemplateStyleLinksTableProps) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
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
              background: selectedId === link.id ? "#eff6ff" : "transparent",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <td style={{ padding: TD_PAD, color: "#1e293b", fontFamily: "monospace", fontSize: "0.8rem" }}>
              {link.template_id.slice(0, 8)}…
            </td>
            <td style={{ padding: TD_PAD, color: "#1e293b", fontFamily: "monospace", fontSize: "0.8rem" }}>
              {link.style_blueprint_id.slice(0, 8)}…
            </td>
            <td style={{ padding: TD_PAD, color: "#475569" }}>
              {link.link_role ?? "—"}
            </td>
            <td style={{ padding: TD_PAD }}>
              <span style={{
                padding: "0.125rem 0.5rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#fff",
                background: STATUS_COLORS[link.status] ?? "#94a3b8",
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
            <td style={{ padding: TD_PAD, color: "#64748b", fontSize: "0.8rem" }}>
              {formatDateShort(link.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
