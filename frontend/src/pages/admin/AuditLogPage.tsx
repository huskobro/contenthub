/**
 * Audit Log Admin Sayfasi — M15.
 *
 * Gercek runtime audit kayitlarini gosterir.
 * Filtreler: aksiyon, varlik tipi.
 * Detay paneli: secilen kaydın old/new json icerigini gosterir.
 */

import { useState } from "react";
import { useAuditLogs, useAuditLogDetail } from "../../hooks/useAuditLogs";
import type { AuditLogEntry } from "../../api/auditLogApi";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const PAGE: React.CSSProperties = {
  maxWidth: "1100px",
};

const FILTER_BAR: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  marginBottom: "1rem",
  alignItems: "center",
  flexWrap: "wrap",
};

const INPUT: React.CSSProperties = {
  padding: "0.3rem 0.5rem",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  fontSize: "0.8125rem",
};

const TABLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.8125rem",
};

const TH: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  borderBottom: "2px solid #e2e8f0",
  color: "#475569",
  fontWeight: 600,
  fontSize: "0.75rem",
};

const TD: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #f1f5f9",
  color: "#1e293b",
};

const ACTION_BADGE: React.CSSProperties = {
  display: "inline-block",
  padding: "0.1rem 0.375rem",
  borderRadius: "4px",
  fontSize: "0.6875rem",
  fontWeight: 600,
  background: "#dbeafe",
  color: "#1e40af",
};

const DETAIL_PANEL: React.CSSProperties = {
  marginTop: "1rem",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "1rem",
  background: "#f8fafc",
};

const PRE: React.CSSProperties = {
  background: "#1e293b",
  color: "#e2e8f0",
  padding: "0.75rem",
  borderRadius: "6px",
  fontSize: "0.75rem",
  overflow: "auto",
  maxHeight: "300px",
};

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
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const limit = 30;

  const { data, isLoading, isError, error } = useAuditLogs({
    action: actionFilter || undefined,
    entity_type: entityTypeFilter || undefined,
    limit,
    offset: page * limit,
  });

  const { data: detail } = useAuditLogDetail(selectedId);

  return (
    <div style={PAGE}>
      <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem" }}>
        Audit Log
      </h2>

      {/* Filtreler */}
      <div style={FILTER_BAR}>
        <input
          style={{ ...INPUT, width: "200px" }}
          type="text"
          placeholder="Aksiyon filtresi..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          data-testid="audit-action-filter"
        />
        <select
          style={{ ...INPUT, width: "180px" }}
          value={entityTypeFilter}
          onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(0); }}
          data-testid="audit-entity-type-filter"
        >
          <option value="">Tum Varlik Tipleri</option>
          {Object.entries(ENTITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {data && (
          <span style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>
            {data.total} kayit
          </span>
        )}
      </div>

      {/* Loading / Error */}
      {isLoading && <p style={{ color: "#64748b", fontSize: "0.8125rem" }}>Yukleniyor...</p>}
      {isError && (
        <p style={{ color: "#dc2626", fontSize: "0.8125rem" }}>
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      )}

      {/* Tablo */}
      {data && data.items.length > 0 && (
        <>
          <table style={TABLE} data-testid="audit-log-table">
            <thead>
              <tr>
                <th style={TH}>Zaman</th>
                <th style={TH}>Aksiyon</th>
                <th style={TH}>Varlik Tipi</th>
                <th style={TH}>Varlik ID</th>
                <th style={TH}>Aktor</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry: AuditLogEntry) => (
                <tr
                  key={entry.id}
                  style={{ cursor: "pointer", background: selectedId === entry.id ? "#eff6ff" : "transparent" }}
                  onClick={() => setSelectedId(entry.id === selectedId ? null : entry.id)}
                >
                  <td style={TD}>
                    {entry.created_at ? new Date(entry.created_at).toLocaleString("tr-TR") : "—"}
                  </td>
                  <td style={TD}>
                    <span style={ACTION_BADGE}>{entry.action}</span>
                  </td>
                  <td style={TD}>{ENTITY_LABELS[entry.entity_type || ""] || entry.entity_type || "—"}</td>
                  <td style={{ ...TD, fontFamily: "monospace", fontSize: "0.75rem" }}>
                    {entry.entity_id ? entry.entity_id.substring(0, 12) + "..." : "—"}
                  </td>
                  <td style={TD}>{entry.actor_type}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Sayfalama */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", alignItems: "center" }}>
            <button
              style={{ ...INPUT, cursor: page > 0 ? "pointer" : "not-allowed", opacity: page > 0 ? 1 : 0.5 }}
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              Onceki
            </button>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Sayfa {page + 1} / {Math.max(1, Math.ceil(data.total / limit))}
            </span>
            <button
              style={{ ...INPUT, cursor: (page + 1) * limit < data.total ? "pointer" : "not-allowed", opacity: (page + 1) * limit < data.total ? 1 : 0.5 }}
              disabled={(page + 1) * limit >= data.total}
              onClick={() => setPage(p => p + 1)}
            >
              Sonraki
            </button>
          </div>
        </>
      )}

      {data && data.items.length === 0 && (
        <p style={{ color: "#64748b", fontSize: "0.8125rem" }} data-testid="audit-empty">
          Audit log kaydi bulunamadi.
        </p>
      )}

      {/* Detay Paneli */}
      {selectedId && detail && (
        <div style={DETAIL_PANEL} data-testid="audit-detail-panel">
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Kayit Detayi
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "0.375rem", fontSize: "0.8125rem" }}>
            <span style={{ color: "#64748b", fontWeight: 500 }}>Aksiyon:</span>
            <span>{detail.action}</span>
            <span style={{ color: "#64748b", fontWeight: 500 }}>Varlik:</span>
            <span>{detail.entity_type} / {detail.entity_id || "—"}</span>
            <span style={{ color: "#64748b", fontWeight: 500 }}>Aktor:</span>
            <span>{detail.actor_type} / {detail.actor_id || "—"}</span>
            <span style={{ color: "#64748b", fontWeight: 500 }}>Zaman:</span>
            <span>{detail.created_at ? new Date(detail.created_at).toLocaleString("tr-TR") : "—"}</span>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>Detay JSON:</span>
            <pre style={PRE} data-testid="audit-detail-json">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(detail.details_json), null, 2);
                } catch {
                  return detail.details_json;
                }
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
