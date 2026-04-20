/**
 * AuroraPublishDetailPage — Aurora Dusk Cockpit / Yayın Detayı (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/publish-detail.html`.
 * Tasarım hedefi:
 *   - Page-head (başlık = content_ref_id + platform, alt satır mono: record id · durum)
 *   - Sol ana içerik:
 *       * Medya/özet kartı (platform + yayın meta ızgarası)
 *       * Yayın bilgileri kartı (başlık, açıklama, etiketler, kanal, zamanlama satırları)
 *       * Denetim izi (publish_logs — son N olay)
 *   - Sağ Inspector:
 *       * Meta (id, durum, review, platform, kanal, zamanlama, yayın zamanı, deneme sayısı)
 *       * Hata durumu (varsa last_error_category + kısa detay)
 *       * Eylemler (yeniden dene / iptal et / zamanla / job detayı)
 *
 * Veri kaynağı: usePublishRecord(recordId), usePublishLogs(recordId).
 * Aksiyonlar: useRetryPublish, useCancelPublish, useSchedulePublish, useTriggerPublish.
 * Legacy PublishDetailPage aynen çalışır; bu bileşen sadece surface override'i
 * `admin.publish.detail` için hazır. Register manifesti bu commit'te DOKUNULMADI.
 */

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCancelPublish,
  usePatchPublishPayload,
  usePublishLogs,
  usePublishRecord,
  useResetToDraft,
  useRetryPublish,
  useReviewAction,
  useSchedulePublish,
  useSubmitForReview,
  useTriggerPublish,
} from "../../hooks/usePublish";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../lib/formatDate";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Helpers (kept local, no duplication of design-system primitives)
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
  pending_review: "İnceleme bekliyor",
  approved: "Onaylandı",
  scheduled: "Zamanlandı",
  publishing: "Yayınlanıyor",
  published: "Yayında",
  failed: "Başarısız",
  cancelled: "İptal",
  review_rejected: "Reddedildi",
};

const REVIEW_LABEL: Record<string, string> = {
  pending_review: "İnceleme bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  none: "—",
};

type ChipTone = "ok" | "warn" | "danger" | "info" | "neutral";

function statusTone(status: string): ChipTone {
  switch (status) {
    case "published":
      return "ok";
    case "scheduled":
    case "approved":
    case "publishing":
      return "info";
    case "pending_review":
      return "warn";
    case "failed":
    case "cancelled":
    case "review_rejected":
      return "danger";
    default:
      return "neutral";
  }
}

function platformIcon(platform: string): string {
  switch ((platform || "").toLowerCase()) {
    case "youtube":
      return "▶";
    case "tiktok":
      return "♪";
    case "instagram":
      return "📷";
    case "twitter":
    case "x":
      return "✕";
    default:
      return "📡";
  }
}

function fmt(iso: string | null | undefined): string {
  return formatDateTime(iso, "—");
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function parseIntent(record: {
  publish_intent_json: string | null;
  payload_json: string | null;
}): {
  title: string | null;
  description: string | null;
  tags: string[] | null;
  scheduled_at: string | null;
} {
  const empty = { title: null, description: null, tags: null, scheduled_at: null };
  const raw = record.publish_intent_json ?? record.payload_json;
  if (!raw) return empty;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const title = typeof obj.title === "string" ? (obj.title as string) : null;
    const description =
      typeof obj.description === "string" ? (obj.description as string) : null;
    const tags = Array.isArray(obj.tags)
      ? (obj.tags as unknown[]).filter((x): x is string => typeof x === "string")
      : null;
    const scheduled_at =
      typeof obj.scheduled_at === "string" ? (obj.scheduled_at as string) : null;
    return { title, description, tags, scheduled_at };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraPublishDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: record, isLoading, isError, error } = usePublishRecord(recordId);
  const { data: logs } = usePublishLogs(recordId);

  const retryMutation = useRetryPublish();
  const cancelMutation = useCancelPublish();
  const scheduleMutation = useSchedulePublish();
  const triggerMutation = useTriggerPublish();
  const submitMutation = useSubmitForReview();
  const reviewMutation = useReviewAction();
  const resetMutation = useResetToDraft();
  const patchPayloadMutation = usePatchPublishPayload();

  const [scheduleDraft, setScheduleDraft] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [payloadOpen, setPayloadOpen] = useState(false);
  const [payloadDraft, setPayloadDraft] = useState("");
  const [payloadError, setPayloadError] = useState<string | null>(null);

  const intent = useMemo(
    () =>
      record
        ? parseIntent({
            publish_intent_json: record.publish_intent_json ?? null,
            payload_json: record.payload_json ?? null,
          })
        : { title: null, description: null, tags: null, scheduled_at: null },
    [record],
  );

  // -------------------------------------------------------------------------
  // Loading / error gates — page-level before shell, so shell stays clean.
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Yükleniyor…
          </div>
        </div>
      </div>
    );
  }

  if (isError || !record) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            className="card card-pad"
            style={{
              textAlign: "center",
              color: "var(--state-danger-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            Yayın kaydı yüklenemedi
            {error instanceof Error ? `: ${error.message}` : "."}
          </div>
        </div>
      </div>
    );
  }

  const s = record.status;
  const canSubmit = s === "draft";
  const canApprove = s === "pending_review";
  const canReject = s === "pending_review";
  const canReset = s === "review_rejected" || s === "failed" || s === "cancelled";
  const canRetry = s === "failed";
  const canCancel = !["published", "cancelled"].includes(s);
  const canSchedule = s === "approved" || s === "scheduled";
  const canTrigger = s === "approved" || s === "scheduled";
  const canEditPayload = s === "draft";

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  async function run(fn: () => Promise<unknown>, okMsg: string, errMsg: string) {
    try {
      await fn();
      toast.success(okMsg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : errMsg);
    }
  }

  const onRetry = () =>
    run(
      () => retryMutation.mutateAsync({ recordId: record.id }),
      "Yeniden deneme başlatıldı",
      "Yeniden deneme başarısız",
    );

  const onCancel = () => {
    if (!window.confirm("Bu yayın kaydını iptal etmek istediğinize emin misiniz?"))
      return;
    return run(
      () => cancelMutation.mutateAsync({ recordId: record.id }),
      "Yayın iptal edildi",
      "İptal başarısız",
    );
  };

  const onSchedule = () => {
    if (!scheduleDraft) return;
    return run(
      () =>
        scheduleMutation.mutateAsync({
          recordId: record.id,
          scheduledAt: new Date(scheduleDraft).toISOString(),
        }),
      "Yayın zamanlandı",
      "Zamanlama başarısız",
    );
  };

  const onTriggerNow = () =>
    run(
      () => triggerMutation.mutateAsync({ recordId: record.id }),
      "Yayın tetiklendi",
      "Tetikleme başarısız",
    );

  const onSubmit = () =>
    run(
      () => submitMutation.mutateAsync(record.id),
      "İnceleme kuyruğuna gönderildi",
      "İnceleme için gönderilemedi",
    );

  const onApprove = () =>
    run(
      () =>
        reviewMutation.mutateAsync({
          recordId: record.id,
          decision: "approve",
        }),
      "Yayın onaylandı",
      "Onay başarısız",
    );

  const onReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Reddetme gerekçesi zorunlu.");
      return;
    }
    return run(
      () =>
        reviewMutation.mutateAsync({
          recordId: record.id,
          decision: "reject",
          rejectionReason: rejectionReason.trim(),
        }),
      "Yayın reddedildi",
      "Reddetme başarısız",
    );
  };

  const onReset = () => {
    if (!window.confirm("Kayıt taslağa geri döndürülsün mü?")) return;
    return run(
      () => resetMutation.mutateAsync(record.id),
      "Kayıt taslağa döndürüldü",
      "Taslağa döndürme başarısız",
    );
  };

  function openPayloadEditor() {
    const raw = record?.payload_json ?? "";
    let pretty = raw;
    if (raw) {
      try {
        pretty = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        /* keep raw */
      }
    }
    setPayloadDraft(pretty);
    setPayloadError(null);
    setPayloadOpen(true);
  }

  const onSavePayload = () => {
    try {
      JSON.parse(payloadDraft || "{}");
    } catch (err) {
      setPayloadError(err instanceof Error ? err.message : "Geçersiz JSON.");
      return;
    }
    setPayloadError(null);
    return run(
      async () => {
        await patchPayloadMutation.mutateAsync({
          recordId: record.id,
          payloadJson: payloadDraft || "{}",
        });
        setPayloadOpen(false);
      },
      "Payload güncellendi",
      "Payload kaydedilemedi",
    );
  };

  // -------------------------------------------------------------------------
  // Inspector
  // -------------------------------------------------------------------------
  const statusChipTone = statusTone(s);

  const inspector = (
    <AuroraInspector title="Yayın">
      <AuroraInspectorSection title="Meta">
        <AuroraInspectorRow label="id" value={shortId(record.id)} />
        <AuroraInspectorRow
          label="durum"
          value={
            <span className={`chip ${statusChipTone}`} style={{ height: 18, fontSize: 10 }}>
              {STATUS_LABEL[s] ?? s}
            </span>
          }
        />
        <AuroraInspectorRow
          label="review"
          value={REVIEW_LABEL[record.review_state] ?? record.review_state}
        />
        <AuroraInspectorRow
          label="platform"
          value={
            <span style={{ textTransform: "capitalize" }}>
              {platformIcon(record.platform)} {record.platform}
            </span>
          }
        />
        <AuroraInspectorRow
          label="kanal"
          value={record.platform_connection_id ? shortId(record.platform_connection_id) : "—"}
        />
        <AuroraInspectorRow label="zamanlama" value={fmt(record.scheduled_at)} />
        <AuroraInspectorRow label="yayın" value={fmt(record.published_at)} />
        <AuroraInspectorRow
          label="deneme"
          value={String(record.publish_attempt_count)}
        />
      </AuroraInspectorSection>

      {record.last_error_category && (
        <AuroraInspectorSection title="Hata">
          <AuroraInspectorRow
            label="kategori"
            value={
              <span
                className="chip danger"
                style={{ height: 18, fontSize: 10 }}
              >
                {record.last_error_category}
              </span>
            }
          />
          {record.last_error && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--state-danger-fg)",
                marginTop: 6,
                lineHeight: 1.4,
                wordBreak: "break-word",
              }}
            >
              {record.last_error}
            </div>
          )}
        </AuroraInspectorSection>
      )}

      <AuroraInspectorSection title="Eylemler">
        {canSubmit && (
          <AuroraButton
            variant="primary"
            size="sm"
            onClick={onSubmit}
            disabled={submitMutation.isPending}
            style={{ width: "100%", marginBottom: 6 }}
            iconLeft={<Icon name="send" size={11} />}
            data-testid="aurora-publish-detail-submit"
          >
            {submitMutation.isPending ? "Gönderiliyor…" : "İnceleme gönder"}
          </AuroraButton>
        )}
        {canApprove && (
          <AuroraButton
            variant="primary"
            size="sm"
            onClick={onApprove}
            disabled={reviewMutation.isPending}
            style={{ width: "100%", marginBottom: 6 }}
            iconLeft={<Icon name="check" size={11} />}
            data-testid="aurora-publish-detail-approve"
          >
            {reviewMutation.isPending && reviewMutation.variables?.decision === "approve"
              ? "Onaylanıyor…"
              : "Onayla"}
          </AuroraButton>
        )}
        {canReset && (
          <AuroraButton
            variant="secondary"
            size="sm"
            onClick={onReset}
            disabled={resetMutation.isPending}
            style={{ width: "100%", marginBottom: 6 }}
            iconLeft={<Icon name="refresh" size={11} />}
            data-testid="aurora-publish-detail-reset"
          >
            {resetMutation.isPending ? "Döndürülüyor…" : "Taslağa dön"}
          </AuroraButton>
        )}
        {canRetry && (
          <AuroraButton
            variant="primary"
            size="sm"
            onClick={onRetry}
            disabled={retryMutation.isPending}
            style={{ width: "100%", marginBottom: 6 }}
            iconLeft={<Icon name="refresh" size={11} />}
            data-testid="aurora-publish-detail-retry"
          >
            Yeniden dene
          </AuroraButton>
        )}
        {canTrigger && (
          <AuroraButton
            variant="primary"
            size="sm"
            onClick={onTriggerNow}
            disabled={triggerMutation.isPending}
            style={{ width: "100%", marginBottom: 6 }}
            iconLeft={<Icon name="send" size={11} />}
            data-testid="aurora-publish-detail-trigger"
          >
            Şimdi yayınla
          </AuroraButton>
        )}
        {canCancel && (
          <AuroraButton
            variant="danger"
            size="sm"
            onClick={onCancel}
            disabled={cancelMutation.isPending}
            style={{ width: "100%", marginBottom: 6 }}
            iconLeft={<Icon name="x" size={11} />}
            data-testid="aurora-publish-detail-cancel"
          >
            İptal et
          </AuroraButton>
        )}
        <AuroraButton
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/admin/jobs/${record.job_id}`)}
          style={{ width: "100%", marginBottom: 6 }}
          iconLeft={<Icon name="more-horizontal" size={11} />}
          data-testid="aurora-publish-detail-job-link"
        >
          Job detayı
        </AuroraButton>
        {record.platform_url && (
          <a
            href={record.platform_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn secondary sm"
            style={{
              width: "100%",
              justifyContent: "center",
              textDecoration: "none",
            }}
          >
            Platformda aç
          </a>
        )}
      </AuroraInspectorSection>

      {canReject && (
        <AuroraInspectorSection title="Reddet">
          <input
            type="text"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reddetme gerekçesi (zorunlu)"
            style={{
              width: "100%",
              background: "var(--bg-inset)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 4,
              color: "var(--text-primary)",
              fontSize: 11,
              padding: "4px 6px",
              marginBottom: 6,
            }}
            data-testid="aurora-publish-detail-reject-reason"
          />
          <AuroraButton
            variant="danger"
            size="sm"
            onClick={onReject}
            disabled={!rejectionReason.trim() || reviewMutation.isPending}
            style={{ width: "100%" }}
            data-testid="aurora-publish-detail-reject"
          >
            {reviewMutation.isPending && reviewMutation.variables?.decision === "reject"
              ? "Reddediliyor…"
              : "Reddet"}
          </AuroraButton>
        </AuroraInspectorSection>
      )}

      {canSchedule && (
        <AuroraInspectorSection title="Zamanla">
          <input
            type="datetime-local"
            value={scheduleDraft}
            onChange={(e) => setScheduleDraft(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            style={{
              width: "100%",
              background: "var(--bg-inset)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 4,
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              padding: "4px 6px",
              marginBottom: 6,
            }}
            data-testid="aurora-publish-detail-schedule-input"
          />
          <AuroraButton
            variant="secondary"
            size="sm"
            onClick={onSchedule}
            disabled={!scheduleDraft || scheduleMutation.isPending}
            style={{ width: "100%" }}
            data-testid="aurora-publish-detail-schedule-btn"
          >
            Zamanı uygula
          </AuroraButton>
        </AuroraInspectorSection>
      )}
    </AuroraInspector>
  );

  // -------------------------------------------------------------------------
  // Page body
  // -------------------------------------------------------------------------
  const headline =
    intent.title ||
    record.content_ref_id ||
    `${record.content_ref_type} · ${shortId(record.id)}`;

  const metaCells: Array<[string, string]> = [
    ["Modül", record.content_ref_type],
    ["Platform", record.platform],
    ["Deneme", String(record.publish_attempt_count)],
    ["Oluşturma", fmt(record.created_at)],
  ];

  const infoRows: Array<[string, React.ReactNode]> = [
    ["Başlık", intent.title ?? headline],
    [
      "Açıklama",
      intent.description ?? (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
    ],
    [
      "Etiketler",
      intent.tags && intent.tags.length > 0 ? (
        <span style={{ fontFamily: "var(--font-mono)" }}>
          {intent.tags.join(", ")}
        </span>
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
    ],
    [
      "İçerik bağlantısı",
      <button
        type="button"
        onClick={() => navigate(`/admin/jobs/${record.job_id}`)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: "var(--accent-primary-hover)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        {record.content_ref_id || shortId(record.id)}
      </button>,
    ],
    [
      "Kanal",
      record.platform_connection_id ? (
        <span style={{ fontFamily: "var(--font-mono)" }}>
          {shortId(record.platform_connection_id)}
        </span>
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
    ],
    ["Zamanlama", fmt(record.scheduled_at)],
    ["Yayın", fmt(record.published_at)],
    [
      "Platform URL",
      record.platform_url ? (
        <a
          href={record.platform_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent-primary-hover)" }}
        >
          {record.platform_url}
        </a>
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
    ],
  ];

  return (
    <div className="aurora-dashboard">
      <div className="page" style={{ maxWidth: 760 }}>
        <div className="page-head">
          <div>
            <h1>{headline}</h1>
            <div
              className="sub"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
            >
              {shortId(record.id)} · {STATUS_LABEL[s] ?? s} ·{" "}
              {record.platform}
            </div>
          </div>
          <div className="hstack">
            <AuroraButton
              variant="secondary"
              size="sm"
              onClick={() => navigate("/admin/publish")}
              iconLeft={<Icon name="chevron-left" size={12} />}
            >
              Yayın merkezi
            </AuroraButton>
            {canRetry && (
              <AuroraButton
                variant="primary"
                size="sm"
                onClick={onRetry}
                disabled={retryMutation.isPending}
                iconLeft={<Icon name="refresh" size={12} />}
              >
                Yeniden dene
              </AuroraButton>
            )}
          </div>
        </div>

        {/* Media / summary card */}
        <div
          className="card"
          style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}
        >
          <div
            style={{
              width: "100%",
              aspectRatio: "16/9",
              background: "linear-gradient(135deg, var(--bg-canvas), var(--bg-sidebar-active))",
              display: "grid",
              placeItems: "center",
              color: "var(--accent-primary-hover)",
              position: "relative",
            }}
          >
            <Icon name="film" size={40} />
            <span
              className={`chip ${statusChipTone}`}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                height: 20,
                fontSize: 10,
              }}
            >
              <span className="dot" />
              {STATUS_LABEL[s] ?? s}
            </span>
          </div>
          <div
            style={{
              padding: "12px 18px",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              gap: 16,
              fontSize: 12,
              flexWrap: "wrap",
            }}
          >
            {metaCells.map(([k, v]) => (
              <div key={k}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                    marginRight: 6,
                  }}
                >
                  {k}
                </span>
                <span
                  style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Yayın bilgileri */}
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div
            className="section-head"
            style={{ marginBottom: 8, borderBottom: "none", paddingBottom: 0 }}
          >
            <div>
              <h3>Yayın bilgileri</h3>
            </div>
          </div>
          {infoRows.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                gap: 10,
                padding: "9px 0",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: 12,
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  minWidth: 140,
                  flexShrink: 0,
                }}
              >
                {k}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>

        {/* Payload editor — sadece draft durumunda düzenlenebilir */}
        {canEditPayload && (
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div
              className="section-head"
              style={{ marginBottom: 8, borderBottom: "none", paddingBottom: 0 }}
            >
              <div>
                <h3>Payload</h3>
                <div className="caption">
                  {payloadOpen
                    ? "JSON'u düzenleyin ve kaydedin."
                    : "Kayıt gönderilmeden önce payload'ı güncelleyebilirsiniz."}
                </div>
              </div>
              {!payloadOpen ? (
                <AuroraButton
                  variant="secondary"
                  size="sm"
                  onClick={openPayloadEditor}
                  data-testid="aurora-publish-detail-payload-edit"
                >
                  Düzenle
                </AuroraButton>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <AuroraButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPayloadOpen(false);
                      setPayloadError(null);
                    }}
                  >
                    Vazgeç
                  </AuroraButton>
                  <AuroraButton
                    variant="primary"
                    size="sm"
                    onClick={onSavePayload}
                    disabled={patchPayloadMutation.isPending}
                    data-testid="aurora-publish-detail-payload-save"
                  >
                    {patchPayloadMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
                  </AuroraButton>
                </div>
              )}
            </div>
            {!payloadOpen ? (
              <pre
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  background: "var(--bg-inset)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 6,
                  padding: 10,
                  margin: 0,
                  maxHeight: 220,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "var(--text-primary)",
                }}
                data-testid="aurora-publish-detail-payload-view"
              >
                {record.payload_json
                  ? (() => {
                      try {
                        return JSON.stringify(JSON.parse(record.payload_json), null, 2);
                      } catch {
                        return record.payload_json;
                      }
                    })()
                  : "(boş)"}
              </pre>
            ) : (
              <>
                <textarea
                  value={payloadDraft}
                  onChange={(e) => setPayloadDraft(e.target.value)}
                  spellCheck={false}
                  style={{
                    width: "100%",
                    minHeight: 220,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    background: "var(--bg-inset)",
                    border: `1px solid ${payloadError ? "var(--state-danger-fg)" : "var(--border-subtle)"}`,
                    borderRadius: 6,
                    padding: 10,
                    color: "var(--text-primary)",
                    lineHeight: 1.5,
                    resize: "vertical",
                  }}
                  data-testid="aurora-publish-detail-payload-textarea"
                />
                {payloadError && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "var(--state-danger-fg)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {payloadError}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Denetim izi (retry history + audit) */}
        <div className="card card-pad">
          <div
            className="section-head"
            style={{ marginBottom: 8, borderBottom: "none", paddingBottom: 0 }}
          >
            <div>
              <h3>Denetim izi</h3>
              <div className="caption">
                Son {logs?.length ?? 0} olay · son hata:{" "}
                {record.last_error_category ?? "—"}
              </div>
            </div>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/admin/audit-logs`)}
            >
              Tam audit
            </AuroraButton>
          </div>
          {logs && logs.length > 0 ? (
            <div>
              {logs.slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "7px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: 11,
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      minWidth: 150,
                    }}
                  >
                    {fmt(log.created_at)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent-primary-hover)",
                      minWidth: 120,
                    }}
                  >
                    {log.event_type}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {log.from_status && log.to_status ? (
                      <>
                        {log.from_status}
                        <span style={{ margin: "0 6px", color: "var(--text-muted)" }}>→</span>
                        {log.to_status}
                      </>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                    {log.note && (
                      <span style={{ marginLeft: 8, color: "var(--text-muted)" }}>
                        ({log.note})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "16px 0",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              Henüz log kaydı yok.
            </div>
          )}
        </div>
      </div>

      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
