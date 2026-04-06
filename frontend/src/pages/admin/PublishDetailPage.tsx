import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  usePublishRecord,
  usePublishLogs,
  useSubmitForReview,
  useReviewAction,
  useTriggerPublish,
  useCancelPublish,
  useRetryPublish,
  useResetToDraft,
  useSchedulePublish,
} from "../../hooks/usePublish";
import {
  PageShell,
  SectionShell,
  ActionButton,
  StatusBadge,
} from "../../components/design-system/primitives";
import { useToast } from "../../hooks/useToast";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "\u2014";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "\u2014";
  }
}

function statusVariant(status: string): string {
  switch (status) {
    case "published": return "ready";
    case "approved": return "info";
    case "scheduled": return "info";
    case "publishing": return "processing";
    case "pending_review": return "warning";
    case "draft": return "draft";
    case "failed": return "failed";
    case "cancelled": return "failed";
    case "review_rejected": return "failed";
    default: return "draft";
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-neutral-100">
      <span className="w-[180px] shrink-0 text-sm text-neutral-600">{label}</span>
      <span className="text-sm break-words [overflow-wrap:anywhere]">{children}</span>
    </div>
  );
}

const em = <em className="text-neutral-400">{"\u2014"}</em>;

export function PublishDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: record, isLoading, isError } = usePublishRecord(recordId);
  const { data: logs } = usePublishLogs(recordId);

  const submitMutation = useSubmitForReview();
  const reviewMutation = useReviewAction();
  const triggerMutation = useTriggerPublish();
  const cancelMutation = useCancelPublish();
  const retryMutation = useRetryPublish();
  const resetMutation = useResetToDraft();
  const scheduleMutation = useSchedulePublish();
  const [scheduleDate, setScheduleDate] = useState("");

  if (isLoading) return <PageShell title="Yayin Detay" testId="publish-detail"><p>Yukleniyor...</p></PageShell>;
  if (isError || !record) return <PageShell title="Yayin Detay" testId="publish-detail"><p className="text-error-dark">Kayit bulunamadi.</p></PageShell>;

  const s = record.status;
  const canSubmit = s === "draft";
  const canApprove = s === "pending_review";
  const canReject = s === "pending_review";
  const canTrigger = s === "approved" || s === "scheduled";
  const canSchedule = s === "approved";
  const canCancel = !["published", "cancelled"].includes(s);
  const canRetry = s === "failed";
  const canReset = s === "review_rejected";

  async function handleAction(
    fn: () => Promise<unknown>,
    successMsg: string,
  ) {
    try {
      await fn();
      toast.success(successMsg);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Islem basarisiz.");
    }
  }

  return (
    <PageShell
      title="Yayin Detay"
      subtitle={`Kayit: ${record.id.slice(0, 8)}... | ${record.platform}`}
      testId="publish-detail"
    >
      {/* Overview */}
      <SectionShell title="Genel Bilgi" testId="publish-overview">
        <Row label="Kayit ID"><code className="text-xs">{record.id}</code></Row>
        <Row label="Job ID">
          <button
            className="text-brand-600 bg-transparent border-none cursor-pointer p-0 text-sm font-medium"
            onClick={() => navigate(`/admin/jobs/${record.job_id}`)}
          >
            {record.job_id.slice(0, 8)}...
          </button>
        </Row>
        <Row label="Icerik Turu">{record.content_ref_type}</Row>
        <Row label="Icerik ID"><code className="text-xs">{record.content_ref_id}</code></Row>
        <Row label="Platform"><span className="capitalize">{record.platform}</span></Row>
        <Row label="Durum"><StatusBadge status={statusVariant(s)} label={s} /></Row>
        <Row label="Review">{record.review_state}</Row>
        <Row label="Reviewer">{record.reviewer_id ?? em}</Row>
        <Row label="Review Tarihi">{formatDate(record.reviewed_at)}</Row>
        <Row label="Zamanlama">{formatDate(record.scheduled_at)}</Row>
        <Row label="Yayin Tarihi">{formatDate(record.published_at)}</Row>
        <Row label="Platform Video ID">{record.platform_video_id ?? em}</Row>
        <Row label="Platform URL">
          {record.platform_url ? (
            <a href={record.platform_url} target="_blank" rel="noopener noreferrer" className="text-brand-600">
              {record.platform_url}
            </a>
          ) : em}
        </Row>
        <Row label="Deneme Sayisi">{record.publish_attempt_count}</Row>
        <Row label="Son Hata">
          {record.last_error ? <span className="text-error-dark">{record.last_error}</span> : em}
        </Row>
        <Row label="Notlar">{record.notes ?? em}</Row>
        <Row label="Olusturma">{formatDate(record.created_at)}</Row>
        <Row label="Guncelleme">{formatDate(record.updated_at)}</Row>
      </SectionShell>

      {/* Actions */}
      <SectionShell title="Aksiyonlar" testId="publish-actions">
        <div className="flex flex-wrap gap-2">
          {canSubmit && (
            <ActionButton
              variant="primary"
              size="sm"
              loading={submitMutation.isPending}
              onClick={() => handleAction(() => submitMutation.mutateAsync(record.id), "Review'a gonderildi.")}
              data-testid="publish-action-submit"
            >
              Review'a Gonder
            </ActionButton>
          )}
          {canApprove && (
            <ActionButton
              variant="primary"
              size="sm"
              loading={reviewMutation.isPending}
              onClick={() => handleAction(() => reviewMutation.mutateAsync({ recordId: record.id, decision: "approve" }), "Onaylandi.")}
              data-testid="publish-action-approve"
            >
              Onayla
            </ActionButton>
          )}
          {canReject && (
            <ActionButton
              variant="secondary"
              size="sm"
              loading={reviewMutation.isPending}
              onClick={() => handleAction(() => reviewMutation.mutateAsync({ recordId: record.id, decision: "reject" }), "Reddedildi.")}
              data-testid="publish-action-reject"
            >
              Reddet
            </ActionButton>
          )}
          {canTrigger && (
            <ActionButton
              variant="primary"
              size="sm"
              loading={triggerMutation.isPending}
              onClick={() => handleAction(() => triggerMutation.mutateAsync({ recordId: record.id }), "Yayin basladi.")}
              data-testid="publish-action-trigger"
            >
              Yayinla
            </ActionButton>
          )}
          {canCancel && (
            <ActionButton
              variant="secondary"
              size="sm"
              loading={cancelMutation.isPending}
              onClick={() => handleAction(() => cancelMutation.mutateAsync({ recordId: record.id }), "Iptal edildi.")}
              data-testid="publish-action-cancel"
            >
              Iptal Et
            </ActionButton>
          )}
          {canRetry && (
            <ActionButton
              variant="primary"
              size="sm"
              loading={retryMutation.isPending}
              onClick={() => handleAction(() => retryMutation.mutateAsync({ recordId: record.id }), "Yeniden deneniyor.")}
              data-testid="publish-action-retry"
            >
              Yeniden Dene
            </ActionButton>
          )}
          {canReset && (
            <ActionButton
              variant="secondary"
              size="sm"
              loading={resetMutation.isPending}
              onClick={() => handleAction(() => resetMutation.mutateAsync(record.id), "Taslaga donduruldu.")}
              data-testid="publish-action-reset"
            >
              Taslaga Don
            </ActionButton>
          )}
        </div>
        {canSchedule && (
          <div className="mt-3 pt-3 border-t border-neutral-200">
            <p className="text-sm font-medium text-neutral-700 mb-2">Zamanlanmis Yayin</p>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="border border-neutral-300 rounded px-2 py-1.5 text-sm"
                min={new Date().toISOString().slice(0, 16)}
                data-testid="publish-schedule-input"
              />
              <ActionButton
                variant="primary"
                size="sm"
                loading={scheduleMutation.isPending}
                disabled={!scheduleDate}
                onClick={() =>
                  handleAction(
                    () => scheduleMutation.mutateAsync({
                      recordId: record.id,
                      scheduledAt: new Date(scheduleDate).toISOString(),
                    }),
                    "Yayin zamanlandi.",
                  )
                }
                data-testid="publish-action-schedule"
              >
                Zamanla
              </ActionButton>
            </div>
          </div>
        )}
      </SectionShell>

      {/* Audit Log */}
      <SectionShell title="Denetim Izi" testId="publish-logs">
        {logs && logs.length > 0 ? (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex gap-3 py-2 border-b border-neutral-100 text-xs"
                data-testid={`publish-log-${log.id}`}
              >
                <span className="text-neutral-400 w-[140px] shrink-0">
                  {formatDate(log.created_at)}
                </span>
                <span className="font-medium text-neutral-700 w-[120px] shrink-0">
                  {log.event_type}
                </span>
                <span className="text-neutral-600">
                  {log.from_status && log.to_status && (
                    <span>{log.from_status} &rarr; {log.to_status}</span>
                  )}
                  {log.note && <span className="ml-2 text-neutral-400">({log.note})</span>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 m-0">Henuz log kaydi yok.</p>
        )}
      </SectionShell>
    </PageShell>
  );
}
