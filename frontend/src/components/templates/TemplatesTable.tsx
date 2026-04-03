import type { TemplateResponse } from "../../api/templatesApi";
import { TemplateStyleLinkSummary } from "./TemplateStyleLinkSummary";
import { TemplateReadinessSummary } from "./TemplateReadinessSummary";
import { TemplatePublicationSignalSummary } from "./TemplatePublicationSignalSummary";
import { TemplateArtifactConsistencySummary } from "./TemplateArtifactConsistencySummary";
import { TemplateInputQualitySummary } from "./TemplateInputQualitySummary";
import { TemplateInputSpecificitySummary } from "./TemplateInputSpecificitySummary";
import { TemplateTargetOutputConsistencySummary } from "./TemplateTargetOutputConsistencySummary";
import { TemplatePublicationOutcomeSummary } from "./TemplatePublicationOutcomeSummary";

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
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Ad</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Tür</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Sahip</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Modül</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Durum</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Sürüm</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Stil Bağları</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Hazırlık</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Kalitesi</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Özgüllüğü</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Sinyali</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Çıktısı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Artifact Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Target/Output Tutarlılığı</th>
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
              {t.name}
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#334155" }}>{t.template_type}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#334155" }}>{t.owner_scope}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{t.module_scope ?? "—"}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
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
                {t.status}
              </span>
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>v{t.version}</td>
            {/* Stil & Hazırlık */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <TemplateStyleLinkSummary
                styleLinkCount={t.style_link_count}
                primaryLinkRole={t.primary_link_role}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
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
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <TemplateInputQualitySummary
                templateType={t.template_type}
                styleProfileJson={t.style_profile_json}
                contentRulesJson={t.content_rules_json}
                publishProfileJson={t.publish_profile_json}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
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
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <TemplatePublicationSignalSummary
                templateType={t.template_type}
                status={t.status}
                styleProfileJson={t.style_profile_json}
                contentRulesJson={t.content_rules_json}
                publishProfileJson={t.publish_profile_json}
                styleLinkCount={t.style_link_count}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
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
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <TemplateArtifactConsistencySummary
                templateType={t.template_type}
                styleProfileJson={t.style_profile_json}
                contentRulesJson={t.content_rules_json}
                publishProfileJson={t.publish_profile_json}
                styleLinkCount={t.style_link_count}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
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
