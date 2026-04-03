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
const TH_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem" };

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
    <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
          {/* Kimlik & Durum */}
          <th style={TH_STYLE}>Başlık</th>
          <th style={TH_STYLE}>Konu</th>
          <th style={TH_STYLE}>Kaynak Modu</th>
          <th style={TH_STYLE}>Stil</th>
          <th style={TH_STYLE}>Durum</th>
          <th style={TH_STYLE}>Dil</th>
          {/* Hazırlık & İçerik */}
          <th style={TH_STYLE}>Hazırlık</th>
          <th style={TH_STYLE}>Artifact</th>
          <th style={TH_STYLE}>Haberler</th>
          <th style={TH_STYLE}>Uygunluk</th>
          <th style={TH_STYLE}>Kaynak Kapsamı</th>
          {/* Girdi */}
          <th style={TH_STYLE}>Girdi Kalitesi</th>
          <th style={TH_STYLE}>Girdi Özgüllüğü</th>
          <th style={TH_STYLE}>İçerik Kalitesi</th>
          {/* Yayın */}
          <th style={TH_STYLE}>Yayın Sinyali</th>
          {/* Tutarlılık */}
          <th style={TH_STYLE}>Artifact Tutarlılığı</th>
          <th style={TH_STYLE}>Target/Output Tutarlılığı</th>
          {/* Zaman */}
          <th style={TH_STYLE}>Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {bulletins.map((b) => (
          <tr
            key={b.id}
            onClick={() => onSelect(b.id)}
            style={{
              cursor: "pointer",
              background: selectedId === b.id ? "#e8f0fe" : undefined,
            }}
          >
            {/* Kimlik & Durum */}
            <td style={{ padding: "0.5rem 0.75rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>{b.title ?? DASH}</td>
            <td style={{ padding: "0.5rem 0.75rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>{b.topic ?? DASH}</td>
            <td style={TD_STYLE}>{b.source_mode ?? DASH}</td>
            <td style={TD_STYLE}>{b.bulletin_style ?? DASH}</td>
            <td style={TD_STYLE}>{b.status ?? DASH}</td>
            <td style={TD_STYLE}>{b.language ?? DASH}</td>
            {/* Hazırlık & İçerik */}
            <td style={TD_STYLE}>
              <NewsBulletinReadinessSummary
                selectedNewsCount={b.selected_news_count}
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
              />
            </td>
            <td style={TD_STYLE}>
              <NewsBulletinArtifactSummary hasScript={b.has_script} hasMetadata={b.has_metadata} />
            </td>
            <td style={TD_STYLE}>
              <NewsBulletinSelectedNewsSummary selectedNewsCount={b.selected_news_count} />
            </td>
            <td style={TD_STYLE}>
              <NewsBulletinEnforcementSummary
                selectedNewsCount={b.selected_news_count}
                hasSelectedNewsWarning={b.has_selected_news_warning}
                selectedNewsWarningCount={b.selected_news_warning_count}
              />
            </td>
            <td style={TD_STYLE}>
              <NewsBulletinSourceCoverageSummary
                selectedNewsCount={b.selected_news_count}
                selectedNewsSourceCount={b.selected_news_source_count}
                hasMissingSource={b.has_selected_news_missing_source}
              />
            </td>
            {/* Girdi */}
            <td style={TD_STYLE}>
              <NewsBulletinInputQualitySummary
                title={b.title}
                topic={b.topic}
                selectedNewsCount={b.selected_news_count}
                selectedNewsSourceCount={b.selected_news_source_count}
                language={b.language}
                bulletinStyle={b.bulletin_style}
              />
            </td>
            <td style={TD_STYLE}>
              <NewsBulletinInputSpecificitySummary
                title={b.title}
                topic={b.topic}
                selectedNewsCount={b.selected_news_count}
                selectedNewsSourceCount={b.selected_news_source_count}
                language={b.language}
                bulletinStyle={b.bulletin_style}
              />
            </td>
            <td style={TD_STYLE}>
              <NewsBulletinSelectedNewsQualitySummary
                selectedNewsCount={b.selected_news_count}
                selectedNewsQualityCompleteCount={b.selected_news_quality_complete_count}
                selectedNewsQualityPartialCount={b.selected_news_quality_partial_count}
                selectedNewsQualityWeakCount={b.selected_news_quality_weak_count}
              />
            </td>
            {/* Yayın */}
            <td style={TD_STYLE}>
              <NewsBulletinPublicationSignalSummary
                selectedNewsCount={b.selected_news_count}
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
                selectedNewsWarningCount={b.selected_news_warning_count}
              />
            </td>
            {/* Tutarlılık */}
            <td style={TD_STYLE}>
              <NewsBulletinArtifactConsistencySummary
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
              />
            </td>
            <td style={TD_STYLE}>
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
            <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8" }}>
              {formatDateShort(b.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
