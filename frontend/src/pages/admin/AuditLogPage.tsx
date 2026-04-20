/**
 * Audit Log Admin Sayfasi — M15 + M16 Hardening.
 */

import { useState, useCallback } from "react";
import { useAuditLogs, useAuditLogDetail } from "../../hooks/useAuditLogs";
import type { AuditLogEntry } from "../../api/auditLogApi";
import {
  PageShell,
  SectionShell,
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
import { useTableSelection } from "../../hooks/useTableSelection";
import { useColumnVisibility } from "../../hooks/useColumnVisibility";
import { BulkActionBar } from "../../components/design-system/BulkActionBar";
import { ColumnSelector } from "../../components/design-system/ColumnSelector";
import { cn } from "../../lib/cn";
import { formatDateShort } from "../../lib/formatDate";
import { useSurfacePageOverride } from "../../surfaces";

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

const AUDIT_COLUMNS = [
  { key: "time", label: "Zaman" },
  { key: "action", label: "Aksiyon" },
  { key: "entity_type", label: "Varlık Tipi" },
  { key: "entity_id", label: "Varlık ID" },
  { key: "actor", label: "Aktör" },
];

export function AuditLogPage() {
  // Faz 6 P0-8 — Aurora override gate. Aktif surface Aurora ise sade audit
  // feed render edilir; diğer surface'ler tam tablo + sheet'i görür.
  const Override = useSurfacePageOverride("admin.audit");
  if (Override) return <Override />;
  return <LegacyAuditLogPage />;
}

function LegacyAuditLogPage() {
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

  const items = data?.items ?? [];
  const sel = useTableSelection(items.map((e) => e.id));
  const col = useColumnVisibility("audit-log-table", AUDIT_COLUMNS.map((c) => c.key));

  return (
    <PageShell title="Audit Log" testId="audit-log">
      <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
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
        <ColumnSelector columns={AUDIT_COLUMNS} visible={col.visible} onToggle={col.toggle} />
      </div>

      <BulkActionBar
        selectedCount={sel.selectedCount}
        onClear={sel.clear}
        actions={[]}
      />

      <SectionShell flush testId="audit-log-section">
        {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
        {isError && <p className="text-error text-base p-4">Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}</p>}
        {!isLoading && !isError && items.length === 0 ? (
          <div className="text-center py-8 px-4 text-neutral-500" data-testid="audit-empty">
            <p className="m-0 text-md">Audit log kaydi bulunamadi.</p>
          </div>
        ) : !isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-md" data-testid="audit-log-table">
              <thead>
                <tr className="bg-neutral-100 text-left">
                  <th className="px-3 py-2.5 border-b border-border-subtle w-8">
                    <input type="checkbox" checked={sel.isAllSelected} ref={(el) => { if (el) el.indeterminate = sel.isIndeterminate; }} onChange={sel.toggleAll} className="cursor-pointer accent-brand-500" />
                  </th>
                  {col.isVisible("time") && <th className="px-3 py-2.5 border-b border-border-subtle">Zaman</th>}
                  {col.isVisible("action") && <th className="px-3 py-2.5 border-b border-border-subtle">Aksiyon</th>}
                  {col.isVisible("entity_type") && <th className="px-3 py-2.5 border-b border-border-subtle">Varlık Tipi</th>}
                  {col.isVisible("entity_id") && <th className="px-3 py-2.5 border-b border-border-subtle">Varlık ID</th>}
                  {col.isVisible("actor") && <th className="px-3 py-2.5 border-b border-border-subtle">Aktör</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => {
                  const isSelected = selectedId === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => { setSelectedId(entry.id === selectedId ? null : entry.id); if (entry.id !== selectedId) setSheetOpen(true); }}
                      className={cn(
                        "border-b border-neutral-100 cursor-pointer transition-colors",
                        isSelected ? "bg-info-light" : "hover:bg-neutral-50",
                        sel.isSelected(entry.id) && "bg-brand-500 bg-opacity-5",
                      )}
                    >
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={sel.isSelected(entry.id)} onChange={() => sel.toggle(entry.id)} className="cursor-pointer accent-brand-500" />
                      </td>
                      {col.isVisible("time") && (
                        <td className="px-3 py-2.5 text-neutral-500 text-sm">{formatDateShort(entry.created_at)}</td>
                      )}
                      {col.isVisible("action") && (
                        <td className="px-3 py-2.5"><StatusBadge status="info" label={entry.action} /></td>
                      )}
                      {col.isVisible("entity_type") && (
                        <td className="px-3 py-2.5 text-neutral-600">{ENTITY_LABELS[entry.entity_type || ""] || entry.entity_type || "—"}</td>
                      )}
                      {col.isVisible("entity_id") && (
                        <td className="px-3 py-2.5 font-mono text-sm text-neutral-500">{entry.entity_id ? entry.entity_id.substring(0, 12) + "..." : "—"}</td>
                      )}
                      {col.isVisible("actor") && (
                        <td className="px-3 py-2.5 text-neutral-600">{entry.actor_type}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination offset={page * limit} limit={limit} total={data.total} onPrev={() => setPage((p) => Math.max(0, p - 1))} onNext={() => setPage((p) => p + 1)} testId="audit-pagination" />}
      </SectionShell>

      <Sheet open={sheetOpen && !!selectedId} onClose={() => setSheetOpen(false)} title="Kayit Detayı" testId="audit-sheet" width="500px">
        {detail && (
          <>
            <DetailGrid items={[
              { label: "Aksiyon", value: detail.action },
              { label: "Varlik", value: `${detail.entity_type} / ${detail.entity_id || "\u2014"}` },
              { label: "Aktor", value: `${detail.actor_type} / ${detail.actor_id || "\u2014"}` },
              { label: "Zaman", value: formatDateShort(detail.created_at) },
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
