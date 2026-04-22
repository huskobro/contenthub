/**
 * AuroraPublishReviewQueuePage — Aurora Dusk Cockpit / Yayın Onay Kuyruğu.
 *
 * Aurora karşılığı: legacy `PublishReviewQueuePage` (review_state=pending_review
 * kayıtlarına odaklı odak sayfası). Bu sayfa /admin/publish/review-queue
 * rotasında, surface override key `admin.publish.review-queue` üzerinden
 * legacy trampoline tarafından devreye alınır.
 *
 * Kapsam:
 *   - Üst: AuroraPageShell (breadcrumb: Publish → Review Queue, başlık,
 *     bekleyen sayım, Tümünü onayla aksiyonu).
 *   - Sol/orta: AuroraTable — başlık (kısa içerik referansı), modül,
 *     kanal/platform, oluşturma zamanı, durum chip'i, satır içi
 *     "Onayla / Reddet / Detay" aksiyonları.
 *   - Sağ: AuroraInspector — bekleyen sayım, en uzun bekleyen kayıt,
 *     kanal dağılımı.
 *
 * Davranış:
 *   - usePublishRecords({ status: "pending_review" }) ile gerçek backend
 *     verisini çeker (mock yok).
 *   - useBulkApprove/Reject mutation'larını kullanır; tek kayıt için
 *     record_ids: [id] geçerek backend tarafındaki state machine'i bypass
 *     etmez (PublishCenter ile aynı kontrat).
 *   - Reddet aksiyonu AuroraDetailDrawer içinde zorunlu gerekçe ister;
 *     boş gerekçede inline hata gösterir. (window.prompt artık kullanılmıyor.)
 *   - Detay tıklaması /admin/publish/:id legacy detay sayfasına yönlenir;
 *     bu sayfa kendi state machine'ini surface katmanından bağımsız
 *     yönetmeye devam eder.
 *
 * Bu sayfa ürün kuralını ihlal etmez:
 *   - Hiçbir hidden behavior eklemez; mevcut review-gate akışı aynen kalır.
 *   - register.tsx'e dokunulmaz; aktivasyon ileride bridge/aurora override
 *     map'inde manuel olarak yapılır.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  usePublishRecords,
  useBulkApprovePublishRecords,
  useBulkRejectPublishRecords,
} from "../../hooks/usePublish";
import type { PublishRecordSummary } from "../../api/publishApi";
import { useToast } from "../../hooks/useToast";
import { Icon } from "./icons";
import {
  AuroraPageShell,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraButton,
  AuroraStatusChip,
  AuroraDetailDrawer,
  AuroraField,
  AuroraTable,
  type AuroraColumn,
} from "./primitives";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "şimdi";
  if (min < 60) return `${min} dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa`;
  const day = Math.floor(hr / 24);
  return `${day} g`;
}

function moduleLabel(refType: string): string {
  switch (refType) {
    case "standard_video":
      return "Standart Video";
    case "news_bulletin":
      return "Haber Bülteni";
    case "product_review":
      return "Ürün İncelemesi";
    case "educational_video":
      return "Eğitim";
    case "howto_video":
      return "Nasıl Yapılır";
    default:
      return refType || "—";
  }
}

function platformLabel(p: string): string {
  if (!p) return "—";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function rowTitle(r: PublishRecordSummary): string {
  if (r.content_ref_id) return r.content_ref_id;
  return r.id.slice(0, 12);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraPublishReviewQueuePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading, isError } = usePublishRecords({
    status: "pending_review",
    limit: 100,
  });
  const records: PublishRecordSummary[] = useMemo(() => data ?? [], [data]);

  const approve = useBulkApprovePublishRecords();
  const reject = useBulkRejectPublishRecords();

  const [pending, setPending] = useState<Set<string>>(new Set());

  // Reject drawer — window.prompt yerine Aurora-native gerekçe formu.
  // rejectTargetId !== null iken drawer açık; kayıt mutation'ı bitince kapanır.
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Approve-all confirmation drawer — window.confirm yerine Aurora drawer.
  const [approveAllOpen, setApproveAllOpen] = useState(false);

  const markPending = (id: string, on: boolean) =>
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const onApprove = (id: string) => {
    markPending(id, true);
    approve.mutate(
      { record_ids: [id] },
      {
        onSuccess: () => {
          toast.success("Onaylandı");
          markPending(id, false);
        },
        onError: () => {
          toast.error("Onaylama başarısız");
          markPending(id, false);
        },
      },
    );
  };

  const onReject = (id: string) => {
    setRejectTargetId(id);
    setRejectReason("");
    setRejectError(null);
  };

  const closeRejectDrawer = () => {
    setRejectTargetId(null);
    setRejectReason("");
    setRejectError(null);
  };

  const submitReject = () => {
    if (!rejectTargetId) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectError(
        "Gerekçe zorunlu — audit log'a kaydedilecek.",
      );
      return;
    }
    const targetId = rejectTargetId;
    markPending(targetId, true);
    reject.mutate(
      { record_ids: [targetId], rejection_reason: trimmed },
      {
        onSuccess: () => {
          toast.success("Reddedildi");
          markPending(targetId, false);
          closeRejectDrawer();
        },
        onError: () => {
          toast.error("Reddetme başarısız");
          markPending(targetId, false);
          setRejectError(
            "Sunucu hatası — yeniden denemek için formu açık bırakabilirsiniz.",
          );
        },
      },
    );
  };

  const rejectTargetRecord = useMemo(
    () =>
      rejectTargetId
        ? records.find((r) => r.id === rejectTargetId) ?? null
        : null,
    [rejectTargetId, records],
  );

  const openApproveAll = () => {
    if (records.length === 0) return;
    setApproveAllOpen(true);
  };

  const confirmApproveAll = () => {
    if (records.length === 0) {
      setApproveAllOpen(false);
      return;
    }
    approve.mutate(
      { record_ids: records.map((r) => r.id) },
      {
        onSuccess: (resp) => {
          toast.success(
            `${resp.succeeded} onaylandı${
              resp.failed > 0 ? ` · ${resp.failed} başarısız` : ""
            }`,
          );
          setApproveAllOpen(false);
        },
        onError: () => {
          toast.error("Toplu onaylama başarısız");
          setApproveAllOpen(false);
        },
      },
    );
  };

  // -------- Aggregations for inspector --------

  const oldest = useMemo(() => {
    if (records.length === 0) return null;
    return records.reduce<PublishRecordSummary>((acc, cur) => {
      const accT = new Date(acc.created_at).getTime();
      const curT = new Date(cur.created_at).getTime();
      return curT < accT ? cur : acc;
    }, records[0]);
  }, [records]);

  const channelBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      map.set(r.platform, (map.get(r.platform) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);
  }, [records]);

  // -------- Table columns --------

  const columns: AuroraColumn<PublishRecordSummary>[] = [
    {
      key: "title",
      header: "Başlık",
      render: (r) => (
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 280,
            }}
            title={rowTitle(r)}
          >
            {rowTitle(r)}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              marginTop: 2,
            }}
          >
            {r.id.slice(0, 12)}
          </div>
        </div>
      ),
    },
    {
      key: "module",
      header: "Modül",
      render: (r) => (
        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
          {moduleLabel(r.content_ref_type)}
        </span>
      ),
    },
    {
      key: "platform",
      header: "Kanal",
      render: (r) => (
        <span
          style={{
            fontSize: 11,
            color: "var(--accent-primary-hover)",
            textTransform: "capitalize",
          }}
        >
          {platformLabel(r.platform)}
        </span>
      ),
    },
    {
      key: "created",
      header: "Oluşturulma",
      render: (r) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            {fmtDateTime(r.created_at)}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            {fmtRelative(r.created_at)} bekliyor
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Durum",
      render: () => (
        <AuroraStatusChip tone="warning">
          <span className="dot" /> İnceleme bekliyor
        </AuroraStatusChip>
      ),
    },
    {
      key: "actions",
      header: "İşlemler",
      align: "right",
      width: "240px",
      render: (r) => {
        const isPending = pending.has(r.id);
        return (
          <div
            style={{
              display: "inline-flex",
              gap: 6,
              justifyContent: "flex-end",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AuroraButton
              variant="primary"
              size="sm"
              disabled={isPending}
              onClick={() => onApprove(r.id)}
              data-testid={`aurora-review-approve-${r.id}`}
            >
              <Icon name="check" size={11} /> Onayla
            </AuroraButton>
            <AuroraButton
              variant="danger"
              size="sm"
              disabled={isPending}
              onClick={() => onReject(r.id)}
              data-testid={`aurora-review-reject-${r.id}`}
            >
              <Icon name="x" size={11} /> Reddet
            </AuroraButton>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/admin/publish/${r.id}`)}
              data-testid={`aurora-review-detail-${r.id}`}
            >
              <Icon name="external-link" size={11} />
            </AuroraButton>
          </div>
        );
      },
    },
  ];

  // -------- Inspector --------

  const inspector = (
    <AuroraInspector title="Review kuyruğu">
      <AuroraInspectorSection title="Bekleyen">
        <AuroraInspectorRow
          label="toplam kayıt"
          value={String(records.length)}
        />
        <AuroraInspectorRow
          label="en uzun bekleyen"
          value={oldest ? fmtRelative(oldest.created_at) : "—"}
        />
        <AuroraInspectorRow
          label="kanal sayısı"
          value={String(channelBreakdown.length)}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Kanal dağılımı">
        {channelBreakdown.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Bekleyen kanal yok.
          </div>
        ) : (
          channelBreakdown.map((c) => (
            <AuroraInspectorRow
              key={c.platform}
              label={
                <span style={{ textTransform: "capitalize" }}>
                  {platformLabel(c.platform)}
                </span>
              }
              value={
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {c.count}
                </span>
              }
            />
          ))
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Hızlı işlemler">
        <AuroraButton
          variant="primary"
          size="sm"
          style={{ width: "100%", marginBottom: 6 }}
          disabled={records.length === 0 || approve.isPending}
          onClick={openApproveAll}
        >
          Tümünü onayla
        </AuroraButton>
        <AuroraButton
          variant="secondary"
          size="sm"
          style={{ width: "100%" }}
          onClick={() => navigate("/admin/publish")}
        >
          Yayın merkezine dön
        </AuroraButton>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  // -------- Render --------

  return (
    <div className="aurora-publish-review">
      <AuroraPageShell
        title="Review kuyruğu"
        breadcrumbs={[
          { label: "Publish", href: "/admin/publish" },
          { label: "Review Queue" },
        ]}
        description={
          isLoading
            ? "Yükleniyor…"
            : isError
            ? "Kuyruk yüklenemedi — bağlantıyı kontrol edin."
            : `${records.length} kayıt onay bekliyor · pending_review → onay → zamanlama / yayın`
        }
        actions={
          <AuroraButton
            variant="primary"
            size="sm"
            disabled={records.length === 0 || approve.isPending}
            onClick={openApproveAll}
            data-testid="aurora-review-approve-all"
          >
            <Icon name="check" size={12} /> Tümünü onayla
          </AuroraButton>
        }
        data-testid="aurora-publish-review-queue"
      >
        <AuroraTable<PublishRecordSummary>
          columns={columns}
          rows={records}
          rowKey={(r) => r.id}
          loading={isLoading}
          empty={
            <div
              style={{
                padding: "24px 8px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <Icon name="check" size={22} />
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Bekleyen review yok
              </div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                Yeni kayıtlar geldiğinde burada listelenir.
              </div>
            </div>
          }
          data-testid="aurora-review-table"
        />
      </AuroraPageShell>

      <div className="aurora-inspector-slot">{inspector}</div>

      <AuroraDetailDrawer
        item={
          rejectTargetId
            ? {
                breadcrumb: "Review · Reddet",
                title: (
                  <span>
                    Kaydı reddet{" "}
                    {rejectTargetRecord && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginLeft: 6,
                        }}
                      >
                        {rowTitle(rejectTargetRecord)}
                      </span>
                    )}
                  </span>
                ),
                children: (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      Reddetme gerekçesi <strong>zorunludur</strong> ve audit
                      log'a kaydedilir. Kayıt <code>pending_review → rejected</code>{" "}
                      geçişi yapar.
                    </div>
                    <AuroraField label="Gerekçe" htmlFor="aurora-reject-reason">
                      <textarea
                        id="aurora-reject-reason"
                        value={rejectReason}
                        onChange={(e) => {
                          setRejectReason(e.target.value);
                          if (rejectError) setRejectError(null);
                        }}
                        placeholder="Ör: hedef hedef kitleye uygun değil, son kontrol başarısız…"
                        rows={5}
                        autoFocus
                        data-testid="aurora-review-reject-reason"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-default)",
                          borderRadius: 8,
                          color: "var(--text-primary)",
                          fontSize: 13,
                          fontFamily: "inherit",
                          resize: "vertical",
                          minHeight: 96,
                          lineHeight: 1.5,
                          boxSizing: "border-box",
                        }}
                      />
                    </AuroraField>
                    {rejectError && (
                      <div
                        role="alert"
                        style={{
                          fontSize: 12,
                          color: "var(--state-danger-fg)",
                          background: "var(--state-danger-bg)",
                          border: "1px solid var(--state-danger-border)",
                          borderRadius: 6,
                          padding: "8px 10px",
                        }}
                      >
                        {rejectError}
                      </div>
                    )}
                  </div>
                ),
                actions: [
                  {
                    label: "Vazgeç",
                    variant: "ghost",
                    onClick: closeRejectDrawer,
                  },
                  { spacer: true },
                  {
                    label: reject.isPending ? "Kaydediliyor…" : "Reddet",
                    variant: "danger",
                    onClick: submitReject,
                  },
                ],
              }
            : null
        }
        onClose={closeRejectDrawer}
      />

      <AuroraDetailDrawer
        item={
          approveAllOpen
            ? {
                breadcrumb: "Review · Toplu onay",
                title: "Tüm kayıtları onayla",
                children: (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-primary)",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>{records.length}</strong> kayıt{" "}
                      <code>pending_review → approved</code> geçişi yapacak.
                      Onaylanan kayıtlar zamanlama veya yayın akışına
                      ilerleyecektir.
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      Bu işlem geri alınamaz. Backend başarısız olan kayıtları
                      ayrı raporlayacak.
                    </div>
                  </div>
                ),
                actions: [
                  {
                    label: "Vazgeç",
                    variant: "ghost",
                    onClick: () => setApproveAllOpen(false),
                  },
                  { spacer: true },
                  {
                    label: approve.isPending
                      ? "Onaylanıyor…"
                      : `Evet, ${records.length} kaydı onayla`,
                    variant: "primary",
                    onClick: confirmApproveAll,
                  },
                ],
              }
            : null
        }
        onClose={() => setApproveAllOpen(false)}
      />
    </div>
  );
}
