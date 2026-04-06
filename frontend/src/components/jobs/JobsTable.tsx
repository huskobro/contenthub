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
import { cn } from "../../lib/cn";

interface JobsTableProps {
  jobs: JobResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Index of keyboard-active row (for roving tabindex highlight). Optional. */
  activeIndex?: number;
}

export function JobsTable({ jobs, selectedId, onSelect, activeIndex }: JobsTableProps) {
  if (jobs.length === 0) {
    return <p className="text-neutral-600">Henüz kayıtlı job yok.</p>;
  }

  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-md">
      <thead>
        <tr className="bg-neutral-100 text-left">
          <th className="px-3 py-2 border-b border-border">Modül</th>
          <th className="px-3 py-2 border-b border-border">Bağlam</th>
          <th className="px-3 py-2 border-b border-border">Durum</th>
          <th className="px-3 py-2 border-b border-border">Aksiyon Özeti</th>
          <th className="px-3 py-2 border-b border-border">Mevcut Adım</th>
          <th className="px-3 py-2 border-b border-border">Tekrar</th>
          <th className="px-3 py-2 border-b border-border">Süre</th>
          <th className="px-3 py-2 border-b border-border">Girdi Kalitesi</th>
          <th className="px-3 py-2 border-b border-border">Girdi Özgüllüğü</th>
          <th className="px-3 py-2 border-b border-border">Çıktı Zenginliği</th>
          <th className="px-3 py-2 border-b border-border">Yayın Verimi</th>
          <th className="px-3 py-2 border-b border-border">Yayın Çıktısı</th>
          <th className="px-3 py-2 border-b border-border">Artifact Tutarlılığı</th>
          <th className="px-3 py-2 border-b border-border">Target/Output Tutarlılığı</th>
          <th className="px-3 py-2 border-b border-border">Oluşturulma</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((j, idx) => {
          const isActive = activeIndex === idx;
          const isSelected = selectedId === j.id;
          return (
          <tr
            key={j.id}
            onClick={() => onSelect(j.id)}
            tabIndex={isActive ? 0 : -1}
            data-keyboard-active={isActive || undefined}
            className={cn(
              "border-b border-neutral-100 cursor-pointer",
              isSelected && "bg-info-light",
              !isSelected && isActive && "bg-neutral-50",
              isActive && "outline outline-2 -outline-offset-2 outline-brand-500/25",
            )}
          >
            <td className="px-3 py-2 font-mono">{j.module_type}</td>
            <td className="px-3 py-2">
              <JobContextSummary moduleType={j.module_type} sourceContextJson={j.source_context_json} />
            </td>
            <td className="px-3 py-2">{j.status}</td>
            <td className="px-3 py-2">
              <JobActionabilitySummary
                status={j.status}
                lastError={j.last_error}
                retryCount={j.retry_count}
                currentStepKey={j.current_step_key}
                estimatedRemainingSeconds={j.estimated_remaining_seconds}
              />
            </td>
            <td className="px-3 py-2">
              {j.current_step_key ?? <em className="text-neutral-500">—</em>}
            </td>
            <td className="px-3 py-2">{j.retry_count}</td>
            <td className="px-3 py-2 text-base text-neutral-600">
              {formatDuration(j.elapsed_total_seconds)}
            </td>
            <td className="px-3 py-2">
              <JobInputQualitySummary
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            <td className="px-3 py-2">
              <JobInputSpecificitySummary
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            <td className="px-3 py-2">
              <JobOutputRichnessSummary
                lastError={j.last_error}
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            <td className="px-3 py-2">
              <JobPublicationYieldSummary
                status={j.status}
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
                currentStepKey={j.current_step_key}
                lastError={j.last_error}
              />
            </td>
            <td className="px-3 py-2">
              <JobPublicationOutcomeSummary
                status={j.status}
                lastError={j.last_error}
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
              />
            </td>
            <td className="px-3 py-2">
              <JobArtifactConsistencySummary
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
                status={j.status}
                currentStepKey={j.current_step_key}
              />
            </td>
            <td className="px-3 py-2">
              <JobTargetOutputConsistencySummary
                sourceContextJson={j.source_context_json}
                templateId={j.template_id}
                workspacePath={j.workspace_path}
                status={j.status}
                currentStepKey={j.current_step_key}
                lastError={j.last_error}
              />
            </td>
            <td className="px-3 py-2 text-base text-neutral-600">
              {formatDateISO(j.created_at)}
            </td>
          </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
