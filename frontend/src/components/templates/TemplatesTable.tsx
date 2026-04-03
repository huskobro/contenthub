import type { TemplateResponse } from "../../api/templatesApi";
import { safeNumber } from "../../lib/safeNumber";
import { TemplateStyleLinkSummary } from "./TemplateStyleLinkSummary";
import { TemplateReadinessSummary } from "./TemplateReadinessSummary";
import { TemplatePublicationSignalSummary } from "./TemplatePublicationSignalSummary";
import { TemplateArtifactConsistencySummary } from "./TemplateArtifactConsistencySummary";
import { TemplateInputQualitySummary } from "./TemplateInputQualitySummary";
import { TemplateInputSpecificitySummary } from "./TemplateInputSpecificitySummary";
import { TemplateTargetOutputConsistencySummary } from "./TemplateTargetOutputConsistencySummary";
import { TemplatePublicationOutcomeSummary } from "./TemplatePublicationOutcomeSummary";

const DASH = "—";
const TH_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem" };

interface TemplatesTableProps {
  templates: TemplateResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TemplatesTable({ templates, selectedId, onSelect }: TemplatesTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "0.875rem",
      }}
    >
      <thead>
        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
          <th style={TH_STYLE}>Ad</th>
          <th style={TH_STYLE}>Tür</th>
          <th style={TH_STYLE}>Sahip</th>
          <th style={TH_STYLE}>Modül</th>
          <th style={TH_STYLE}>Durum</th>
          <th style={TH_STYLE}>Sürüm</th>
          <th style={TH_STYLE}>Stil Bağları</th>
          <th style={TH_STYLE}>Hazırlık</th>
          <th style={TH_STYLE}>Girdi Kalitesi</th>
          <th style={TH_STYLE}>Girdi Özgüllüğü</th>
          <th style={TH_STYLE}>Yayın Sinyali</th>
          <th style={TH_STYLE}>Yayın Çıktısı</th>
          <th style={TH_STYLE}>Artifact Tutarlılığı</th>
          <th style={TH_STYLE}>Target/Output Tutarlılığı</th>
        </tr>
      </thead>
      <tbody>
        {templates.map((t) => (
          <tr
            key={t.id}
            onClick={() => onSelect(t.id)}
            style={{
              cursor: "pointer",
              background: selectedId === t.id ? "#eff6ff" : "transparent",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            {/* Kimlik & Durum */}
            <td style={{ padding: "0.5rem 0.75rem", color: "#1e40af", fontWeight: selectedId === t.id ? 600 : 400, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {t.name ?? DASH}
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#334155" }}>{t.template_type ?? DASH}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#334155" }}>{t.owner_scope ?? DASH}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{t.module_scope ?? DASH}</td>
            <td style={TD_STYLE}>
              <span
                style={{
                  display: "inline-block",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  background: t.status === "active" ? "#dcfce7" : "#f1f5f9",
                  color: t.status === "active" ? "#166534" : "#475569",
                }}
              >
                {t.status ?? DASH}
              </span>
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>v{safeNumber(t.version, 0)}</td>
            {/* Stil & Hazırlık */}
            <td style={TD_STYLE}>
              <TemplateStyleLinkSummary
                styleLinkCount={t.style_link_count}
                primaryLinkRole={t.primary_link_role}
              />
            </td>
            <td style={TD_STYLE}>
              <TemplateReadinessSummary
                templateType={t.template_type}
                status={t.status}
                styleProfileJson={t.style_profile_json}
                contentRulesJson={t.content_rules_json}
                publishProfileJson={t.publish_profile_json}
                styleLinkCount={t.style_link_count}
              />
            </td>
            {/* Girdi Grubu */}
            <td style={TD_STYLE}>
              <TemplateInputQualitySummary
                templateType={t.template_type}
                styleProfileJson={t.style_profile_json}
                contentRulesJson={t.content_rules_json}
                publishProfileJson={t.publish_profile_json}
              />
            </td>
            <td style={TD_STYLE}>
              <TemplateInputSpecificitySummary
                templateType={t.template_type}
                styleProfileJson={t.style_profile_json}
                contentRulesJson={t.content_rules_json}
                publishProfileJson={t.publish_profile_json}
                styleLinkCount={t.style_link_count}
                primaryLinkRole={t.primary_link_role}
              />
            </td>
            {/* Yayın Grubu */}
            <td style={TD_STYLE}>
              <TemplatePublicationSignalSummary
                templateType={t.template_type}
                status={t.status}
                styleProfileJson={t.style_profile_json}
                contentRulesJson={t.content_rules_json}
                publishProfileJson={t.publish_profile_json}
                styleLinkCount={t.style_link_count}
              />
            </td>
            <td style={TD_STYLE}>
              <TemplatePublicationOutcomeSummary
                templateType={t.template_type}
                styleProfileJson={t.style_profile_json}
                contentRulesJson={t.content_rules_json}
                publishProfileJson={t.publish_profile_json}
                styleLinkCount={t.style_link_count}
                status={t.status}
              />
            </td>
            {/* Tutarlılık Grubu */}
            <td style={TD_STYLE}>
              <TemplateArtifactConsistencySummary
                templateType={t.template_type}
                styleProfileJson={t.style_profile_json}
                contentRulesJson={t.content_rules_json}
                publishProfileJson={t.publish_profile_json}
                styleLinkCount={t.style_link_count}
              />
            </td>
            <td style={TD_STYLE}>
              <TemplateTargetOutputConsistencySummary
                templateType={t.template_type}
                styleProfileJson={t.style_profile_json}
                contentRulesJson={t.content_rules_json}
                publishProfileJson={t.publish_profile_json}
                styleLinkCount={t.style_link_count}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
