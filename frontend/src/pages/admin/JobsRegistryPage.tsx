import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJobsList } from "../../hooks/useJobsList";
import { JobsTable } from "../../components/jobs/JobsTable";
import { JobDetailPanel } from "../../components/jobs/JobDetailPanel";
import { colors, spacing, typography } from "../../components/design-system/tokens";
import {
  PageShell,
  SectionShell,
} from "../../components/design-system/primitives";

export function JobsRegistryPage() {
  const { data: jobs, isLoading, isError, error } = useJobsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <PageShell
      title="Uretim Isleri"
      subtitle="Sistemdeki tum uretim islerinin listesi, kuyruk durumu ve toplu operasyon gorunumu."
      testId="jobs-registry"
    >
      <p data-testid="jobs-registry-workflow-note" style={{ margin: `0 0 ${spacing[5]}`, fontSize: typography.size.base, color: colors.neutral[500], lineHeight: typography.lineHeight.normal, maxWidth: "640px" }}>
        Is akis zinciri: Olusturma &rarr; Kuyruga Alma &rarr; Adim Isleme &rarr; Tamamlama/Hata &rarr; Yayin Hazirligi. Bir ise tiklayarak detay sayfasinda retry, cancel veya skip gibi operasyonel aksiyonlarin durumunu gorebilirsiniz.
      </p>
      {isLoading && <p style={{ color: "#64748b" }}>Yükleniyor...</p>}
      {isError && (
        <p style={{ color: "#dc2626" }}>
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      )}

      {jobs && (
        <div style={{ display: "flex", gap: spacing[5], alignItems: "flex-start" }}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <SectionShell testId="jobs-table-section">
              <JobsTable
                jobs={jobs}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  navigate(`/admin/jobs/${id}`);
                }}
              />
            </SectionShell>
          </div>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <SectionShell testId="jobs-detail-panel-section">
              <JobDetailPanel selectedId={selectedId} />
            </SectionShell>
          </div>
        </div>
      )}
    </PageShell>
  );
}
