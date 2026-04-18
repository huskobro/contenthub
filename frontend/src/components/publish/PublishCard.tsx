/**
 * PublishCard — Redesign REV-2 / P2.5.
 *
 * Board gorunumundeki tek bir yayin kaydini temsil eden kart. Tablo
 * gorunumundeki satirla ayni sozlesmeyi konu alir (PublishRecordSummary),
 * kompakt bir kart formatinda: baslik (content ref tipi + kisa id), platform,
 * durum badge, deneme sayisi, zamanlanmis tarih/yayin tarihi, error chip
 * (varsa), inbox/review ipucu. Tiklaninca ust bileseninin verdigi
 * `onOpen(record)` callback'i tetiklenir — tablo modundaki "Detay" butonuyla
 * ayni hedefe (/admin/publish/:id) ulasir.
 *
 * Yalniz render — mutasyon yok, state yok. BulkActionBar'daki onay/reddet
 * aksiyonlari board gorunumunde de legacy tablo satir seciminden farkli
 * calismaz; bu dalgada board kartlari secim checkbox'i tasimaz (MVP kapsami).
 */

import { cn } from "../../lib/cn";
import { StatusBadge } from "../design-system/primitives";
import { PublishErrorChip } from "./PublishErrorChip";
import { formatDateShort } from "../../lib/formatDate";
import type { PublishRecordSummary } from "../../api/publishApi";

function publishStatusVariant(status: string): string {
  switch (status) {
    case "published":
      return "ready";
    case "approved":
    case "scheduled":
      return "info";
    case "publishing":
      return "processing";
    case "pending_review":
      return "warning";
    case "draft":
      return "draft";
    case "failed":
    case "cancelled":
    case "review_rejected":
      return "failed";
    default:
      return "draft";
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Taslak",
    pending_review: "Review Bekliyor",
    approved: "Onaylandi",
    scheduled: "Zamanlandi",
    publishing: "Yayinlaniyor",
    published: "Yayinda",
    failed: "Basarisiz",
    cancelled: "Iptal",
    review_rejected: "Reddedildi",
  };
  return map[status] ?? status;
}

function contentTypeLabel(t: string): string {
  if (t === "standard_video") return "Video";
  if (t === "news_bulletin") return "Bulten";
  return t;
}

interface PublishCardProps {
  record: PublishRecordSummary;
  onOpen: (record: PublishRecordSummary) => void;
  isSelected?: boolean;
}

export function PublishCard({ record, onOpen, isSelected }: PublishCardProps) {
  const timestamp =
    record.status === "scheduled" && record.scheduled_at
      ? { label: "Zamanlandi", iso: record.scheduled_at }
      : record.status === "published" && record.published_at
      ? { label: "Yayinda", iso: record.published_at }
      : { label: "Olusturma", iso: record.created_at };

  return (
    <button
      type="button"
      onClick={() => onOpen(record)}
      data-testid={`publish-card-${record.id}`}
      className={cn(
        "w-full text-left p-3 rounded-md border bg-white hover:border-brand-300 hover:shadow-sm transition-all",
        isSelected ? "border-brand-400 bg-brand-50/50" : "border-neutral-200",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-neutral-900 truncate">
            {contentTypeLabel(record.content_ref_type)}{" "}
            <code className="text-[10px] text-neutral-500 font-normal">
              {record.content_ref_id.slice(0, 8)}
            </code>
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5 capitalize">
            {record.platform}
          </div>
        </div>
        <StatusBadge
          status={publishStatusVariant(record.status)}
          label={statusLabel(record.status)}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-500">
        <span>
          {timestamp.label}: {formatDateShort(timestamp.iso, "—")}
        </span>
        <span className="flex items-center gap-1.5">
          {record.publish_attempt_count > 0 && (
            <span data-testid={`publish-card-attempts-${record.id}`}>
              {record.publish_attempt_count} deneme
            </span>
          )}
          {record.status === "failed" && record.last_error_category && (
            <PublishErrorChip category={record.last_error_category} />
          )}
        </span>
      </div>
    </button>
  );
}
