/**
 * Gate 4 (Z-2) — Dedicated review queue page.
 *
 * Pre-filters publish records to status=pending_review and offers focused
 * approve/reject bulk tooling. Detail navigation goes through the same
 * /admin/publish/:id detail page (no parallel state machine surface).
 *
 * Differences from PublishCenterPage:
 *   - Status filter is locked to pending_review.
 *   - Only Approve + Reject bulk actions are exposed (Cancel/Retry don't
 *     belong here — those operate on later states).
 *   - Each row shows when the record was submitted for review and which
 *     module it came from for queue triage.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useBulkApprovePublishRecords,
  useBulkRejectPublishRecords,
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
import { SchedulerHealthBadge } from "../../components/publish/SchedulerHealthBadge";
import { formatDateShort } from "../../lib/formatDate";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

const PAGE_SIZE = 50;

/**
 * Surface override trampoline — Aurora ve diğer surface'lerin bu sayfayı
 * `admin.publish.review-queue` override key'i ile değiştirebilmesi için.
 * Override yoksa veya pasifse legacy implementation çalışır (default davranış).
 */
export function PublishReviewQueuePage() {
  const Override = useSurfacePageOverride("admin.publish.review-queue");
  if (Override) return <Override />;
  return <LegacyPublishReviewQueuePage />;
}

function formatDate(iso: string | null) {
  return formatDateShort(iso, "\u2014");
}

function summarizeBulk(resp: BulkActionResponse | undefined): string {
  if (!resp) return "";
  if (resp.failed === 0) return `${resp.succeeded} kayıt başarıyla işlendi.`;
  if (resp.succeeded === 0) return `${resp.failed} kayıt başarısız oldu.`;
  return `${resp.succeeded} başarılı, ${resp.failed} başarısız.`;
}

function LegacyPublishReviewQueuePage() {
  const navigate = useNavigate();
  const [platformFilter, setPlatformFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<string | null>(null);

  const { data, isLoading, isError } = usePublishRecords({
    status: "pending_review",
    platform: platformFilter || undefined,
    content_ref_type: moduleFilter || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const items = data ?? [];

  const bulkApprove = useBulkApprovePublishRecords();
  const bulkReject = useBulkRejectPublishRecords();

  const allSelected = useMemo(
    () => items.length > 0 && items.every((i) => selected.has(i.id)),
    [items, selected],
  );
  const someSelected = useMemo(
    () => items.some((i) => selected.has(i.id)) && !allSelected,
    [items, selected, allSelected],
  );

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
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
    setBanner(`Onay: ${summarizeBulk(resp)}`);
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
      setBanner("Reddetme iptal edildi: neden girilmedi.");
      return;
    }
    const resp = await bulkReject.mutateAsync({
      record_ids: ids,
      rejection_reason: reason.trim(),
    });
    setBanner(`Reddetme: ${summarizeBulk(resp)}`);
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
          data-testid="review-select-all"
        />
      ) as unknown as string,
      render: (r: PublishRecordSummary) => (
        <input
          type="checkbox"
          aria-label={`Seç ${r.id.slice(0, 8)}`}
          checked={selected.has(r.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleOne(r.id)}
          data-testid={`review-select-${r.id}`}
        />
      ),
    },
    {
      key: "module",
      header: "Modül",
      render: (r: PublishRecordSummary) => (
        <span className="text-sm text-neutral-700">
          {r.content_ref_type === "standard_video" ? "Video" : "Bülten"}
        </span>
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
        <StatusBadge status="warning" label="Review Bekliyor" />
      ),
    },
    {
      key: "review_state",
      header: "Review",
      render: (r: PublishRecordSummary) => (
        <span className="text-xs text-neutral-600">{r.review_state}</span>
      ),
    },
    {
      key: "submitted",
      header: "Gönderildi",
      render: (r: PublishRecordSummary) => (
        <span className="text-xs text-neutral-500">{formatDate(r.created_at)}</span>
      ),
    },
    {
      key: "ref",
      header: "İçerik",
      render: (r: PublishRecordSummary) => (
        <code className="text-xs text-neutral-500">{r.content_ref_id.slice(0, 8)}</code>
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
          data-testid={`review-detail-${r.id}`}
        >
          Detay
        </ActionButton>
      ),
    },
  ];

  const bulkPending = bulkApprove.isPending || bulkReject.isPending;

  const bulkActions = [
    { label: "Onayla", onClick: runBulkApprove },
    { label: "Reddet", variant: "danger" as const, onClick: runBulkReject },
  ];

  return (
    <PageShell
      title="Review Kuyruğu"
      subtitle="Yayın öncesi onay bekleyen kayıtlar. Sadece review aşamasındaki kayıtlar listelenir."
      testId="publish-review-queue"
      actions={<SchedulerHealthBadge />}
    >
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="review-workflow-note">
        Pending Review &rarr; Onay &rarr; Zamanlama / Yayın
      </p>

      {banner && (
        <div
          className="mb-3 px-3 py-2 text-xs rounded-sm border border-info/30 bg-info/10 text-info"
          data-testid="review-bulk-banner"
        >
          {banner}
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="ml-3 text-neutral-500 hover:text-neutral-700 bg-transparent border-none cursor-pointer"
          >
            kapat
          </button>
        </div>
      )}

      <div className="mb-4">
        <FilterBar testId="review-filters">
          <FilterSelect
            value={platformFilter}
            onChange={(e) => { setPlatformFilter(e.target.value); setOffset(0); }}
            data-testid="review-platform-filter"
          >
            <option value="">Tüm Platformlar</option>
            <option value="youtube">YouTube</option>
          </FilterSelect>
          <FilterSelect
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setOffset(0); }}
            data-testid="review-module-filter"
          >
            <option value="">Tüm Modüller</option>
            <option value="standard_video">Standart Video</option>
            <option value="news_bulletin">Haber Bülteni</option>
          </FilterSelect>
          {(platformFilter || moduleFilter) && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => { setPlatformFilter(""); setModuleFilter(""); setOffset(0); }}
              data-testid="review-filter-clear"
            >
              Temizle
            </ActionButton>
          )}
        </FilterBar>
      </div>

      <BulkActionBar
        selectedCount={selected.size}
        actions={bulkActions.map((a) => ({
          ...a,
          onClick: bulkPending ? () => {} : a.onClick,
        }))}
        onClear={clearSelection}
      />

      <SectionShell
        flush
        title={`Bekleyen Review (${items.length})`}
        testId="review-list"
      >
        <DataTable<PublishRecordSummary>
          columns={columns}
          data={items}
          keyFn={(r) => r.id}
          loading={isLoading}
          error={isError}
          errorMessage="Review kuyruğu yüklenirken hata oluştu."
          emptyMessage="Onay bekleyen kayıt yok."
          testId="review-table"
        />
        <Pagination
          offset={offset}
          limit={PAGE_SIZE}
          total={items.length}
          onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          onNext={() => setOffset(offset + PAGE_SIZE)}
          testId="review-pagination"
        />
      </SectionShell>
    </PageShell>
  );
}
