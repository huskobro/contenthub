/**
 * Audit Log Admin Sayfasi — M15 + M16 Hardening.
 */

import { useState, useCallback } from "react";
import { useAuditLogs, useAuditLogDetail } from "../../hooks/useAuditLogs";
import type { AuditLogEntry } from "../../api/auditLogApi";
import {
  PageShell,
  SectionShell,
  DataTable,
  FilterBar,
  FilterInput,
  FilterSelect,
  Pagination,
  StatusBadge,
  Mono,
  DetailGrid,
  CodeBlock,
} from "../../components/design-system/primitives";
import { Sheet } from "../../components/design-system/Sheet";

const ENTITY_LABELS: Record<string, string> = {
  publish_record: "Yayin Kaydi",
  credential: "Kimlik Bilgisi",
  setting: "Ayar",
  visibility_rule: "Gorunurluk Kurali",
  source: "Kaynak",
  template: "Sablon",
  style_blueprint: "Stil Sablonu",
  youtube_oauth: "YouTube OAuth",
  job: "Is",
  job_step: "Is Adimi",
};

function DetailsDiff({ detailsJson }: { detailsJson: string }) {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(detailsJson); } catch { return <CodeBlock content={detailsJson} testId="audit-detail-json" />; }

  const oldValue = parsed.old_value ?? parsed.old ?? parsed.previous_value;
  const newValue = parsed.new_value ?? parsed.new ?? parsed.current_value;

  if (oldValue !== undefined || newValue !== undefined) {
    const remaining = { ...parsed };
    delete remaining.old_value; delete remaining.new_value; delete remaining.old; delete remaining.new; delete remaining.previous_value; delete remaining.current_value;

    return (
      <div>
        {oldValue !== undefined && (
          <div className="mb-3">
            <span className="text-sm text-error-dark font-semibold">Onceki Deger:</span>
            <div className="mt-1"><CodeBlock content={typeof oldValue === "string" ? oldValue : JSON.stringify(oldValue, null, 2)} accentBorder="var(--color-error-light)" /></div>
          </div>
        )}
        {newValue !== undefined && (
          <div className="mb-3">
            <span className="text-sm text-success-dark font-semibold">Yeni Deger:</span>
            <div className="mt-1"><CodeBlock content={typeof newValue === "string" ? newValue : JSON.stringify(newValue, null, 2)} accentBorder="var(--color-success-light)" /></div>
          </div>
        )}
        {Object.keys(remaining).length > 0 && (
          <div>
            <span className="text-sm text-neutral-500 font-medium">Ek Bilgi:</span>
            <div className="mt-1"><CodeBlock content={JSON.stringify(remaining, null, 2)} /></div>
          </div>
        )}
      </div>
    );
  }

  return <CodeBlock content={JSON.stringify(parsed, null, 2)} testId="audit-detail-json" />;
}

const COLUMNS = [
  { key: "time", header: "Zaman", render: (entry: AuditLogEntry) => entry.created_at ? new Date(entry.created_at).toLocaleString("tr-TR") : "\u2014" },
  { key: "action", header: "Aksiyon", render: (entry: AuditLogEntry) => <StatusBadge status="info" label={entry.action} /> },
  { key: "entity_type", header: "Varlik Tipi", render: (entry: AuditLogEntry) => ENTITY_LABELS[entry.entity_type || ""] || entry.entity_type || "\u2014" },
  { key: "entity_id", header: "Varlik ID", render: (entry: AuditLogEntry) => entry.entity_id ? <Mono>{entry.entity_id.substring(0, 12)}...</Mono> : "\u2014" },
  { key: "actor", header: "Aktor", render: (entry: AuditLogEntry) => entry.actor_type },
];

export function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 30;

  const { data, isLoading, isError, error } = useAuditLogs({ action: actionFilter || undefined, entity_type: entityTypeFilter || undefined, date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined, date_to: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : undefined, limit, offset: page * limit });
  const { data: detail } = useAuditLogDetail(selectedId);

  return (
    <PageShell title="Audit Log" testId="audit-log">
      <FilterBar testId="audit-filter-bar">
        <FilterInput type="text" placeholder="Aksiyon filtresi..." value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0); }} className="w-[200px]" data-testid="audit-action-filter" />
        <FilterSelect value={entityTypeFilter} onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(0); }} className="w-[180px]" data-testid="audit-entity-type-filter">
          <option value="">Tum Varlik Tipleri</option>
          {Object.entries(ENTITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </FilterSelect>
        <FilterInput type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} className="w-[150px] min-w-[150px]" data-testid="audit-date-from" />
        <span className="text-sm text-neutral-500">{"\u2014"}</span>
        <FilterInput type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} className="w-[150px] min-w-[150px]" data-testid="audit-date-to" />
        {data && <span className="text-xs text-neutral-500">{data.total} kayit</span>}
      </FilterBar>

      <SectionShell flush testId="audit-log-section">
        {!isLoading && !isError && (data?.items ?? []).length === 0 ? (
          <div className="text-center py-8 px-4 text-neutral-500" data-testid="audit-empty">
            <p className="m-0 text-md">Audit log kaydi bulunamadi.</p>
          </div>
        ) : (
          <DataTable<AuditLogEntry> columns={COLUMNS} data={data?.items ?? []} keyFn={(entry) => entry.id} onRowClick={(entry) => { setSelectedId(entry.id === selectedId ? null : entry.id); if (entry.id !== selectedId) setSheetOpen(true); }} selectedKey={selectedId} emptyMessage="Audit log kaydi bulunamadi." loading={isLoading} error={isError} errorMessage={error instanceof Error ? `Hata: ${error.message}` : "Bilinmeyen hata"} testId="audit-log-table" />
        )}
        {data && <Pagination offset={page * limit} limit={limit} total={data.total} onPrev={() => setPage((p) => Math.max(0, p - 1))} onNext={() => setPage((p) => p + 1)} testId="audit-pagination" />}
      </SectionShell>

      <Sheet open={sheetOpen && !!selectedId} onClose={() => setSheetOpen(false)} title="Kayit Detay&#305;" testId="audit-sheet" width="500px">
        {detail && (
          <>
            <DetailGrid items={[
              { label: "Aksiyon", value: detail.action },
              { label: "Varlik", value: `${detail.entity_type} / ${detail.entity_id || "\u2014"}` },
              { label: "Aktor", value: `${detail.actor_type} / ${detail.actor_id || "\u2014"}` },
              { label: "Zaman", value: detail.created_at ? new Date(detail.created_at).toLocaleString("tr-TR") : "\u2014" },
            ]} testId="audit-detail-grid" />
            <div className="mt-4">
              <span className="text-sm text-neutral-500 font-medium">Detay:</span>
              <div className="mt-2"><DetailsDiff detailsJson={detail.details_json} /></div>
            </div>
          </>
        )}
      </Sheet>
    </PageShell>
  );
}
