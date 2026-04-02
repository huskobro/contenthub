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
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Title</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Topic</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Source Mode</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Style</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Status</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Language</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Artifacts</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Haberler</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Hazırlık</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Enforcement</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Kaynak Kapsamı</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Yayın Sinyali</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>İçerik Kalitesi</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Girdi Kalitesi</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Artifact Tutarlılığı</th>
          <th style={{ textAlign: "left", padding: "6px 8px" }}>Created</th>
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
            <td style={{ padding: "6px 8px" }}>{b.title ?? "—"}</td>
            <td style={{ padding: "6px 8px" }}>{b.topic}</td>
            <td style={{ padding: "6px 8px" }}>{b.source_mode ?? "—"}</td>
            <td style={{ padding: "6px 8px" }}>{b.bulletin_style ?? "—"}</td>
            <td style={{ padding: "6px 8px" }}>{b.status}</td>
            <td style={{ padding: "6px 8px" }}>{b.language ?? "—"}</td>
            <td style={{ padding: "6px 8px" }}>
              <NewsBulletinArtifactSummary hasScript={b.has_script} hasMetadata={b.has_metadata} />
            </td>
            <td style={{ padding: "6px 8px" }}>
              <NewsBulletinSelectedNewsSummary selectedNewsCount={b.selected_news_count} />
            </td>
            <td style={{ padding: "6px 8px" }}>
              <NewsBulletinReadinessSummary
                selectedNewsCount={b.selected_news_count}
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
              />
            </td>
            <td style={{ padding: "6px 8px" }}>
              <NewsBulletinEnforcementSummary
                selectedNewsCount={b.selected_news_count}
                hasSelectedNewsWarning={b.has_selected_news_warning}
                selectedNewsWarningCount={b.selected_news_warning_count}
              />
            </td>
            <td style={{ padding: "6px 8px" }}>
              <NewsBulletinSourceCoverageSummary
                selectedNewsCount={b.selected_news_count}
                selectedNewsSourceCount={b.selected_news_source_count}
                hasMissingSource={b.has_selected_news_missing_source}
              />
            </td>
            <td style={{ padding: "6px 8px" }}>
              <NewsBulletinPublicationSignalSummary
                selectedNewsCount={b.selected_news_count}
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
                selectedNewsWarningCount={b.selected_news_warning_count}
              />
            </td>
            <td style={{ padding: "6px 8px" }}>
              <NewsBulletinSelectedNewsQualitySummary
                selectedNewsCount={b.selected_news_count}
                selectedNewsQualityCompleteCount={b.selected_news_quality_complete_count}
                selectedNewsQualityPartialCount={b.selected_news_quality_partial_count}
                selectedNewsQualityWeakCount={b.selected_news_quality_weak_count}
              />
            </td>
            <td style={{ padding: "6px 8px" }}>
              <NewsBulletinInputQualitySummary
                title={b.title}
                topic={b.topic}
                selectedNewsCount={b.selected_news_count}
                selectedNewsSourceCount={b.selected_news_source_count}
                language={b.language}
                bulletinStyle={b.bulletin_style}
              />
            </td>
            <td style={{ padding: "6px 8px" }}>
              <NewsBulletinArtifactConsistencySummary
                hasScript={b.has_script}
                hasMetadata={b.has_metadata}
              />
            </td>
            <td style={{ padding: "6px 8px" }}>
              {new Date(b.created_at).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
