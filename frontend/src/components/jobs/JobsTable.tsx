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
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Modül</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Bağlam</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Durum</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Aksiyon Özeti</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Mevcut Adım</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Tekrar</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Süre</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Kalitesi</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Girdi Özgüllüğü</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Çıktı Zenginliği</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Verimi</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Yayın Çıktısı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Artifact Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Target/Output Tutarlılığı</th>
          <th style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>Oluşturulma</th>
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
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <JobContextSummary moduleType={j.module_type} sourceContextJson={j.source_context_json} />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>{j.status}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <JobActionabilitySummary
                status={j.status}
                lastError={j.last_error}
                retryCount={j.retry_count}
                currentStepKey={j.current_step_key}
                estimatedRemainingSeconds={j.estimated_remaining_seconds}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              {j.current_step_key ?? <em style={{ color: "#94a3b8" }}>—</em>}
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>{j.retry_count}</td>
            <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem", color: "#64748b" }}>
              {formatDuration(j.elapsed_total_seconds)}
            </td>
            {/* Girdi Grubu */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <JobInputQualitySummary
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <JobInputSpecificitySummary
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            {/* Çıktı & Yayın Grubu */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <JobOutputRichnessSummary
                lastError={j.last_error}
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <JobPublicationYieldSummary
                status={j.status}
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
                currentStepKey={j.current_step_key}
                lastError={j.last_error}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <JobPublicationOutcomeSummary
                status={j.status}
                lastError={j.last_error}
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            {/* Tutarlılık Grubu */}
            <td style={{ padding: "0.5rem 0.75rem" }}>
              <JobArtifactConsistencySummary
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
                status={j.status}
                currentStepKey={j.current_step_key}
              />
            </td>
            <td style={{ padding: "0.5rem 0.75rem" }}>
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
