import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTemplatesList } from "../../hooks/useTemplatesList";
import { TemplatesTable } from "../../components/templates/TemplatesTable";
import { TemplateDetailPanel } from "../../components/templates/TemplateDetailPanel";

export function TemplatesRegistryPage() {
  const location = useLocation();
  const initialSelected = (location.state as { selectedId?: string } | null)?.selectedId ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const navigate = useNavigate();
  const { data: templates, isLoading, isError, error } = useTemplatesList();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
        <h2 style={{ margin: 0 }}>Templates Registry</h2>
        <button
          onClick={() => navigate("/admin/templates/new")}
          style={{
            padding: "0.375rem 1rem",
            fontSize: "0.875rem",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          + Yeni Template
        </button>
      </div>
      <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.875rem" }}>
        Sistemde kayıtlı template'lerin listesi. Detay için bir template seçin.
      </p>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
        {/* List area */}
        <div style={{ flex: 2, minWidth: 0 }}>
          {isLoading && <p style={{ color: "#64748b" }}>Yükleniyor...</p>}
          {isError && (
            <p style={{ color: "#dc2626" }}>
              Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </p>
          )}
          {templates && templates.length === 0 && (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Henüz template yok.</p>
          )}
          {templates && templates.length > 0 && (
            <TemplatesTable
              templates={templates}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {/* Detail panel area */}
        <div style={{ flex: 1, minWidth: "260px" }}>
          <TemplateDetailPanel templateId={selectedId} />
        </div>
      </div>
    </div>
  );
}
