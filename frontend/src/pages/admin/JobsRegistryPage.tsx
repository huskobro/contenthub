import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJobsList } from "../../hooks/useJobsList";
import { JobsTable } from "../../components/jobs/JobsTable";
import { JobDetailPanel } from "../../components/jobs/JobDetailPanel";

export function JobsRegistryPage() {
  const { data: jobs, isLoading, isError, error } = useJobsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div>
      <h2
        style={{ margin: "0 0 0.25rem", fontSize: "1.125rem", fontWeight: 600 }}
        data-testid="jobs-registry-heading"
      >
        Uretim Isleri
      </h2>
      <p
        style={{
          margin: "0 0 0.5rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="jobs-registry-workflow-note"
      >
        Uretim islerini ve yayin hazirligini buradan takip edebilirsiniz.
        Tamamlanan isler yayin adimina hazir hale gelir. Yayin durumu,
        sonuc ve hata bilgileri is detayinda gorunur.
      </p>

      {isLoading && <p style={{ color: "#64748b" }}>Yükleniyor...</p>}
      {isError && (
        <p style={{ color: "#dc2626" }}>
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      )}

      {jobs && (
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <JobsTable
              jobs={jobs}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                navigate(`/admin/jobs/${id}`);
              }}
            />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: "280px",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              background: "#fafbfc",
            }}
          >
            <JobDetailPanel selectedId={selectedId} />
          </div>
        </div>
      )}
    </div>
  );
}
