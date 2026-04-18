import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useBulkApprovePublishRecords,
  useBulkCancelPublishRecords,
  useBulkRejectPublishRecords,
  useBulkRetryPublishRecords,
  usePublishRecords,
} from "../../hooks/usePublish";
import type {
  BulkActionResponse,
  PublishRecordSummary,
} from "../../api/publishApi";
import {
  ActionButton,
  DataTable,
  FilterBar,
  FilterSelect,
  PageShell,
  Pagination,
  SectionShell,
  StatusBadge,
} from "../../components/design-system/primitives";
import { BulkActionBar } from "../../components/design-system/BulkActionBar";
import { PublishErrorChip } from "../../components/publish/PublishErrorChip";
import { SchedulerHealthBadge } from "../../components/publish/SchedulerHealthBadge";
import { PublishBoard } from "../../components/publish/PublishBoard";
import { formatDateShort } from "../../lib/formatDate";
import { cn } from "../../lib/cn";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

const PAGE_SIZE = 50;

/**
 * Yayin Merkezi gorunum tipi. Legacy tablo varsayilan; "board" kanban-tarzi
 * sutunlara dagilmis kart panosu (P2.5). Kullanici tercihi localStorage
 * anahtari `publish.center.default_view` altinda `{ v: 1, view }` shape ile
 * saklanir. Settings Registry key: `publish.center.default_view`.
 */
type PublishViewMode = "table" | "board";

const PUBLISH_VIEW_STORAGE_KEY = "publish.center.default_view";
const PUBLISH_VIEW_STORAGE_VERSION = 1;

interface StoredPublishView {
  v: number;
  view: PublishViewMode;
}

function loadDefaultPublishView(): PublishViewMode {
  try {
    const raw = window.localStorage.getItem(PUBLISH_VIEW_STORAGE_KEY);
    if (!raw) return "table";
    const parsed = JSON.parse(raw) as StoredPublishView;
    if (parsed?.v !== PUBLISH_VIEW_STORAGE_VERSION) return "table";
    if (parsed.view === "table" || parsed.view === "board") {
      return parsed.view;
    }
  } catch {
    // fallthrough
  }
  return "table";
}

function persistDefaultPublishView(view: PublishViewMode): void {
  try {
    const payload: StoredPublishView = {
      v: PUBLISH_VIEW_STORAGE_VERSION,
      view,
    };
    window.localStorage.setItem(PUBLISH_VIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // storage quota / private mode — ignore silently
  }
}

function formatDate(iso: string | null) {
  return formatDateShort(iso, "\u2014");
}

function publishStatusVariant(status: string): string {
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

/**
 * Public entry point. Delegates to a surface override when the active admin
 * surface declares one for `admin.publish.center` (Faz 2: Bridge review board).
 * Otherwise falls through to the legacy implementation below.
 *
 * The override does NOT bypass the review-gate state machine — it only
 * re-presents the same records. All mutations still happen on the Publish
 * Detail page.
 */
export function PublishCenterPage() {
  const Override = useSurfacePageOverride("admin.publish.center");
  if (Override) return <Override />;
  return <LegacyPublishCenterPage />;
}

function summarizeBulk(resp: BulkActionResponse | undefined): string {
  if (!resp) return "";
  if (resp.failed === 0) {
    return `${resp.succeeded} kayıt başarıyla işlendi.`;
  }
  if (resp.succeeded === 0) {
    return `${resp.failed} kayıt başarısız oldu.`;
  }
  return `${resp.succeeded} başarılı, ${resp.failed} başarısız.`;
}

function LegacyPublishCenterPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [errorFilter, setErrorFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBanner, setBulkBanner] = useState<string | null>(null);
  const [view, setViewInternal] = useState<PublishViewMode>(() =>
    loadDefaultPublishView(),
  );

  function setView(next: PublishViewMode) {
    setViewInternal(next);
    persistDefaultPublishView(next);
  }

  const { data, isLoading, isError } = usePublishRecords({
    status: statusFilter || undefined,
    platform: platformFilter || undefined,
    content_ref_type: moduleFilter || undefined,
    error_category: errorFilter || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const items = data ?? [];
  const hasFilters = !!(statusFilter || platformFilter || moduleFilter || errorFilter);

  const bulkApprove = useBulkApprovePublishRecords();
  const bulkReject = useBulkRejectPublishRecords();
  const bulkCancel = useBulkCancelPublishRecords();
  const bulkRetry = useBulkRetryPublishRecords();

  const allSelected = useMemo(
    () => items.length > 0 && items.every((i) => selected.has(i.id)),
    [items, selected],
  );
  const someSelected = useMemo(
    () => items.some((i) => selected.has(i.id)) && !allSelected,
    [items, selected, allSelected],
  );

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function runBulkApprove() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const resp = await bulkApprove.mutateAsync({ record_ids: ids });
    setBulkBanner(`Onay: ${summarizeBulk(resp)}`);
    clearSelection();
  }

  async function runBulkReject() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const reason = window.prompt(
      "Reddetme nedeni (zorunlu, en az bir karakter):",
      "",
    );
    if (!reason || !reason.trim()) {
      setBulkBanner("Reddetme iptal edildi: neden girilmedi.");
      return;
    }
    const resp = await bulkReject.mutateAsync({
      record_ids: ids,
      rejection_reason: reason.trim(),
    });
    setBulkBanner(`Reddetme: ${summarizeBulk(resp)}`);
    clearSelection();
  }

  async function runBulkCancel() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const resp = await bulkCancel.mutateAsync({ record_ids: ids });
    setBulkBanner(`İptal: ${summarizeBulk(resp)}`);
    clearSelection();
  }

  async function runBulkRetry() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const resp = await bulkRetry.mutateAsync({ record_ids: ids });
    setBulkBanner(`Tekrar dene: ${summarizeBulk(resp)}`);
    clearSelection();
  }

  const columns = [
    {
      key: "_select",
      header: (
        <input
          type="checkbox"
          aria-label="Tümünü seç"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={toggleAll}
          data-testid="publish-select-all"
        />
      ) as unknown as string,
      render: (r: PublishRecordSummary) => (
        <input
          type="checkbox"
          aria-label={`Seç ${r.id.slice(0, 8)}`}
          checked={selected.has(r.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleOne(r.id)}
          data-testid={`publish-select-${r.id}`}
        />
      ),
    },
    {
      key: "content",
      header: "Icerik",
      render: (r: PublishRecordSummary) => (
        <div>
          <span className="font-medium text-neutral-900 text-sm">
            {r.content_ref_type === "standard_video" ? "Video" : "Bulten"}{" "}
          </span>
          <code className="text-xs text-neutral-500">{r.content_ref_id.slice(0, 8)}</code>
        </div>
      ),
    },
    {
      key: "platform",
      header: "Platform",
      render: (r: PublishRecordSummary) => (
        <span className="text-sm capitalize">{r.platform}</span>
      ),
    },
    {
      key: "status",
      header: "Durum",
      render: (r: PublishRecordSummary) => (
        <div className="flex flex-col gap-0.5">
          <StatusBadge status={publishStatusVariant(r.status)} label={statusLabel(r.status)} />
          {r.status === "scheduled" && r.scheduled_at && (
            <span className="text-xs text-neutral-500">Zamanlandi: {formatDate(r.scheduled_at)}</span>
          )}
          {r.status === "failed" && r.last_error_category && (
            <PublishErrorChip category={r.last_error_category} />
          )}
        </div>
      ),
    },
    {
      key: "review",
      header: "Review",
      render: (r: PublishRecordSummary) => (
        <span className="text-xs text-neutral-600">{r.review_state}</span>
      ),
    },
    {
      key: "attempts",
      header: "Deneme",
      render: (r: PublishRecordSummary) => (
        <span className="text-sm">{r.publish_attempt_count}</span>
      ),
    },
    {
      key: "published_at",
      header: "Yayin Tarihi",
      render: (r: PublishRecordSummary) => (
        <span className="text-xs text-neutral-500">{formatDate(r.published_at)}</span>
      ),
    },
    {
      key: "created_at",
      header: "Olusturma",
      render: (r: PublishRecordSummary) => (
        <span className="text-xs text-neutral-500">{formatDate(r.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r: PublishRecordSummary) => (
        <ActionButton
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/publish/${r.id}`);
          }}
          className="text-brand-600"
          data-testid={`publish-detail-${r.id}`}
        >
          Detay
        </ActionButton>
      ),
    },
  ];

  const bulkPending =
    bulkApprove.isPending ||
    bulkReject.isPending ||
    bulkCancel.isPending ||
    bulkRetry.isPending;

  const bulkActions = [
    { label: "Onayla", onClick: runBulkApprove },
    { label: "Reddet", variant: "danger" as const, onClick: runBulkReject },
    { label: "İptal", variant: "danger" as const, onClick: runBulkCancel },
    { label: "Tekrar dene", onClick: runBulkRetry },
  ];

  return (
    <PageShell
      title="Yayin Merkezi"
      subtitle="Publish kayitlari, review gate, zamanlama ve yayin durumu."
      testId="publish-center"
      actions={<SchedulerHealthBadge />}
    >
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="publish-workflow-note">
        Taslak &rarr; Review &rarr; Onay &rarr; Zamanlama/Yayin &rarr; Platform
      </p>

      {bulkBanner && (
        <div
          className="mb-3 px-3 py-2 text-xs rounded-sm border border-info/30 bg-info/10 text-info"
          data-testid="publish-bulk-banner"
        >
          {bulkBanner}
          <button
            type="button"
            onClick={() => setBulkBanner(null)}
            className="ml-3 text-neutral-500 hover:text-neutral-700 bg-transparent border-none cursor-pointer"
          >
            kapat
          </button>
        </div>
      )}

      <div className="mb-4">
        <FilterBar testId="publish-filters">
          <FilterSelect
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
            data-testid="publish-status-filter"
          >
            <option value="">Tum Durumlar</option>
            <option value="draft">Taslak</option>
            <option value="pending_review">Review Bekliyor</option>
            <option value="approved">Onaylandi</option>
            <option value="scheduled">Zamanlandi</option>
            <option value="publishing">Yayinlaniyor</option>
            <option value="published">Yayinda</option>
            <option value="failed">Basarisiz</option>
            <option value="cancelled">Iptal</option>
          </FilterSelect>
          <FilterSelect
            value={platformFilter}
            onChange={(e) => { setPlatformFilter(e.target.value); setOffset(0); }}
            data-testid="publish-platform-filter"
          >
            <option value="">Tum Platformlar</option>
            <option value="youtube">YouTube</option>
          </FilterSelect>
          <FilterSelect
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setOffset(0); }}
            data-testid="publish-module-filter"
          >
            <option value="">Tum Moduller</option>
            <option value="standard_video">Standart Video</option>
            <option value="news_bulletin">Haber Bulteni</option>
          </FilterSelect>
          <FilterSelect
            value={errorFilter}
            onChange={(e) => { setErrorFilter(e.target.value); setOffset(0); }}
            data-testid="publish-error-filter"
          >
            <option value="">Tüm Hatalar</option>
            <option value="token_error">Token hatası</option>
            <option value="quota_exceeded">Kota</option>
            <option value="network">Ağ</option>
            <option value="validation">Doğrulama</option>
            <option value="permission">İzin</option>
            <option value="asset_missing">Asset</option>
            <option value="unknown">Bilinmiyor</option>
          </FilterSelect>
          {hasFilters && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setStatusFilter("");
                setPlatformFilter("");
                setModuleFilter("");
                setErrorFilter("");
                setOffset(0);
              }}
              data-testid="publish-filter-clear"
            >
              Temizle
            </ActionButton>
          )}
        </FilterBar>
      </div>

      <div
        className="mb-3 inline-flex rounded-md border border-neutral-200 bg-white overflow-hidden"
        data-testid="publish-view-toggle"
        role="tablist"
        aria-label="Yayin Merkezi gorunumu"
      >
        <button
          type="button"
          onClick={() => setView("table")}
          data-testid="publish-view-table"
          role="tab"
          aria-selected={view === "table"}
          className={cn(
            "px-3 py-1.5 text-xs transition-colors",
            view === "table"
              ? "bg-brand-50 text-brand-700 font-medium"
              : "text-neutral-600 hover:bg-neutral-50",
          )}
        >
          Tablo
        </button>
        <button
          type="button"
          onClick={() => setView("board")}
          data-testid="publish-view-board"
          role="tab"
          aria-selected={view === "board"}
          className={cn(
            "px-3 py-1.5 text-xs transition-colors border-l border-neutral-200",
            view === "board"
              ? "bg-brand-50 text-brand-700 font-medium"
              : "text-neutral-600 hover:bg-neutral-50",
          )}
        >
          Board
        </button>
      </div>

      {view === "table" && (
        <BulkActionBar
          selectedCount={selected.size}
          actions={bulkActions.map((a) => ({
            ...a,
            onClick: bulkPending ? () => {} : a.onClick,
          }))}
          onClear={clearSelection}
        />
      )}

      <SectionShell flush title={`Yayin Kayitlari (${items.length})`} testId="publish-list">
        {view === "table" ? (
          <>
            <DataTable<PublishRecordSummary>
              columns={columns}
              data={items}
              keyFn={(r) => r.id}
              loading={isLoading}
              error={isError}
              errorMessage="Yayin kayitlari yuklenirken hata olustu."
              emptyMessage="Henuz yayin kaydi bulunmuyor."
              testId="publish-table"
            />
            <Pagination
              offset={offset}
              limit={PAGE_SIZE}
              total={items.length}
              onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              onNext={() => setOffset(offset + PAGE_SIZE)}
              testId="publish-pagination"
            />
          </>
        ) : (
          <div className="p-3">
            {isError ? (
              <div
                className="text-xs text-error-dark bg-error-light border border-error/30 rounded px-3 py-2"
                data-testid="publish-board-error"
              >
                Yayin kayitlari yuklenirken hata olustu.
              </div>
            ) : isLoading ? (
              <div className="text-xs text-neutral-500 text-center py-6" data-testid="publish-board-loading">
                Yukleniyor...
              </div>
            ) : items.length === 0 ? (
              <div className="text-xs text-neutral-400 text-center py-6" data-testid="publish-board-empty-all">
                Henuz yayin kaydi bulunmuyor.
              </div>
            ) : (
              <PublishBoard
                records={items}
                selectedIds={selected}
                onOpen={(r) => navigate(`/admin/publish/${r.id}`)}
              />
            )}
          </div>
        )}
      </SectionShell>
    </PageShell>
  );
}
