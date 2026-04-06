import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePublishRecords } from "../../hooks/usePublish";
import type { PublishRecordSummary } from "../../api/publishApi";
import {
  PageShell,
  SectionShell,
  DataTable,
  FilterBar,
  FilterSelect,
  ActionButton,
  StatusBadge,
  Pagination,
} from "../../components/design-system/primitives";

const PAGE_SIZE = 50;

function formatDate(iso: string | null) {
  if (!iso) return "\u2014";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "\u2014";
  }
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

export function PublishCenterPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError } = usePublishRecords({
    status: statusFilter || undefined,
    platform: platformFilter || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const items = data ?? [];
  const hasFilters = !!(statusFilter || platformFilter);

  const columns = [
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
        <StatusBadge status={publishStatusVariant(r.status)} label={statusLabel(r.status)} />
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

  return (
    <PageShell
      title="Yayin Merkezi"
      subtitle="Publish kayitlari, review gate, zamanlama ve yayin durumu."
      testId="publish-center"
    >
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="publish-workflow-note">
        Taslak &rarr; Review &rarr; Onay &rarr; Zamanlama/Yayin &rarr; Platform
      </p>

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
          {hasFilters && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => { setStatusFilter(""); setPlatformFilter(""); setOffset(0); }}
              data-testid="publish-filter-clear"
            >
              Temizle
            </ActionButton>
          )}
        </FilterBar>
      </div>

      <SectionShell flush title={`Yayin Kayitlari (${items.length})`} testId="publish-list">
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
      </SectionShell>
    </PageShell>
  );
}
