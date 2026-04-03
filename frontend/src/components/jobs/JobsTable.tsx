import type { JobResponse } from "../../api/jobsApi";
import { formatDuration } from "../../lib/formatDuration";
import { formatDateISO } from "../../lib/formatDate";
import { JobContextSummary } from "./JobContextSummary";
import { JobActionabilitySummary } from "./JobActionabilitySummary";
import { JobOutputRichnessSummary } from "./JobOutputRichnessSummary";
import { JobPublicationOutcomeSummary } from "./JobPublicationOutcomeSummary";
import { JobArtifactConsistencySummary } from "./JobArtifactConsistencySummary";
import { JobInputQualitySummary } from "./JobInputQualitySummary";
import { JobTargetOutputConsistencySummary } from "./JobTargetOutputConsistencySummary";
import { JobPublicationYieldSummary } from "./JobPublicationYieldSummary";
import { JobInputSpecificitySummary } from "./JobInputSpecificitySummary";

const TH_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" };
const TD_STYLE: React.CSSProperties = { padding: "0.5rem 0.75rem" };

interface JobsTableProps {
  jobs: JobResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function JobsTable({ jobs, selectedId, onSelect }: JobsTableProps) {
  if (jobs.length === 0) {
    return <p style={{ color: "#64748b" }}>Henüz kayıtlı job yok.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
          <th style={TH_STYLE}>Modül</th>
          <th style={TH_STYLE}>Bağlam</th>
          <th style={TH_STYLE}>Durum</th>
          <th style={TH_STYLE}>Aksiyon Özeti</th>
          <th style={TH_STYLE}>Mevcut Adım</th>
          <th style={TH_STYLE}>Tekrar</th>
          <th style={TH_STYLE}>Süre</th>
          <th style={TH_STYLE}>Girdi Kalitesi</th>
          <th style={TH_STYLE}>Girdi Özgüllüğü</th>
          <th style={TH_STYLE}>Çıktı Zenginliği</th>
          <th style={TH_STYLE}>Yayın Verimi</th>
          <th style={TH_STYLE}>Yayın Çıktısı</th>
          <th style={TH_STYLE}>Artifact Tutarlılığı</th>
          <th style={TH_STYLE}>Target/Output Tutarlılığı</th>
          <th style={TH_STYLE}>Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((j) => (
          <tr
            key={j.id}
            onClick={() => onSelect(j.id)}
            style={{
              borderBottom: "1px solid #f1f5f9",
              cursor: "pointer",
              background: selectedId === j.id ? "#eff6ff" : "transparent",
            }}
          >
            {/* Kimlik & Durum */}
            <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace" }}>{j.module_type}</td>
            <td style={TD_STYLE}>
              <JobContextSummary moduleType={j.module_type} sourceContextJson={j.source_context_json} />
            </td>
            <td style={TD_STYLE}>{j.status}</td>
            <td style={TD_STYLE}>
              <JobActionabilitySummary
                status={j.status}
                lastError={j.last_error}
                retryCount={j.retry_count}
                currentStepKey={j.current_step_key}
                estimatedRemainingSeconds={j.estimated_remaining_seconds}
              />
            </td>
            <td style={TD_STYLE}>
              {j.current_step_key ?? <em style={{ color: "#94a3b8" }}>—</em>}
            </td>
            <td style={TD_STYLE}>{j.retry_count}</td>
            <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem", color: "#64748b" }}>
              {formatDuration(j.elapsed_total_seconds)}
            </td>
            {/* Girdi Grubu */}
            <td style={TD_STYLE}>
              <JobInputQualitySummary
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            <td style={TD_STYLE}>
              <JobInputSpecificitySummary
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            {/* Çıktı & Yayın Grubu */}
            <td style={TD_STYLE}>
              <JobOutputRichnessSummary
                lastError={j.last_error}
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            <td style={TD_STYLE}>
              <JobPublicationYieldSummary
                status={j.status}
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
                currentStepKey={j.current_step_key}
                lastError={j.last_error}
              />
            </td>
            <td style={TD_STYLE}>
              <JobPublicationOutcomeSummary
                status={j.status}
                lastError={j.last_error}
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            {/* Tutarlılık Grubu */}
            <td style={TD_STYLE}>
              <JobArtifactConsistencySummary
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
                status={j.status}
                currentStepKey={j.current_step_key}
              />
            </td>
            <td style={TD_STYLE}>
              <JobTargetOutputConsistencySummary
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
                status={j.status}
                currentStepKey={j.current_step_key}
                lastError={j.last_error}
              />
            </td>
            {/* Zaman */}
            <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem", color: "#64748b" }}>
              {formatDateISO(j.created_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
