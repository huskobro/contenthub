/**
 * AuroraPublishCenterPage — Aurora Dusk Cockpit / Yayın Merkezi.
 *
 * Direct port of `ContentHub_Design _System/contenthub/pages/admin/publish.html`:
 *   - Page-head (title + count + Takvim / Tümünü onayla aksiyonları)
 *   - 3 tab: Onay kuyruğu / Onaylandı / Kanallar
 *   - Onay kuyruğu list (thumb, title, meta, schedule, approve/reject btns)
 *   - Onaylandı list (read-only chip + actions)
 *   - Kanallar grid (channel-card with subs + pending badge)
 *   - Inspector: Bekleyen onaylar, Kanallar, Hızlı işlemler
 *
 * Backend: usePublishRecords + useBulkApprove/Reject mutations.
 * Surface override key: `admin.publish.center`.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  usePublishRecords,
  useBulkApprovePublishRecords,
  useBulkCancelPublishRecords,
  useBulkRejectPublishRecords,
  useBulkRetryPublishRecords,
} from "../../hooks/usePublish";
import type { PublishRecordSummary } from "../../api/publishApi";
import { useToast } from "../../hooks/useToast";
import { Icon } from "./icons";
import {
  AuroraDetailDrawer,
  AuroraField,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
} from "./primitives";
import { PublishBoard } from "../../components/publish/PublishBoard";

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

function platformIcon(platform: string): string {
  switch (platform.toLowerCase()) {
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

const REVIEW_LABEL: Record<string, string> = {
  pending_review: "İnceleme bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  none: "—",
};

export function AuroraPublishCenterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: recordsData, isLoading } = usePublishRecords();
  const records: PublishRecordSummary[] = useMemo(
    () => recordsData ?? [],
    [recordsData],
  );

  type TabId = "queue" | "approved" | "channels" | "board";
  const TAB_STORAGE_KEY = "aurora.publish.center.default_view.v1";
  const [tab, setTab] = useState<TabId>(() => {
    try {
      const stored = localStorage.getItem(TAB_STORAGE_KEY);
      if (stored === "queue" || stored === "approved" || stored === "channels" || stored === "board") {
        return stored;
      }
    } catch {
      /* localStorage erişim engelli olabilir */
    }
    return "queue";
  });
  const setTabPersist = (next: TabId) => {
    setTab(next);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      /* yoksay */
    }
  };
  const [pending, setPending] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBanner, setBulkBanner] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);

  // Reject drawer — hem tek kayıt hem toplu reddetmeyi aynı Aurora-native
  // gerekçe formu üzerinden yürütür. window.prompt artık kullanılmıyor.
  type RejectMode =
    | { kind: "single"; recordId: string }
    | { kind: "bulk"; recordIds: string[] };
  const [rejectMode, setRejectMode] = useState<RejectMode | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  const closeRejectDrawer = () => {
    setRejectMode(null);
    setRejectReason("");
    setRejectError(null);
  };

  const approve = useBulkApprovePublishRecords();
  const reject = useBulkRejectPublishRecords();
  const cancel = useBulkCancelPublishRecords();
  const retry = useBulkRetryPublishRecords();

  const queue = useMemo(
    () =>
      records
        .filter((r) => r.review_state === "pending_review")
        .filter((r) => !channelFilter || r.platform === channelFilter),
    [records, channelFilter],
  );
  const approved = useMemo(
    () =>
      records
        .filter(
          (r) => r.review_state === "approved" || r.status === "scheduled",
        )
        .filter((r) => !channelFilter || r.platform === channelFilter),
    [records, channelFilter],
  );
  const channels = useMemo(() => {
    const map = new Map<
      string,
      { platform: string; total: number; pending: number; latest: string | null }
    >();
    records.forEach((r) => {
      const k = r.platform;
      const cur = map.get(k) ?? {
        platform: k,
        total: 0,
        pending: 0,
        latest: null,
      };
      cur.total++;
      if (r.review_state === "pending_review") cur.pending++;
      if (
        r.scheduled_at &&
        (cur.latest == null || r.scheduled_at > cur.latest)
      )
        cur.latest = r.scheduled_at;
      map.set(k, cur);
    });
    return Array.from(map.values());
  }, [records]);

  const onApprove = (id: string) => {
    setPending((p) => [...p, id]);
    approve.mutate(
      { record_ids: [id] },
      {
        onSuccess: () => {
          toast.success("Onaylandı");
          setPending((p) => p.filter((x) => x !== id));
        },
        onError: () => {
          toast.error("Onaylama başarısız");
          setPending((p) => p.filter((x) => x !== id));
        },
      },
    );
  };

  const onReject = (id: string) => {
    setRejectMode({ kind: "single", recordId: id });
    setRejectReason("");
    setRejectError(null);
  };

  const submitSingleReject = (recordId: string) => {
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectError("Gerekçe zorunlu — audit log'a kaydedilecek.");
      return;
    }
    setPending((p) => [...p, recordId]);
    reject.mutate(
      { record_ids: [recordId], rejection_reason: trimmed },
      {
        onSuccess: () => {
          toast.success("Reddedildi");
          setPending((p) => p.filter((x) => x !== recordId));
          closeRejectDrawer();
        },
        onError: () => {
          toast.error("Reddetme başarısız");
          setPending((p) => p.filter((x) => x !== recordId));
          setRejectError(
            "Sunucu hatası — yeniden denemek için form açık bırakılabilir.",
          );
        },
      },
    );
  };

  const onApproveAll = () => {
    if (queue.length === 0) return;
    approve.mutate(
      { record_ids: queue.map((r) => r.id) },
      {
        onSuccess: () => toast.success(`${queue.length} kayıt onaylandı`),
        onError: () => toast.error("Toplu onaylama başarısız"),
      },
    );
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());
  const selectAllInQueue = () => {
    setSelected(new Set(queue.map((r) => r.id)));
  };

  type BulkResult = { success: number; failed: number };
  const summarizeBulk = (action: string, res: BulkResult) => {
    if (res.failed === 0) {
      setBulkBanner(`${action}: ${res.success} kayıt başarılı`);
      toast.success(`${action}: ${res.success} kayıt`);
    } else if (res.success === 0) {
      setBulkBanner(`${action} başarısız: ${res.failed} kayıt`);
      toast.error(`${action} başarısız: ${res.failed} kayıt`);
    } else {
      setBulkBanner(
        `${action}: ${res.success} başarılı · ${res.failed} başarısız`,
      );
      toast.success(
        `${action}: ${res.success} başarılı · ${res.failed} başarısız`,
      );
    }
  };

  const runBulkApprove = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      const res = await approve.mutateAsync({ record_ids: ids });
      summarizeBulk(
        "Toplu onayla",
        { success: res.succeeded, failed: res.failed },
      );
      clearSelection();
    } catch {
      toast.error("Toplu onaylama isteği başarısız");
    }
  };

  const runBulkReject = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setRejectMode({ kind: "bulk", recordIds: ids });
    setRejectReason("");
    setRejectError(null);
  };

  const submitBulkReject = async (ids: string[]) => {
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectError("Gerekçe zorunlu — audit log'a kaydedilecek.");
      return;
    }
    try {
      const res = await reject.mutateAsync({
        record_ids: ids,
        rejection_reason: trimmed,
      });
      summarizeBulk(
        "Toplu reddet",
        { success: res.succeeded, failed: res.failed },
      );
      clearSelection();
      closeRejectDrawer();
    } catch {
      toast.error("Toplu reddetme isteği başarısız");
      setRejectError("Sunucu hatası — formu açık bırakıp tekrar deneyebilirsiniz.");
    }
  };

  const handleRejectSubmit = () => {
    if (!rejectMode) return;
    if (rejectMode.kind === "single") {
      submitSingleReject(rejectMode.recordId);
    } else {
      void submitBulkReject(rejectMode.recordIds);
    }
  };

  const runBulkCancel = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      const res = await cancel.mutateAsync({ record_ids: ids });
      summarizeBulk(
        "Toplu iptal",
        { success: res.succeeded, failed: res.failed },
      );
      clearSelection();
    } catch {
      toast.error("Toplu iptal isteği başarısız");
    }
  };

  const runBulkRetry = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      const res = await retry.mutateAsync({ record_ids: ids });
      summarizeBulk(
        "Toplu tekrar dene",
        { success: res.succeeded, failed: res.failed },
      );
      clearSelection();
    } catch {
      toast.error("Toplu tekrar dene isteği başarısız");
    }
  };

  const bulkBusy =
    approve.isPending || reject.isPending || cancel.isPending || retry.isPending;

  const inspector = (
    <AuroraInspector title="Yayın durumu">
      <AuroraInspectorSection title="Bekleyen onaylar">
        <AuroraInspectorRow label="toplam" value={String(queue.length)} />
        <AuroraInspectorRow label="onaylanmış" value={String(approved.length)} />
        <AuroraInspectorRow label="kanal sayısı" value={String(channels.length)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Kanallar">
        {channels.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Kanal kaydı yok
          </div>
        ) : (
          channels.map((ch) => (
            <div
              key={ch.platform}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span style={{ fontSize: 16 }}>{platformIcon(ch.platform)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    textTransform: "capitalize",
                  }}
                >
                  {ch.platform}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                  }}
                >
                  {ch.total} kayıt
                </div>
              </div>
              {ch.pending > 0 && (
                <span className="chip warn" style={{ height: 18, fontSize: 9 }}>
                  {ch.pending}
                </span>
              )}
            </div>
          ))
        )}
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Hızlı işlemler">
        <button
          type="button"
          className="btn primary sm"
          style={{ width: "100%", marginBottom: 6 }}
          disabled={queue.length === 0 || approve.isPending}
          onClick={onApproveAll}
        >
          Tümünü onayla
        </button>
        <button
          type="button"
          className="btn secondary sm"
          style={{ width: "100%" }}
          onClick={() => navigate("/admin/jobs")}
        >
          İş kayıtları
        </button>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-publish">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Yayın merkezi</h1>
            <div className="sub">
              {isLoading
                ? "Yükleniyor…"
                : `${queue.length} onay bekliyor · ${approved.length} onaylandı · SSE canlı`}
            </div>
          </div>
          <div className="hstack">
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => navigate("/admin/calendar")}
              data-testid="aurora-publish-calendar-link"
            >
              <Icon name="calendar" size={12} /> Takvim görünümü
            </button>
            <button
              type="button"
              className="btn primary sm"
              disabled={queue.length === 0 || approve.isPending}
              onClick={onApproveAll}
            >
              <Icon name="send" size={12} /> Tümünü onayla
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="pub-tabs">
          {(
            [
              { id: "queue", label: "Onay kuyruğu", count: queue.length },
              { id: "approved", label: "Onaylandı", count: approved.length },
              { id: "board", label: "Board (Kanban)", count: queue.length + approved.length },
              { id: "channels", label: "Kanallar", count: channels.length },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              className={"tab" + (tab === t.id ? " active" : "")}
              onClick={() => setTabPersist(t.id)}
            >
              {t.label} <span className="count">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Aktif kanal filtresi chip'i — Kanallar tab'ında karta tıklayınca set
            edilir; queue/approved'de filtrelemeyi gösterir, x ile temizler. */}
        {channelFilter && (tab === "queue" || tab === "approved") && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              marginBottom: 12,
              borderRadius: 8,
              background: "var(--bg-inset)",
              border: "1px solid var(--border-subtle)",
              fontSize: 12,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Filtre:</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
                textTransform: "capitalize",
              }}
            >
              {channelFilter}
            </span>
            <button
              type="button"
              onClick={() => setChannelFilter(null)}
              aria-label="Kanal filtresini temizle"
              style={{
                appearance: "none",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "0 4px",
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Bulk action bar — sadece queue/approved tabında ve seçim varsa */}
        {(tab === "queue" || tab === "approved") && selected.size > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              marginBottom: 12,
              borderRadius: 8,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
            }}
            data-testid="aurora-publish-bulkbar"
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {selected.size} kayıt seçili
            </span>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="btn primary sm"
              disabled={bulkBusy}
              onClick={runBulkApprove}
            >
              <Icon name="check" size={11} /> Onayla
            </button>
            <button
              type="button"
              className="btn secondary sm"
              disabled={bulkBusy}
              onClick={runBulkReject}
            >
              <Icon name="x" size={11} /> Reddet
            </button>
            <button
              type="button"
              className="btn secondary sm"
              disabled={bulkBusy}
              onClick={runBulkCancel}
            >
              İptal et
            </button>
            <button
              type="button"
              className="btn secondary sm"
              disabled={bulkBusy}
              onClick={runBulkRetry}
            >
              Tekrar dene
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={clearSelection}
              disabled={bulkBusy}
            >
              Temizle
            </button>
          </div>
        )}

        {bulkBanner && (
          <div
            style={{
              padding: "8px 12px",
              marginBottom: 12,
              borderRadius: 6,
              background: "var(--state-info-bg, rgba(99,102,241,0.08))",
              border: "1px solid var(--state-info-border, rgba(99,102,241,0.3))",
              color: "var(--text-primary)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            data-testid="aurora-publish-bulkbanner"
          >
            <span style={{ flex: 1 }}>{bulkBanner}</span>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setBulkBanner(null)}
            >
              Kapat
            </button>
          </div>
        )}

        {/* Queue */}
        {tab === "queue" && (
          <div className="card publish-queue">
            {queue.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    queue.length > 0 &&
                    queue.every((r) => selected.has(r.id))
                  }
                  onChange={(e) =>
                    e.target.checked ? selectAllInQueue() : clearSelection()
                  }
                  aria-label="Tümünü seç"
                />
                <span>Tümünü seç ({queue.length})</span>
              </div>
            )}
            {queue.length === 0 ? (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <Icon name="check" size={28} />
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  Tüm içerikler onaylandı
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Bekleyen onay kalmadı
                </div>
              </div>
            ) : (
              queue.map((item) => {
                const isPending = pending.includes(item.id);
                const isSelected = selected.has(item.id);
                return (
                  <div key={item.id} className="pq-item">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(item.id)}
                      aria-label={`Seç ${item.id}`}
                      style={{ marginRight: 4 }}
                    />
                    <div className="pq-thumb">
                      <div className="overlay" />
                      <Icon name="film" size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="pq-title">
                        {item.content_ref_id || item.id}
                      </div>
                      <div className="pq-meta">
                        <span style={{ fontFamily: "var(--font-mono)" }}>
                          {item.id.slice(0, 12)}
                        </span>
                        <span className="sep">·</span>
                        <span style={{ color: "var(--accent-primary-hover)" }}>
                          {item.platform}
                        </span>
                        <span className="sep">·</span>
                        <span>{item.content_ref_type}</span>
                        {item.last_error_category && (
                          <>
                            <span className="sep">·</span>
                            <span style={{ color: "var(--state-danger-fg)" }}>
                              {item.last_error_category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="pq-schedule">
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          marginBottom: 2,
                        }}
                      >
                        ZAMANLANMIŞ
                      </div>
                      <div className="v">{fmtDateTime(item.scheduled_at)}</div>
                    </div>
                    <button
                      type="button"
                      className="approve-btn"
                      disabled={isPending}
                      onClick={() => onApprove(item.id)}
                    >
                      <Icon name="check" size={11} /> Onayla
                    </button>
                    <button
                      type="button"
                      className="reject-btn"
                      disabled={isPending}
                      onClick={() => onReject(item.id)}
                    >
                      <Icon name="x" size={11} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Approved */}
        {tab === "approved" && (
          <div className="card publish-queue">
            {approved.length === 0 ? (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                Henüz onaylanmış kayıt yok
              </div>
            ) : (
              approved.map((item) => (
                <div key={item.id} className="pq-item">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelected(item.id)}
                    aria-label={`Seç ${item.id}`}
                    style={{ marginRight: 4 }}
                  />
                  <div className="pq-thumb">
                    <div className="overlay" />
                    <Icon name="film" size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="pq-title">
                      {item.content_ref_id || item.id}
                    </div>
                    <div className="pq-meta">
                      <span style={{ fontFamily: "var(--font-mono)" }}>
                        {item.id.slice(0, 12)}
                      </span>
                      <span className="sep">·</span>
                      <span style={{ color: "var(--accent-primary-hover)" }}>
                        {item.platform}
                      </span>
                    </div>
                  </div>
                  <div className="pq-schedule">
                    <div className="v">{fmtDateTime(item.scheduled_at)}</div>
                  </div>
                  <span className="chip ok" style={{ height: 22 }}>
                    <span className="dot" />
                    {REVIEW_LABEL[item.review_state] ?? item.review_state}
                  </span>
                  <button
                    type="button"
                    className="btn ghost sm icon"
                    onClick={() => navigate(`/admin/jobs/${item.job_id}`)}
                    title="Job detayı"
                  >
                    <Icon name="more-horizontal" size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Board (Kanban) */}
        {tab === "board" && (
          <div className="card" style={{ padding: 12 }}>
            {records.length === 0 ? (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                Yayın kaydı yok — Board boş
              </div>
            ) : (
              <PublishBoard
                records={records}
                selectedIds={selected}
                onOpen={(r) => navigate(`/admin/publish/${r.id}`)}
              />
            )}
          </div>
        )}

        {/* Channels */}
        {tab === "channels" && (
          <div className="grid g-3">
            {channels.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "48px 20px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                Kanal kaydı yok
              </div>
            ) : (
              channels.map((ch) => (
                <button
                  key={ch.platform}
                  type="button"
                  className="channel-card channel-card-click"
                  onClick={() => {
                    setChannelFilter(ch.platform);
                    setTabPersist(ch.pending > 0 ? "queue" : "approved");
                  }}
                  aria-label={`${ch.platform} kanalına ait kayıtları aç (${ch.total} kayıt)`}
                >
                  <div className="channel-icon">{platformIcon(ch.platform)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="channel-name" style={{ textTransform: "capitalize" }}>
                      {ch.platform}
                    </div>
                    <div className="channel-handle">
                      {ch.total} kayıt · son: {fmtDateTime(ch.latest)}
                    </div>
                  </div>
                  {ch.pending > 0 && (
                    <span className="chip warn">
                      <span className="dot" />
                      {ch.pending} bekliyor
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="aurora-inspector-slot">{inspector}</div>

      <AuroraDetailDrawer
        item={
          rejectMode
            ? {
                breadcrumb:
                  rejectMode.kind === "single"
                    ? "Publish · Reddet"
                    : "Publish · Toplu reddet",
                title:
                  rejectMode.kind === "single"
                    ? "Kaydı reddet"
                    : `${rejectMode.recordIds.length} kaydı reddet`,
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
                      Red gerekçesi <strong>zorunludur</strong> ve audit log'a
                      kaydedilir.{" "}
                      {rejectMode.kind === "bulk"
                        ? `Seçili ${rejectMode.recordIds.length} kayıt`
                        : "Bu kayıt"}{" "}
                      <code>pending_review → rejected</code> geçişi yapacak.
                    </div>
                    <AuroraField
                      label="Gerekçe"
                      htmlFor="aurora-publish-reject-reason"
                    >
                      <textarea
                        id="aurora-publish-reject-reason"
                        value={rejectReason}
                        onChange={(e) => {
                          setRejectReason(e.target.value);
                          if (rejectError) setRejectError(null);
                        }}
                        placeholder="Ör: içerik politikasına uymuyor, metadata eksik…"
                        rows={5}
                        autoFocus
                        data-testid="aurora-publish-reject-reason"
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
                    label: reject.isPending
                      ? "Kaydediliyor…"
                      : rejectMode.kind === "single"
                        ? "Reddet"
                        : `${rejectMode.recordIds.length} kaydı reddet`,
                    variant: "danger",
                    onClick: handleRejectSubmit,
                  },
                ],
              }
            : null
        }
        onClose={closeRejectDrawer}
      />
    </div>
  );
}
