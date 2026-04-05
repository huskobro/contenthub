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
import { colors, radius, typography } from "../design-system/tokens";

const DASH = "—";
const TH_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem", borderBottom: `1px solid ${colors.border.subtle}` };
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
        fontSize: typography.size.md,
      }}
    >
      <thead>
        <tr style={{ background: colors.neutral[100], textAlign: "left" }}>
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
              background: selectedId === t.id ? colors.info.light : "transparent",
              borderBottom: `1px solid ${colors.neutral[100]}`,
            }}
          >
            {/* Kimlik & Durum */}
            <td style={{ padding: "0.5rem 0.75rem", color: colors.brand[700], fontWeight: selectedId === t.id ? 600 : 400, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {t.name ?? DASH}
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: colors.neutral[800] }}>{t.template_type ?? DASH}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: colors.neutral[800] }}>{t.owner_scope ?? DASH}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: colors.neutral[600] }}>{t.module_scope ?? DASH}</td>
            <td style={TD_STYLE}>
              <span
                style={{
                  display: "inline-block",
                  padding: "0.125rem 0.5rem",
                  borderRadius: radius.full,
                  fontSize: typography.size.sm,
                  background: t.status === "active" ? colors.success.light : colors.neutral[100],
                  color: t.status === "active" ? colors.success.text : colors.neutral[700],
                }}
              >
                {t.status ?? DASH}
              </span>
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: colors.neutral[600] }}>v{safeNumber(t.version, 0)}</td>
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
