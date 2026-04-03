import type { StyleBlueprintResponse } from "../../api/styleBlueprintsApi";
import { safeNumber } from "../../lib/safeNumber";
import { formatDateShort } from "../../lib/formatDate";
import { StyleBlueprintReadinessSummary } from "./StyleBlueprintReadinessSummary";
import { StyleBlueprintPublicationSignalSummary } from "./StyleBlueprintPublicationSignalSummary";
import { StyleBlueprintArtifactConsistencySummary } from "./StyleBlueprintArtifactConsistencySummary";
import { StyleBlueprintInputQualitySummary } from "./StyleBlueprintInputQualitySummary";
import { StyleBlueprintInputSpecificitySummary } from "./StyleBlueprintInputSpecificitySummary";
import { StyleBlueprintTargetOutputConsistencySummary } from "./StyleBlueprintTargetOutputConsistencySummary";
import { StyleBlueprintPublicationOutcomeSummary } from "./StyleBlueprintPublicationOutcomeSummary";

const DASH = "—";
const TH_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem" };

interface StyleBlueprintsTableProps {
  blueprints: StyleBlueprintResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function StyleBlueprintsTable({ blueprints, selectedId, onSelect }: StyleBlueprintsTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
          <th style={TH_STYLE}>Ad</th>
          <th style={TH_STYLE}>Modül</th>
          <th style={TH_STYLE}>Durum</th>
          <th style={TH_STYLE}>Sürüm</th>
          <th style={TH_STYLE}>Hazırlık</th>
          <th style={TH_STYLE}>Girdi Kalitesi</th>
          <th style={TH_STYLE}>Girdi Özgüllüğü</th>
          <th style={TH_STYLE}>Yayın Sinyali</th>
          <th style={TH_STYLE}>Yayın Çıktısı</th>
          <th style={TH_STYLE}>Artifact Tutarlılığı</th>
          <th style={TH_STYLE}>Target/Output Tutarlılığı</th>
          <th style={TH_STYLE}>Oluşturulma</th>
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
            <td style={{ padding: "0.5rem 0.75rem", color: "#1e40af", fontWeight: selectedId === bp.id ? 600 : 400, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {bp.name ?? DASH}
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{bp.module_scope ?? DASH}</td>
            <td style={TD_STYLE}>
              <span style={{
                display: "inline-block",
                padding: "0.125rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                background: bp.status === "active" ? "#dcfce7" : "#f1f5f9",
                color: bp.status === "active" ? "#166534" : "#475569",
              }}>
                {bp.status ?? DASH}
              </span>
            </td>
            <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>v{safeNumber(bp.version, 0)}</td>
            {/* Hazırlık */}
            <td style={TD_STYLE}>
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
            <td style={TD_STYLE}>
              <StyleBlueprintInputQualitySummary
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            <td style={TD_STYLE}>
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
            <td style={TD_STYLE}>
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
            <td style={TD_STYLE}>
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
            <td style={TD_STYLE}>
              <StyleBlueprintArtifactConsistencySummary
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            <td style={TD_STYLE}>
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
              {formatDateShort(bp.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
