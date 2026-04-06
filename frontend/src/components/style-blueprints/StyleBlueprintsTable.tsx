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
import { cn } from "../../lib/cn";

const DASH = "—";

interface StyleBlueprintsTableProps {
  blueprints: StyleBlueprintResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function StyleBlueprintsTable({ blueprints, selectedId, onSelect }: StyleBlueprintsTableProps) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="bg-neutral-100 text-left">
          <th className="py-2 px-3 border-b border-border-subtle">Ad</th>
          <th className="py-2 px-3 border-b border-border-subtle">Modül</th>
          <th className="py-2 px-3 border-b border-border-subtle">Durum</th>
          <th className="py-2 px-3 border-b border-border-subtle">Sürüm</th>
          <th className="py-2 px-3 border-b border-border-subtle">Hazırlık</th>
          <th className="py-2 px-3 border-b border-border-subtle">Girdi Kalitesi</th>
          <th className="py-2 px-3 border-b border-border-subtle">Girdi Özgüllüğü</th>
          <th className="py-2 px-3 border-b border-border-subtle">Yayın Sinyali</th>
          <th className="py-2 px-3 border-b border-border-subtle">Yayın Çıktısı</th>
          <th className="py-2 px-3 border-b border-border-subtle">Artifact Tutarlılığı</th>
          <th className="py-2 px-3 border-b border-border-subtle">Target/Output Tutarlılığı</th>
          <th className="py-2 px-3 border-b border-border-subtle">Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {blueprints.map((bp) => (
          <tr
            key={bp.id}
            onClick={() => onSelect(bp.id)}
            className={cn(
              "cursor-pointer border-b border-neutral-100",
              selectedId === bp.id ? "bg-info-light" : "bg-transparent"
            )}
          >
            <td className={cn("py-2 px-3 text-brand-700 break-words [overflow-wrap:anywhere]", selectedId === bp.id ? "font-semibold" : "font-normal")}>
              {bp.name ?? DASH}
            </td>
            <td className="py-2 px-3 text-neutral-600">{bp.module_scope ?? DASH}</td>
            <td className="py-2 px-3">
              <span className={cn(
                "inline-block py-0.5 px-2 rounded-full text-sm",
                bp.status === "active" ? "bg-success-light text-success-text" : "bg-neutral-100 text-neutral-700"
              )}>
                {bp.status ?? DASH}
              </span>
            </td>
            <td className="py-2 px-3 text-neutral-600">v{safeNumber(bp.version, 0)}</td>
            <td className="py-2 px-3">
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
            <td className="py-2 px-3">
              <StyleBlueprintInputQualitySummary
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            <td className="py-2 px-3">
              <StyleBlueprintInputSpecificitySummary
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            <td className="py-2 px-3">
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
            <td className="py-2 px-3">
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
            <td className="py-2 px-3">
              <StyleBlueprintArtifactConsistencySummary
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            <td className="py-2 px-3">
              <StyleBlueprintTargetOutputConsistencySummary
                visualRulesJson={bp.visual_rules_json}
                motionRulesJson={bp.motion_rules_json}
                layoutRulesJson={bp.layout_rules_json}
                subtitleRulesJson={bp.subtitle_rules_json}
                thumbnailRulesJson={bp.thumbnail_rules_json}
                previewStrategyJson={bp.preview_strategy_json}
              />
            </td>
            <td className="py-2 px-3 text-neutral-500 text-base">
              {formatDateShort(bp.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
