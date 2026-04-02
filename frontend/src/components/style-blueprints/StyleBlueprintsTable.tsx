import type { StyleBlueprintResponse } from "../../api/styleBlueprintsApi";
import { StyleBlueprintReadinessSummary } from "./StyleBlueprintReadinessSummary";
import { StyleBlueprintPublicationSignalSummary } from "./StyleBlueprintPublicationSignalSummary";
import { StyleBlueprintArtifactConsistencySummary } from "./StyleBlueprintArtifactConsistencySummary";
import { StyleBlueprintInputQualitySummary } from "./StyleBlueprintInputQualitySummary";
import { StyleBlueprintInputSpecificitySummary } from "./StyleBlueprintInputSpecificitySummary";
import { StyleBlueprintTargetOutputConsistencySummary } from "./StyleBlueprintTargetOutputConsistencySummary";
import { StyleBlueprintPublicationOutcomeSummary } from "./StyleBlueprintPublicationOutcomeSummary";

interface StyleBlueprintsTableProps {
  blueprints: StyleBlueprintResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function StyleBlueprintsTable({ blueprints, selectedId, onSelect }: StyleBlueprintsTableProps) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Ad</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Modül</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Durum</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Sürüm</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Hazırlık</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Kalitesi</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Özgüllüğü</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Sinyali</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Çıktısı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Artifact Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Target/Output Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {blueprints.map((bp) => (
          <tr
            key={bp.id}
            onClick={() => onSelect(bp.id)}
            style={{
              cursor: "pointer",
              background: selectedId === bp.id ? "#eff6ff" : "transparent",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            {/* Kimlik & Durum */}
            <td style={{ padding: "0.5rem 0.75rem", color: "#1e40af", fontWeight: selectedId === bp.id ? 600 : 400 }}>
              {bp.name}
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{bp.module_scope ?? "—"}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <span style={{
                display: "inline-block",
                padding: "0.125rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                background: bp.status === "active" ? "#dcfce7" : "#f1f5f9",
                color: bp.status === "active" ? "#166534" : "#475569",
              }}>
                {bp.status}
              </span>
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>v{bp.version}</td>
            {/* Hazırlık */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StyleBlueprintReadinessSummary
                status={bp.status}
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            {/* Girdi Grubu */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StyleBlueprintInputQualitySummary
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StyleBlueprintInputSpecificitySummary
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            {/* Yayın Grubu */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StyleBlueprintPublicationSignalSummary
                status={bp.status}
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StyleBlueprintPublicationOutcomeSummary
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
                status={bp.status}
              />
            </td>
            {/* Tutarlılık Grubu */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StyleBlueprintArtifactConsistencySummary
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <StyleBlueprintTargetOutputConsistencySummary
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            {/* Zaman */}
            <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", fontSize: "0.8rem" }}>
              {new Date(bp.created_at).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
