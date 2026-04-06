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
import { cn } from "../../lib/cn";

const DASH = "—";

interface TemplatesTableProps {
  templates: TemplateResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TemplatesTable({ templates, selectedId, onSelect }: TemplatesTableProps) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="bg-neutral-100 text-left">
          <th className="py-2 px-3 border-b border-border-subtle">Ad</th>
          <th className="py-2 px-3 border-b border-border-subtle">Tür</th>
          <th className="py-2 px-3 border-b border-border-subtle">Sahip</th>
          <th className="py-2 px-3 border-b border-border-subtle">Modül</th>
          <th className="py-2 px-3 border-b border-border-subtle">Durum</th>
          <th className="py-2 px-3 border-b border-border-subtle">Sürüm</th>
          <th className="py-2 px-3 border-b border-border-subtle">Stil Bağları</th>
          <th className="py-2 px-3 border-b border-border-subtle">Hazırlık</th>
          <th className="py-2 px-3 border-b border-border-subtle">Girdi Kalitesi</th>
          <th className="py-2 px-3 border-b border-border-subtle">Girdi Özgüllüğü</th>
          <th className="py-2 px-3 border-b border-border-subtle">Yayın Sinyali</th>
          <th className="py-2 px-3 border-b border-border-subtle">Yayın Çıktısı</th>
          <th className="py-2 px-3 border-b border-border-subtle">Artifact Tutarlılığı</th>
          <th className="py-2 px-3 border-b border-border-subtle">Target/Output Tutarlılığı</th>
        </tr>
      </thead>
      <tbody>
        {templates.map((t) => (
          <tr
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={cn(
              "cursor-pointer border-b border-neutral-100",
              selectedId === t.id ? "bg-info-light" : "bg-transparent"
            )}
          >
            <td className={cn("py-2 px-3 text-brand-700 break-words", selectedId === t.id ? "font-semibold" : "font-normal")} style={{ overflowWrap: "anywhere" }}>
              {t.name ?? DASH}
            </td>
            <td className="py-2 px-3 text-neutral-800">{t.template_type ?? DASH}</td>
            <td className="py-2 px-3 text-neutral-800">{t.owner_scope ?? DASH}</td>
            <td className="py-2 px-3 text-neutral-600">{t.module_scope ?? DASH}</td>
            <td className="py-2 px-3">
              <span className={cn(
                "inline-block py-0.5 px-2 rounded-full text-sm",
                t.status === "active" ? "bg-success-light text-success-text" : "bg-neutral-100 text-neutral-700"
              )}>
                {t.status ?? DASH}
              </span>
            </td>
            <td className="py-2 px-3 text-neutral-600">v{safeNumber(t.version, 0)}</td>
            <td className="py-2 px-3">
              <TemplateStyleLinkSummary styleLinkCount={t.style_link_count} primaryLinkRole={t.primary_link_role} />
            </td>
            <td className="py-2 px-3">
              <TemplateReadinessSummary templateType={t.template_type} status={t.status} styleProfileJson={t.style_profile_json} contentRulesJson={t.content_rules_json} publishProfileJson={t.publish_profile_json} styleLinkCount={t.style_link_count} />
            </td>
            <td className="py-2 px-3">
              <TemplateInputQualitySummary templateType={t.template_type} styleProfileJson={t.style_profile_json} contentRulesJson={t.content_rules_json} publishProfileJson={t.publish_profile_json} />
            </td>
            <td className="py-2 px-3">
              <TemplateInputSpecificitySummary templateType={t.template_type} styleProfileJson={t.style_profile_json} contentRulesJson={t.content_rules_json} publishProfileJson={t.publish_profile_json} styleLinkCount={t.style_link_count} primaryLinkRole={t.primary_link_role} />
            </td>
            <td className="py-2 px-3">
              <TemplatePublicationSignalSummary templateType={t.template_type} status={t.status} styleProfileJson={t.style_profile_json} contentRulesJson={t.content_rules_json} publishProfileJson={t.publish_profile_json} styleLinkCount={t.style_link_count} />
            </td>
            <td className="py-2 px-3">
              <TemplatePublicationOutcomeSummary templateType={t.template_type} styleProfileJson={t.style_profile_json} contentRulesJson={t.content_rules_json} publishProfileJson={t.publish_profile_json} styleLinkCount={t.style_link_count} status={t.status} />
            </td>
            <td className="py-2 px-3">
              <TemplateArtifactConsistencySummary templateType={t.template_type} styleProfileJson={t.style_profile_json} contentRulesJson={t.content_rules_json} publishProfileJson={t.publish_profile_json} styleLinkCount={t.style_link_count} />
            </td>
            <td className="py-2 px-3">
              <TemplateTargetOutputConsistencySummary templateType={t.template_type} styleProfileJson={t.style_profile_json} contentRulesJson={t.content_rules_json} publishProfileJson={t.publish_profile_json} styleLinkCount={t.style_link_count} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
