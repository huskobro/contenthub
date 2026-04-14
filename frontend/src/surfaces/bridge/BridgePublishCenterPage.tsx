/**
 * BridgePublishCenterPage — review-board ops override for admin.publish.center
 *
 * Faz 2 — Bridge prototype.
 *
 * Presents the same publish records as the legacy Publish Center page but as
 * a columnar review board. Columns are the canonical review/publish states
 * from the BACKEND state machine (no new states invented).
 *
 * Contract preservation:
 *   - Data: usePublishRecords — same params and same types
 *   - State machine: columns are READ-ONLY. Operators still transition records
 *     via the Publish Detail page (opened by clicking a card). This override
 *     does NOT bypass the review gate or any mutation endpoint.
 *   - Routes: still uses /admin/publish/:id as the detail link
 *   - Fallback: inactive when bridge is not resolved
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePublishRecords } from "../../hooks/usePublish";
import type { PublishRecordSummary } from "../../api/publishApi";
import { SchedulerHealthBadge } from "../../components/publish/SchedulerHealthBadge";
import { PublishErrorChip } from "../../components/publish/PublishErrorChip";

// ---------------------------------------------------------------------------
// Board model — each column maps to backend statuses. We DO NOT invent new
// states; we only group what the backend already returns.
// ---------------------------------------------------------------------------

interface BoardColumn {
  id: string;
  label: string;
  statuses: string[];
  accent: string; // tailwind text color class
}

const BOARD_COLUMNS: BoardColumn[] = [
  {
    id: "draft",
    label: "Taslak",
    statuses: ["draft"],
    accent: "text-neutral-500",
  },
  {
    id: "review",
    label: "Review",
    statuses: ["pending_review"],
    accent: "text-warning-dark",
  },
  {
    id: "approved",
    label: "Onaylandi",
    statuses: ["approved"],
    accent: "text-brand-700",
  },
  {
    id: "scheduled",
    label: "Zamanlandi",
    statuses: ["scheduled", "publishing"],
    accent: "text-brand-600",
  },
  {
    id: "published",
    label: "Yayinda",
    statuses: ["published"],
    accent: "text-success-dark",
  },
  {
    id: "failed",
    label: "Hata / Iptal",
    statuses: ["failed", "cancelled", "review_rejected"],
    accent: "text-error",
  },
];

const STATUS_LABEL: Record<string, string> = {
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

function statusTint(status: string): string {
  if (status === "published") return "bg-success-light text-success-dark border-success";
  if (status === "approved" || status === "scheduled" || status === "publishing")
    return "bg-brand-50 text-brand-700 border-brand-300";
  if (status === "pending_review") return "bg-warning-light text-warning-dark border-warning";
  if (status === "failed" || status === "cancelled" || status === "review_rejected")
    return "bg-error-light text-error-dark border-error";
  return "bg-neutral-100 text-neutral-700 border-border-subtle";
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "\u2014";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR", { month: "short", day: "numeric" });
  } catch {
    return "\u2014";
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function BridgePublishCenterPage() {
  const navigate = useNavigate();
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [moduleFilter, setModuleFilter] = useState<string>("");

  const { data, isLoading, isError } = usePublishRecords({
    platform: platformFilter || undefined,
    content_ref_type: moduleFilter || undefined,
    limit: 200,
    offset: 0,
  });

  const items: PublishRecordSummary[] = data ?? [];

  // Status-level sub-filter: when set, only show records with this exact
  // status. Columns outside of its bucket go empty. Useful for drilling
  // without leaving the board.
  const [statusFocus, setStatusFocus] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!statusFocus) return items;
    return items.filter((r) => r.status === statusFocus);
  }, [items, statusFocus]);

  const columns = useMemo(() => {
    return BOARD_COLUMNS.map((col) => ({
      ...col,
      records: filteredItems.filter((r) => col.statuses.includes(r.status)),
    }));
  }, [filteredItems]);

  const total = items.length;
  const totalFiltered = filteredItems.length;

  // Attention-needs bucket: pending_review + failed. Surfaces a quick ops
  // indicator above the board so an operator can see "there are 3 items
  // that need me right now" without scanning all columns.
  const needsAttention = useMemo(() => {
    return items.filter(
      (r) =>
        r.status === "pending_review" ||
        r.status === "failed" ||
        r.status === "review_rejected",
    ).length;
  }, [items]);

  return (
    <div className="flex flex-col gap-3" data-testid="bridge-publish-center">
      {/* ---- Header ----------------------------------------------------- */}
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <h1 className="m-0 text-lg font-semibold text-neutral-900">Yayin Review Board</h1>
          <p className="m-0 text-xs text-neutral-500">
            Review gate'e sadik, state-machine uyumlu ops gorunumu.
          </p>
          <div className="mt-1">
            <SchedulerHealthBadge />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-2 py-1 text-xs border border-border-subtle rounded-md bg-surface-page text-neutral-700"
            data-testid="bridge-publish-platform-filter"
          >
            <option value="">Tum platformlar</option>
            <option value="youtube">YouTube</option>
          </select>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-2 py-1 text-xs border border-border-subtle rounded-md bg-surface-page text-neutral-700"
            data-testid="bridge-publish-module-filter"
          >
            <option value="">Tum moduller</option>
            <option value="standard_video">Standart Video</option>
            <option value="news_bulletin">Haber Bulteni</option>
          </select>
          <span className="text-xs text-neutral-500 tabular-nums" data-testid="bridge-publish-total">
            Toplam: <span className="font-semibold text-neutral-700">{total}</span>
            {statusFocus && (
              <span className="ml-1 text-neutral-400">
                · filtreli: <span className="font-semibold text-neutral-700">{totalFiltered}</span>
              </span>
            )}
          </span>
          {needsAttention > 0 && (
            <span
              className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-warning bg-warning-light text-warning-dark"
              data-testid="bridge-publish-attention"
              title="Review bekleyen veya basarisiz kayit sayisi"
            >
              dikkat: {needsAttention}
            </span>
          )}
        </div>
      </div>

      {/* ---- Status focus chips ------------------------------------------ */}
      {/* Clicking a chip pins that exact status as a sub-filter.           */}
      {/* Clicking the active chip clears it.                               */}
      <div
        className="flex items-center gap-1 flex-wrap"
        data-testid="bridge-publish-status-chips"
      >
        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mr-1">
          odak:
        </span>
        {Object.entries(STATUS_LABEL).map(([key, label]) => {
          const active = statusFocus === key;
          const count = items.filter((r) => r.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setStatusFocus(active ? null : key)}
              disabled={count === 0}
              className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-surface-page text-neutral-600 border-border-subtle hover:border-brand-400"
              }`}
              data-testid={`bridge-publish-chip-${key}`}
            >
              {label} · {count}
            </button>
          );
        })}
        {statusFocus && (
          <button
            onClick={() => setStatusFocus(null)}
            className="text-[10px] text-neutral-500 hover:text-neutral-800 underline bg-transparent border-none cursor-pointer p-0 ml-1"
            data-testid="bridge-publish-clear-focus"
          >
            temizle
          </button>
        )}
      </div>

      {isLoading && <p className="m-0 text-xs text-neutral-500">Yukleniyor...</p>}
      {isError && (
        <p className="m-0 text-xs text-error">Yayin kayitlari yuklenirken hata olustu.</p>
      )}

      {/* ---- Board ------------------------------------------------------ */}
      {!isLoading && !isError && (
        <div
          className="grid gap-2 items-start"
          style={{ gridTemplateColumns: `repeat(${BOARD_COLUMNS.length}, minmax(180px, 1fr))` }}
          data-testid="bridge-publish-board"
        >
          {columns.map((col) => (
            <div
              key={col.id}
              className="border border-border-subtle rounded-md bg-surface-page flex flex-col"
              data-testid={`bridge-publish-column-${col.id}`}
            >
              <div className="px-3 py-2 border-b border-border-subtle bg-surface-inset flex items-center justify-between sticky top-0 z-10">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${col.accent}`}>
                  {col.label}
                </span>
                <span
                  className="text-[10px] font-mono text-neutral-500 tabular-nums px-1.5 py-0.5 rounded bg-surface-page border border-border-subtle"
                  data-testid={`bridge-publish-column-count-${col.id}`}
                >
                  {col.records.length}
                </span>
              </div>
              <div className="p-2 flex flex-col gap-1.5 min-h-[140px] max-h-[calc(100vh-300px)] overflow-y-auto">
                {col.records.length === 0 && (
                  <div
                    className="flex flex-col items-center justify-center gap-0.5 py-4 text-center"
                    data-testid={`bridge-publish-column-empty-${col.id}`}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-300">
                      —
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {statusFocus ? "odak disinda" : "bu kolonda kayit yok"}
                    </span>
                  </div>
                )}
                {col.records.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/admin/publish/${r.id}`)}
                    className="text-left bg-surface-page border border-border-subtle rounded p-2 hover:border-brand-400 hover:bg-brand-50 cursor-pointer transition-colors flex flex-col gap-1"
                    data-testid={`bridge-publish-card-${r.id}`}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className={`px-1 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded border ${statusTint(
                          r.status,
                        )}`}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500 ml-auto">
                        {r.platform}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-700 font-mono truncate">
                      {r.content_ref_type === "standard_video" ? "VID" : "NWB"}{" "}
                      <span className="text-neutral-500">{r.content_ref_id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                      <span>review: {r.review_state}</span>
                      {r.publish_attempt_count > 0 && (
                        <span className="ml-auto text-warning-dark">
                          d:{r.publish_attempt_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                      <span>sch: {formatDateShort(r.scheduled_at)}</span>
                      <span>pub: {formatDateShort(r.published_at)}</span>
                    </div>
                    {r.status === "failed" && r.last_error_category && (
                      <div className="mt-1">
                        <PublishErrorChip category={r.last_error_category} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
