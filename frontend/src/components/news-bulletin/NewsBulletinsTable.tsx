import { cn } from "../../lib/cn";
import type { NewsBulletinResponse } from "../../api/newsBulletinApi";
import { formatDateShort } from "../../lib/formatDate";
import { NewsBulletinArtifactSummary } from "./NewsBulletinArtifactSummary";
import { NewsBulletinSelectedNewsSummary } from "./NewsBulletinSelectedNewsSummary";
import { NewsBulletinReadinessSummary } from "./NewsBulletinReadinessSummary";
import { NewsBulletinEnforcementSummary } from "./NewsBulletinEnforcementSummary";
import { NewsBulletinSourceCoverageSummary } from "./NewsBulletinSourceCoverageSummary";
import { NewsBulletinPublicationSignalSummary } from "./NewsBulletinPublicationSignalSummary";
import { NewsBulletinSelectedNewsQualitySummary } from "./NewsBulletinSelectedNewsQualitySummary";
import { NewsBulletinArtifactConsistencySummary } from "./NewsBulletinArtifactConsistencySummary";
import { NewsBulletinInputQualitySummary } from "./NewsBulletinInputQualitySummary";
import { NewsBulletinInputSpecificitySummary } from "./NewsBulletinInputSpecificitySummary";
import { NewsBulletinTargetOutputConsistencySummary } from "./NewsBulletinTargetOutputConsistencySummary";

const DASH = "—";

interface Props {
  bulletins: NewsBulletinResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function NewsBulletinsTable({ bulletins, selectedId, onSelect }: Props) {
  if (bulletins.length === 0) {
    return <p>Henüz news bulletin kaydı yok.</p>;
  }

  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="bg-neutral-100 text-left">
          {/* Kimlik & Durum */}
          <th className="px-3 py-2 border-b border-border-subtle">Başlık</th>
          <th className="px-3 py-2 border-b border-border-subtle">Konu</th>
          <th className="px-3 py-2 border-b border-border-subtle">Kaynak Modu</th>
          <th className="px-3 py-2 border-b border-border-subtle">Stil</th>
          <th className="px-3 py-2 border-b border-border-subtle">Durum</th>
          <th className="px-3 py-2 border-b border-border-subtle">Dil</th>
          {/* Hazırlık & İçerik */}
          <th className="px-3 py-2 border-b border-border-subtle">Hazırlık</th>
          <th className="px-3 py-2 border-b border-border-subtle">Artifact</th>
          <th className="px-3 py-2 border-b border-border-subtle">Haberler</th>
          <th className="px-3 py-2 border-b border-border-subtle">Uygunluk</th>
          <th className="px-3 py-2 border-b border-border-subtle">Kaynak Kapsamı</th>
          {/* Girdi */}
          <th className="px-3 py-2 border-b border-border-subtle">Girdi Kalitesi</th>
          <th className="px-3 py-2 border-b border-border-subtle">Girdi Özgüllüğü</th>
          <th className="px-3 py-2 border-b border-border-subtle">İçerik Kalitesi</th>
          {/* Yayın */}
          <th className="px-3 py-2 border-b border-border-subtle">Yayın Sinyali</th>
          {/* Tutarlılık */}
          <th className="px-3 py-2 border-b border-border-subtle">Artifact Tutarlılığı</th>
          <th className="px-3 py-2 border-b border-border-subtle">Target/Output Tutarlılığı</th>
          {/* Zaman */}
          <th className="px-3 py-2 border-b border-border-subtle">Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {bulletins.map((b) => (
          <tr
            key={b.id}
            onClick={() => onSelect(b.id)}
            className={cn(
              "cursor-pointer",
              selectedId === b.id ? "bg-info-light" : "",
            )}
          >
            {/* Kimlik & Durum */}
            <td className="px-3 py-2 break-words [overflow-wrap:anywhere]">{b.title ?? DASH}</td>
            <td className="px-3 py-2 break-words [overflow-wrap:anywhere]">{b.topic ?? DASH}</td>
            <td className="px-3 py-2">{b.source_mode ?? DASH}</td>
            <td className="px-3 py-2">{b.bulletin_style ?? DASH}</td>
            <td className="px-3 py-2">{b.status ?? DASH}</td>
            <td className="px-3 py-2">{b.language ?? DASH}</td>
            {/* Hazırlık & İçerik */}
            <td className="px-3 py-2">
              <NewsBulletinReadinessSummary
                selectedNewsCount={b.selected_news_count}
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
              />
            </td>
            <td className="px-3 py-2">
              <NewsBulletinArtifactSummary hasScript={b.has_script} hasMetadata={b.has_metadata} />
            </td>
            <td className="px-3 py-2">
              <NewsBulletinSelectedNewsSummary selectedNewsCount={b.selected_news_count} />
            </td>
            <td className="px-3 py-2">
              <NewsBulletinEnforcementSummary
                selectedNewsCount={b.selected_news_count}
                hasSelectedNewsWarning={b.has_selected_news_warning}
                selectedNewsWarningCount={b.selected_news_warning_count}
              />
            </td>
            <td className="px-3 py-2">
              <NewsBulletinSourceCoverageSummary
                selectedNewsCount={b.selected_news_count}
                selectedNewsSourceCount={b.selected_news_source_count}
                hasMissingSource={b.has_selected_news_missing_source}
              />
            </td>
            {/* Girdi */}
            <td className="px-3 py-2">
              <NewsBulletinInputQualitySummary
                title={b.title}
                topic={b.topic}
                selectedNewsCount={b.selected_news_count}
                selectedNewsSourceCount={b.selected_news_source_count}
                language={b.language}
                bulletinStyle={b.bulletin_style}
              />
            </td>
            <td className="px-3 py-2">
              <NewsBulletinInputSpecificitySummary
                title={b.title}
                topic={b.topic}
                selectedNewsCount={b.selected_news_count}
                selectedNewsSourceCount={b.selected_news_source_count}
                language={b.language}
                bulletinStyle={b.bulletin_style}
              />
            </td>
            <td className="px-3 py-2">
              <NewsBulletinSelectedNewsQualitySummary
                selectedNewsCount={b.selected_news_count}
                selectedNewsQualityCompleteCount={b.selected_news_quality_complete_count}
                selectedNewsQualityPartialCount={b.selected_news_quality_partial_count}
                selectedNewsQualityWeakCount={b.selected_news_quality_weak_count}
              />
            </td>
            {/* Yayın */}
            <td className="px-3 py-2">
              <NewsBulletinPublicationSignalSummary
                selectedNewsCount={b.selected_news_count}
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
                selectedNewsWarningCount={b.selected_news_warning_count}
              />
            </td>
            {/* Tutarlılık */}
            <td className="px-3 py-2">
              <NewsBulletinArtifactConsistencySummary
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
              />
            </td>
            <td className="px-3 py-2">
              <NewsBulletinTargetOutputConsistencySummary
                title={b.title}
                topic={b.topic}
                selectedNewsCount={b.selected_news_count}
                language={b.language}
                bulletinStyle={b.bulletin_style}
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
              />
            </td>
            {/* Zaman */}
            <td className="px-3 py-2 text-neutral-500">
              {formatDateShort(b.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
