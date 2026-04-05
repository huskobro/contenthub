import type { JobResponse } from "../../api/jobsApi";
import { DurationBadge } from "./DurationBadge";
import { formatDateISO } from "../../lib/formatDate";
import { colors, radius, typography } from "../design-system/tokens";

interface JobOverviewPanelProps {
  job: JobResponse;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", padding: "0.4rem 0", borderBottom: `1px solid ${colors.neutral[100]}` }}>
      <span style={{ width: "220px", flexShrink: 0, color: colors.neutral[600], fontSize: typography.size.base }}>
        {label}
      </span>
      <span style={{ fontSize: typography.size.md, wordBreak: "break-word", overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

const em = <em style={{ color: colors.neutral[500] }}>—</em>;

export function JobOverviewPanel({ job }: JobOverviewPanelProps) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.md,
        background: colors.neutral[50],
        padding: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <h3 style={{ margin: "0 0 0.25rem", fontSize: typography.size.lg }} data-testid="job-overview-heading">Genel Bilgi</h3>
      <p
        style={{
          margin: "0 0 0.75rem",
          fontSize: typography.size.sm,
          color: colors.neutral[500],
          lineHeight: 1.4,
        }}
        data-testid="job-overview-publish-note"
      >
        Isin tamamlanma durumu yayin hazirligini belirler. Basarili isler
        yayin adimina gecebilir. Kuyruk durumu ve retry bilgisi asagida gorunur.
      </p>
      <Row label="Is Kimlik"><code style={{ fontSize: typography.size.sm }}>{job.id}</code></Row>
      <Row label="Modul Turu">{job.module_type}</Row>
      <Row label="Durum">{job.status}</Row>
      <Row label="Aktif Adim">{job.current_step_key ?? em}</Row>
      <Row label="Yeniden Deneme Sayisi">{job.retry_count}</Row>
      <Row label="Sahip">{job.owner_id ?? em}</Row>
      <Row label="Sablon">{job.template_id ?? em}</Row>
      <Row label="Calisma Alani">{job.workspace_path ?? em}</Row>
      <Row label="Toplam Gecen Sure">
        <DurationBadge seconds={job.elapsed_total_seconds} />
      </Row>
      <Row label="Tahmini Kalan">
        <DurationBadge seconds={job.estimated_remaining_seconds} approximate />
      </Row>
      <Row label="Son Hata">
        {job.last_error ? (
          <span style={{ color: colors.error.base }}>{job.last_error}</span>
        ) : em}
      </Row>
      <Row label="Olusturulma">{formatDateISO(job.created_at, em)}</Row>
      <Row label="Baslanma">{formatDateISO(job.started_at, em)}</Row>
      <Row label="Tamamlanma">{formatDateISO(job.finished_at, em)}</Row>
    </div>
  );
}
