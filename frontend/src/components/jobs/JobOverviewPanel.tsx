import type { JobResponse } from "../../api/jobsApi";
import { DurationBadge } from "./DurationBadge";
import { formatDateISO } from "../../lib/formatDate";

interface JobOverviewPanelProps {
  job: JobResponse;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-neutral-100">
      <span className="w-[220px] shrink-0 text-neutral-600 text-base">
        {label}
      </span>
      <span className="text-md break-words [overflow-wrap:anywhere]">{children}</span>
    </div>
  );
}

const em = <em className="text-neutral-500">—</em>;

export function JobOverviewPanel({ job }: JobOverviewPanelProps) {
  return (
    <div className="border border-border-subtle rounded-md bg-neutral-50 p-4 mb-6">
      <h3 className="m-0 mb-1 text-lg" data-testid="job-overview-heading">Genel Bilgi</h3>
      <p
        className="m-0 mb-3 text-sm text-neutral-500 leading-snug"
        data-testid="job-overview-publish-note"
      >
        Isin tamamlanma durumu yayin hazirligini belirler. Basarili isler
        yayin adimina gecebilir. Kuyruk durumu ve retry bilgisi asagida gorunur.
      </p>
      <Row label="Is Kimlik"><code className="text-sm">{job.id}</code></Row>
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
          <span className="text-error">{job.last_error}</span>
        ) : em}
      </Row>
      <Row label="Olusturulma">{formatDateISO(job.created_at, em)}</Row>
      <Row label="Baslanma">{formatDateISO(job.started_at, em)}</Row>
      <Row label="Tamamlanma">{formatDateISO(job.finished_at, em)}</Row>
    </div>
  );
}
