import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useJobsList } from "../../hooks/useJobsList";
import { JobsTable } from "../../components/jobs/JobsTable";
import { JobDetailPanel } from "../../components/jobs/JobDetailPanel";
import { Sheet } from "../../components/design-system/Sheet";
import { colors, spacing, typography } from "../../components/design-system/tokens";
import {
  PageShell,
  SectionShell,
} from "../../components/design-system/primitives";
import { useScopedKeyboardNavigation } from "../../hooks/useScopedKeyboardNavigation";

export function JobsRegistryPage() {
  const { data: jobs, isLoading, isError, error } = useJobsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();

  const jobList = jobs ?? [];

  const handleSelect = useCallback(
    (index: number) => {
      if (jobList[index]) {
        const id = jobList[index].id;
        setSelectedId(id);
        setSheetOpen(true);
      }
    },
    [jobList]
  );

  const { activeIndex, handleKeyDown } = useScopedKeyboardNavigation({
    scopeId: "jobs-table",
    scopeLabel: "Jobs Table",
    itemCount: jobList.length,
    onSelect: handleSelect,
    enabled: !sheetOpen,
  });

  const handleRowClick = useCallback(
    (id: string) => {
      setSelectedId(id);
      setSheetOpen(true);
    },
    []
  );

  const handleNavigateToDetail = useCallback(
    () => {
      if (selectedId) navigate(`/admin/jobs/${selectedId}`);
    },
    [selectedId, navigate]
  );

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
        <div onKeyDown={handleKeyDown} tabIndex={0} style={{ outline: "none" }}>
          <SectionShell testId="jobs-table-section">
            <JobsTable
              jobs={jobs}
              selectedId={selectedId}
              onSelect={handleRowClick}
              activeIndex={activeIndex}
            />
          </SectionShell>
        </div>
      )}

      {/* Sheet — sağdan kayan detay paneli */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="İş Detayı"
        testId="jobs-sheet"
        width="480px"
      >
        <JobDetailPanel selectedId={selectedId} />
        {selectedId && (
          <div style={{ marginTop: spacing[4], borderTop: `1px solid ${colors.border.subtle}`, paddingTop: spacing[4] }}>
            <button
              onClick={handleNavigateToDetail}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: spacing[2],
                padding: `${spacing[2]} ${spacing[4]}`,
                fontSize: typography.size.base,
                fontWeight: typography.weight.medium,
                color: colors.brand[600],
                background: colors.brand[50],
                border: `1px solid ${colors.brand[200]}`,
                borderRadius: "6px",
                cursor: "pointer",
              }}
              data-testid="jobs-sheet-navigate"
            >
              Detay Sayfasına Git →
            </button>
          </div>
        )}
      </Sheet>
    </PageShell>
  );
}
