/**
 * Audit Log Admin Sayfasi — M15 + M16 Hardening.
 *
 * Gercek runtime audit kayitlarini gosterir.
 * Filtreler: aksiyon, varlik tipi, tarih araligi.
 * Detay paneli: secilen kaydin old/new JSON diff icerigini gosterir.
 */

import { useState } from "react";
import { useAuditLogs, useAuditLogDetail } from "../../hooks/useAuditLogs";
import type { AuditLogEntry } from "../../api/auditLogApi";
import { colors, typography, spacing } from "../../components/design-system/tokens";
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

// ---------------------------------------------------------------------------
// Entity type labels
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Diff helper — old/new JSON alanlarini ayri goster
// ---------------------------------------------------------------------------

function DetailsDiff({ detailsJson }: { detailsJson: string }) {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(detailsJson);
  } catch {
    return <CodeBlock content={detailsJson} testId="audit-detail-json" />;
  }

  const oldValue = parsed.old_value ?? parsed.old ?? parsed.previous_value;
  const newValue = parsed.new_value ?? parsed.new ?? parsed.current_value;

  // old/new pattern varsa diff gorunumu
  if (oldValue !== undefined || newValue !== undefined) {
    const remaining = { ...parsed };
    delete remaining.old_value;
    delete remaining.new_value;
    delete remaining.old;
    delete remaining.new;
    delete remaining.previous_value;
    delete remaining.current_value;

    return (
      <div>
        {oldValue !== undefined && (
          <div style={{ marginBottom: spacing[3] }}>
            <span style={{ fontSize: typography.size.sm, color: colors.error.dark, fontWeight: typography.weight.semibold }}>
              Onceki Deger:
            </span>
            <div style={{ marginTop: spacing[1] }}>
              <CodeBlock
                content={typeof oldValue === "string" ? oldValue : JSON.stringify(oldValue, null, 2)}
                accentBorder={colors.error.light}
              />
            </div>
          </div>
        )}
        {newValue !== undefined && (
          <div style={{ marginBottom: spacing[3] }}>
            <span style={{ fontSize: typography.size.sm, color: colors.success.dark, fontWeight: typography.weight.semibold }}>
              Yeni Deger:
            </span>
            <div style={{ marginTop: spacing[1] }}>
              <CodeBlock
                content={typeof newValue === "string" ? newValue : JSON.stringify(newValue, null, 2)}
                accentBorder={colors.success.light}
              />
            </div>
          </div>
        )}
        {Object.keys(remaining).length > 0 && (
          <div>
            <span style={{ fontSize: typography.size.sm, color: colors.neutral[500], fontWeight: typography.weight.medium }}>
              Ek Bilgi:
            </span>
            <div style={{ marginTop: spacing[1] }}>
              <CodeBlock content={JSON.stringify(remaining, null, 2)} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // old/new pattern yoksa tek JSON goster
  return <CodeBlock content={JSON.stringify(parsed, null, 2)} testId="audit-detail-json" />;
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const COLUMNS = [
  {
    key: "time",
    header: "Zaman",
    render: (entry: AuditLogEntry) =>
      entry.created_at ? new Date(entry.created_at).toLocaleString("tr-TR") : "\u2014",
  },
  {
    key: "action",
    header: "Aksiyon",
    render: (entry: AuditLogEntry) => <StatusBadge status="info" label={entry.action} />,
  },
  {
    key: "entity_type",
    header: "Varlik Tipi",
    render: (entry: AuditLogEntry) =>
      ENTITY_LABELS[entry.entity_type || ""] || entry.entity_type || "\u2014",
  },
  {
    key: "entity_id",
    header: "Varlik ID",
    render: (entry: AuditLogEntry) =>
      entry.entity_id ? <Mono>{entry.entity_id.substring(0, 12)}...</Mono> : "\u2014",
  },
  {
    key: "actor",
    header: "Aktor",
    render: (entry: AuditLogEntry) => entry.actor_type,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const limit = 30;

  const { data, isLoading, isError, error } = useAuditLogs({
    action: actionFilter || undefined,
    entity_type: entityTypeFilter || undefined,
    date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    date_to: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : undefined,
    limit,
    offset: page * limit,
  });

  const { data: detail } = useAuditLogDetail(selectedId);

  return (
    <PageShell title="Audit Log" testId="audit-log">
      {/* Filtreler */}
      <FilterBar testId="audit-filter-bar">
        <FilterInput
          type="text"
          placeholder="Aksiyon filtresi..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          style={{ width: "200px" }}
          data-testid="audit-action-filter"
        />
        <FilterSelect
          value={entityTypeFilter}
          onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(0); }}
          style={{ width: "180px" }}
          data-testid="audit-entity-type-filter"
        >
          <option value="">Tum Varlik Tipleri</option>
          {Object.entries(ENTITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </FilterSelect>
        <FilterInput
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          style={{ width: "150px", minWidth: "150px" }}
          data-testid="audit-date-from"
        />
        <span style={{ fontSize: typography.size.sm, color: colors.neutral[500] }}>{"\u2014"}</span>
        <FilterInput
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          style={{ width: "150px", minWidth: "150px" }}
          data-testid="audit-date-to"
        />
        {data && (
          <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>
            {data.total} kayit
          </span>
        )}
      </FilterBar>

      {/* Tablo */}
      <SectionShell flush testId="audit-log-section">
        {!isLoading && !isError && (data?.items ?? []).length === 0 ? (
          <div
            style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }}
            data-testid="audit-empty"
          >
            <p style={{ margin: 0, fontSize: typography.size.md }}>Audit log kaydi bulunamadi.</p>
          </div>
        ) : (
          <DataTable<AuditLogEntry>
            columns={COLUMNS}
            data={data?.items ?? []}
            keyFn={(entry) => entry.id}
            onRowClick={(entry) => setSelectedId(entry.id === selectedId ? null : entry.id)}
            selectedKey={selectedId}
            emptyMessage="Audit log kaydi bulunamadi."
            loading={isLoading}
            error={isError}
            errorMessage={error instanceof Error ? `Hata: ${error.message}` : "Bilinmeyen hata"}
            testId="audit-log-table"
          />
        )}
        {data && (
          <Pagination
            offset={page * limit}
            limit={limit}
            total={data.total}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => p + 1)}
            testId="audit-pagination"
          />
        )}
      </SectionShell>

      {/* Detay Paneli */}
      {selectedId && detail && (
        <SectionShell title="Kayit Detayi" testId="audit-detail-panel">
          <DetailGrid
            items={[
              { label: "Aksiyon", value: detail.action },
              { label: "Varlik", value: `${detail.entity_type} / ${detail.entity_id || "\u2014"}` },
              { label: "Aktor", value: `${detail.actor_type} / ${detail.actor_id || "\u2014"}` },
              {
                label: "Zaman",
                value: detail.created_at
                  ? new Date(detail.created_at).toLocaleString("tr-TR")
                  : "\u2014",
              },
            ]}
            testId="audit-detail-grid"
          />
          <div style={{ marginTop: spacing[4] }}>
            <span style={{ fontSize: typography.size.sm, color: colors.neutral[500], fontWeight: typography.weight.medium }}>
              Detay:
            </span>
            <div style={{ marginTop: spacing[2] }}>
              <DetailsDiff detailsJson={detail.details_json} />
            </div>
          </div>
        </SectionShell>
      )}
    </PageShell>
  );
}
