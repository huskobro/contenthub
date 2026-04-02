import type { NewsBulletinResponse } from "../../api/newsBulletinApi";
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
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Başlık</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Konu</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Kaynak Modu</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Stil</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Durum</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Dil</th>
          {/* Hazırlık & İçerik */}
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Hazırlık</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Artifact</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Haberler</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Uygunluk</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Kaynak Kapsamı</th>
          {/* Girdi */}
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Kalitesi</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Özgüllüğü</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>İçerik Kalitesi</th>
          {/* Yayın */}
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Sinyali</th>
          {/* Tutarlılık */}
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Artifact Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Target/Output Tutarlılığı</th>
          {/* Zaman */}
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Oluşturulma</th>
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
            <td style={{ padding: "0.5rem 0.75rem" }}>{b.title ?? "—"}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>{b.topic}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>{b.source_mode ?? "—"}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>{b.bulletin_style ?? "—"}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>{b.status}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>{b.language ?? "—"}</td>
            {/* Hazırlık & İçerik */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <NewsBulletinReadinessSummary
                selectedNewsCount={b.selected_news_count}
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <NewsBulletinArtifactSummary hasScript={b.has_script} hasMetadata={b.has_metadata} />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <NewsBulletinSelectedNewsSummary selectedNewsCount={b.selected_news_count} />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <NewsBulletinEnforcementSummary
                selectedNewsCount={b.selected_news_count}
                hasSelectedNewsWarning={b.has_selected_news_warning}
                selectedNewsWarningCount={b.selected_news_warning_count}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <NewsBulletinSourceCoverageSummary
                selectedNewsCount={b.selected_news_count}
                selectedNewsSourceCount={b.selected_news_source_count}
                hasMissingSource={b.has_selected_news_missing_source}
              />
            </td>
            {/* Girdi */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <NewsBulletinInputQualitySummary
                title={b.title}
                topic={b.topic}
                selectedNewsCount={b.selected_news_count}
                selectedNewsSourceCount={b.selected_news_source_count}
                language={b.language}
                bulletinStyle={b.bulletin_style}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <NewsBulletinInputSpecificitySummary
                title={b.title}
                topic={b.topic}
                selectedNewsCount={b.selected_news_count}
                selectedNewsSourceCount={b.selected_news_source_count}
                language={b.language}
                bulletinStyle={b.bulletin_style}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <NewsBulletinSelectedNewsQualitySummary
                selectedNewsCount={b.selected_news_count}
                selectedNewsQualityCompleteCount={b.selected_news_quality_complete_count}
                selectedNewsQualityPartialCount={b.selected_news_quality_partial_count}
                selectedNewsQualityWeakCount={b.selected_news_quality_weak_count}
              />
            </td>
            {/* Yayın */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <NewsBulletinPublicationSignalSummary
                selectedNewsCount={b.selected_news_count}
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
                selectedNewsWarningCount={b.selected_news_warning_count}
              />
            </td>
            {/* Tutarlılık */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <NewsBulletinArtifactConsistencySummary
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
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
              {new Date(b.created_at).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
