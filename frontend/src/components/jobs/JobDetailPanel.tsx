import { useJobDetail } from "../../hooks/useJobDetail";
import { useJobContentRef } from "../../hooks/useJobContentRef";
import { JobStepsList } from "./JobStepsList";
import { DurationBadge } from "./DurationBadge";
import { formatDateISO } from "../../lib/formatDate";
import { Link } from "react-router-dom";

interface JobDetailPanelProps {
  selectedId: string | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-2 border-b border-neutral-100">
      <span className="w-[200px] shrink-0 text-neutral-600 text-base font-medium">
        {label}
      </span>
      <span className="text-md break-words [overflow-wrap:anywhere] text-neutral-800">{children}</span>
    </div>
  );
}

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
  product_review: "Ürün Değerlendirme",
  educational_video: "Eğitim Videosu",
  howto_video: "Nasıl Yapılır Videosu",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Kuyrukta",
  running: "Çalışıyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  cancelled: "İptal Edildi",
  retrying: "Yeniden Deneniyor",
  waiting: "Bekliyor",
};

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    completed: "bg-success-light text-success-text",
    failed: "bg-error-light text-error-text",
    retrying: "bg-warning-light text-warning-text",
    queued: "bg-neutral-100 text-neutral-600",
    running: "bg-info-light text-info-text",
    waiting: "bg-neutral-100 text-neutral-500",
    cancelled: "bg-neutral-100 text-neutral-500",
  };
  return map[status] ?? "bg-neutral-100 text-neutral-600";
}

export function JobDetailPanel({ selectedId }: JobDetailPanelProps) {
  const { data, isLoading, isError, error } = useJobDetail(selectedId);
  const { data: contentRef } = useJobContentRef(selectedId);

  if (!selectedId) {
    return (
      <div className="text-neutral-500 p-4">
        Detay görmek için bir iş seçin.
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4 text-neutral-600">Yükleniyor...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-error">
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </div>
    );
  }

  if (!data) return null;

  const em = <em className="text-neutral-500">—</em>;
  const moduleLabel = MODULE_LABELS[data.module_type] ?? data.module_type;
  const statusLabel = STATUS_LABELS[data.status] ?? data.status;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-xl font-bold text-neutral-900">
          İş Detayı
        </h3>
        <Link
          to={`/admin/jobs/${data.id}`}
          className="text-sm text-brand-600 hover:text-brand-700 underline"
        >
          Tam Sayfa →
        </Link>
      </div>

      {/* Content linkage banner */}
      {contentRef?.content_id && (
        <div className="bg-info-light border border-info-border rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-neutral-700">
              {MODULE_LABELS[contentRef.module_type ?? ""] ?? contentRef.module_type}
            </div>
            <div className="text-base text-neutral-900 font-semibold truncate max-w-[260px]">
              {contentRef.content_title}
            </div>
            {contentRef.content_status && (
              <div className="text-xs text-neutral-500 mt-0.5">
                Durum: <span className="font-medium">{contentRef.content_status}</span>
              </div>
            )}
          </div>
          {contentRef.content_url && (
            <Link
              to={contentRef.content_url}
              className="text-sm text-brand-600 hover:text-brand-700 underline shrink-0 ml-3"
            >
              İçeriğe Git →
            </Link>
          )}
        </div>
      )}

      {/* Overview section */}
      <div className="bg-surface-card border border-border-subtle rounded-lg p-4 mb-4 shadow-xs">
        <Row label="Modül">
          <span className="font-medium">{moduleLabel}</span>
        </Row>
        <Row label="Durum">
          <span className={`inline-block px-2 py-0.5 rounded-full text-sm ${statusBadgeClass(data.status)}`}>
            {statusLabel}
          </span>
        </Row>
        {data.current_step_key && (
          <Row label="Aktif Adım">
            <span className="text-neutral-700">{data.current_step_key}</span>
          </Row>
        )}
        <Row label="Tekrar Sayısı">
          {data.retry_count > 0 ? (
            <span className="text-warning font-medium">{data.retry_count}×</span>
          ) : em}
        </Row>
        {data.last_error && (
          <Row label="Son Hata">
            <span className="text-error text-sm">{data.last_error}</span>
          </Row>
        )}
        <Row label="İş Kimliği">
          <code className="text-xs font-mono bg-neutral-100 px-2 py-1 rounded-sm text-neutral-600">{data.id}</code>
        </Row>
        {data.owner_id && (
          <Row label="Sahip">
            <span className="font-mono text-sm text-neutral-700">{data.owner_id}</span>
          </Row>
        )}
        {data.workspace_path && (
          <Row label="Çalışma Dizini">
            <code className="text-xs font-mono text-neutral-500 break-all">{data.workspace_path}</code>
          </Row>
        )}
      </div>

      {/* Timing section */}
      <div className="bg-surface-inset border border-border-subtle rounded-lg p-4 mb-4">
        <div className="text-sm font-semibold text-neutral-600 uppercase tracking-wider mb-2">
          Zamanlama
        </div>
        <Row label="Geçen Süre">
          <DurationBadge seconds={data.elapsed_total_seconds} />
        </Row>
        <Row label="Tahmini Kalan">
          <DurationBadge seconds={data.estimated_remaining_seconds} approximate />
        </Row>
        <Row label="Oluşturulma">{formatDateISO(data.created_at, em)}</Row>
        <Row label="Başlangıç">{formatDateISO(data.started_at, em)}</Row>
        <Row label="Bitiş">{formatDateISO(data.finished_at, em)}</Row>
      </div>

      <h4 className="m-0 mb-3 text-lg font-semibold text-neutral-800">
        İş Adımları
      </h4>
      <JobStepsList steps={data.steps} />
    </div>
  );
}
