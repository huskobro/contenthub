import type { JobResponse } from "../../api/jobsApi";
import { DurationBadge } from "./DurationBadge";
import { JobProgressBar } from "./JobProgressBar";
import { formatDateISO } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Automation badge helpers
// ---------------------------------------------------------------------------

const RUN_MODE_BADGE: Record<string, { label: string; cls: string }> = {
  full_auto: { label: "Tam Otomatik", cls: "bg-success-light text-success-dark border-success" },
  assisted: { label: "Asistanli", cls: "bg-warning-light text-warning-dark border-warning" },
  manual: { label: "Manuel", cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
};

const TRIGGER_BADGE: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Zamanlanmis", cls: "bg-brand-50 text-brand-700 border-brand-200" },
  manual_click: { label: "Manuel Tetik", cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  manual: { label: "Manuel Tetik", cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  api: { label: "API", cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  retry: { label: "Yeniden Deneme", cls: "bg-warning-light text-warning-dark border-warning" },
  admin_action: { label: "Admin", cls: "bg-brand-50 text-brand-700 border-brand-200" },
};

function AutoBadge({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider",
        cls,
      )}
    >
      {label}
    </span>
  );
}

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
      <JobProgressBar job={job} />
      <Row label="Is Kimlik"><code className="text-sm">{job.id}</code></Row>
      <Row label="Modul Turu">{job.module_type}</Row>
      <Row label="Durum">{job.status}</Row>
      {job.run_mode && (
        <Row label="Calistirma Modu">
          <AutoBadge {...(RUN_MODE_BADGE[job.run_mode] ?? { label: job.run_mode, cls: "bg-neutral-100 text-neutral-600 border-neutral-200" })} />
          {job.auto_advanced && (
            <span className="ml-2 text-[10px] text-neutral-500">auto-advance aktif</span>
          )}
        </Row>
      )}
      {job.trigger_source && (
        <Row label="Tetikleme Kaynagi">
          <AutoBadge {...(TRIGGER_BADGE[job.trigger_source] ?? { label: job.trigger_source, cls: "bg-neutral-100 text-neutral-600 border-neutral-200" })} />
          {job.scheduled_run_id && (
            <span className="ml-2 text-[10px] font-mono text-neutral-400">
              run: {job.scheduled_run_id.slice(0, 8)}
            </span>
          )}
        </Row>
      )}
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
