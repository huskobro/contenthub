import type { UsedNewsResponse } from "../../api/usedNewsApi";
import { formatDateShort } from "../../lib/formatDate";
import { UsedNewsStateSummary } from "./UsedNewsStateSummary";
import { UsedNewsSourceContextSummary } from "./UsedNewsSourceContextSummary";
import { UsedNewsPublicationLinkageSummary } from "./UsedNewsPublicationLinkageSummary";
import { UsedNewsTargetResolutionSummary } from "./UsedNewsTargetResolutionSummary";
import { UsedNewsArtifactConsistencySummary } from "./UsedNewsArtifactConsistencySummary";
import { UsedNewsInputQualitySummary } from "./UsedNewsInputQualitySummary";
import { UsedNewsInputSpecificitySummary } from "./UsedNewsInputSpecificitySummary";
import { UsedNewsTargetOutputConsistencySummary } from "./UsedNewsTargetOutputConsistencySummary";
import { cn } from "../../lib/cn";

interface Props {
  records: UsedNewsResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UsedNewsTable({ records, selectedId, onSelect }: Props) {
  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="bg-neutral-100 text-left">
          <th className="py-2 px-3 border-b border-border-subtle">Haber ID</th>
          <th className="py-2 px-3 border-b border-border-subtle">Kullanım Tipi</th>
          <th className="py-2 px-3 border-b border-border-subtle">Durum</th>
          <th className="py-2 px-3 border-b border-border-subtle">Kaynak Bağlamı</th>
          <th className="py-2 px-3 border-b border-border-subtle">Girdi Kalitesi</th>
          <th className="py-2 px-3 border-b border-border-subtle">Girdi Özgüllüğü</th>
          <th className="py-2 px-3 border-b border-border-subtle">Hedef Modül</th>
          <th className="py-2 px-3 border-b border-border-subtle">Hedef Varlık</th>
          <th className="py-2 px-3 border-b border-border-subtle">Hedef Çözümü</th>
          <th className="py-2 px-3 border-b border-border-subtle">Yayın Bağı</th>
          <th className="py-2 px-3 border-b border-border-subtle">Artifact Tutarlılığı</th>
          <th className="py-2 px-3 border-b border-border-subtle">Target/Output Tutarlılığı</th>
          <th className="py-2 px-3 border-b border-border-subtle">Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr
            key={record.id}
            onClick={() => onSelect(record.id)}
            className={cn(
              "cursor-pointer border-b border-neutral-100",
              selectedId === record.id ? "bg-info-light" : "bg-transparent"
            )}
          >
            <td className={cn("py-2 px-3 font-mono text-base text-brand-700", selectedId === record.id ? "font-semibold" : "font-normal")}>
              {record.news_item_id}
            </td>
            <td className="py-2 px-3 text-neutral-600">{record.usage_type}</td>
            <td className="py-2 px-3">
              <UsedNewsStateSummary usageType={record.usage_type} targetModule={record.target_module} targetEntityId={record.target_entity_id} />
            </td>
            <td className="py-2 px-3">
              <UsedNewsSourceContextSummary newsItemId={record.news_item_id} hasNewsItemSource={record.has_news_item_source} hasNewsItemScanReference={record.has_news_item_scan_reference} />
            </td>
            <td className="py-2 px-3">
              <UsedNewsInputQualitySummary newsItemId={record.news_item_id} usageType={record.usage_type} targetModule={record.target_module} targetEntityId={record.target_entity_id} usageContext={record.usage_context} notes={record.notes} />
            </td>
            <td className="py-2 px-3">
              <UsedNewsInputSpecificitySummary newsItemId={record.news_item_id} usageType={record.usage_type} targetModule={record.target_module} targetEntityId={record.target_entity_id} usageContext={record.usage_context} notes={record.notes} />
            </td>
            <td className="py-2 px-3 text-neutral-600">{record.target_module}</td>
            <td className="py-2 px-3 text-neutral-500 font-mono text-base">
              {record.target_entity_id ?? "—"}
            </td>
            <td className="py-2 px-3">
              <UsedNewsTargetResolutionSummary targetModule={record.target_module} targetEntityId={record.target_entity_id} hasTargetResolved={record.has_target_resolved} />
            </td>
            <td className="py-2 px-3">
              <UsedNewsPublicationLinkageSummary usageType={record.usage_type} targetEntityId={record.target_entity_id} />
            </td>
            <td className="py-2 px-3">
              <UsedNewsArtifactConsistencySummary hasNewsItemSource={record.has_news_item_source} hasNewsItemScanReference={record.has_news_item_scan_reference} hasTargetResolved={record.has_target_resolved} targetModule={record.target_module} targetEntityId={record.target_entity_id} />
            </td>
            <td className="py-2 px-3">
              <UsedNewsTargetOutputConsistencySummary newsItemId={record.news_item_id} usageType={record.usage_type} usageContext={record.usage_context} notes={record.notes} hasTargetResolved={record.has_target_resolved} targetModule={record.target_module} targetEntityId={record.target_entity_id} />
            </td>
            <td className="py-2 px-3 text-neutral-500 text-base">
              {formatDateShort(record.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
