import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useJobsList } from "../../hooks/useJobsList";
import { JobsTable } from "../../components/jobs/JobsTable";
import { JobDetailPanel } from "../../components/jobs/JobDetailPanel";
import { Sheet } from "../../components/design-system/Sheet";
import { QuickLook, useQuickLookTrigger } from "../../components/design-system/QuickLook";
import { JobQuickLookContent } from "../../components/quicklook/JobQuickLookContent";
import { colors, spacing, typography } from "../../components/design-system/tokens";
import {
  PageShell,
  SectionShell,
  ActionButton,
} from "../../components/design-system/primitives";
import { useScopedKeyboardNavigation } from "../../hooks/useScopedKeyboardNavigation";

export function JobsRegistryPage() {
  const { data: jobs, isLoading, isError, error } = useJobsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quickLookOpen, setQuickLookOpen] = useState(false);
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
    enabled: !sheetOpen && !quickLookOpen,
  });

  // QuickLook trigger (Space)
  useQuickLookTrigger({
    enabled: jobList.length > 0 && !sheetOpen && !quickLookOpen,
    onToggle: () => setQuickLookOpen(true),
    scopeId: "jobs-table",
  });

  const activeJob = jobList[activeIndex] ?? null;

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
        ↑↓ ile gezin, Space ile on izleme, Enter ile detay panelini acin.
      </p>
      <div onKeyDown={handleKeyDown} tabIndex={0} style={{ outline: "none" }}>
        <SectionShell testId="jobs-table-section">
          {isLoading && <p style={{ color: colors.neutral[500], fontSize: typography.size.base, padding: spacing[4] }}>Yükleniyor...</p>}
          {isError && (
            <p style={{ color: colors.error.base, fontSize: typography.size.base, padding: spacing[4] }}>
              Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </p>
          )}
          {!isLoading && !isError && jobs && jobs.length === 0 && (
            <div style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }}>
              <p style={{ margin: 0, fontSize: typography.size.md }}>Henüz kayıtlı job yok.</p>
            </div>
          )}
          {jobs && jobs.length > 0 && (
            <JobsTable
              jobs={jobs}
              selectedId={selectedId}
              onSelect={handleRowClick}
              activeIndex={activeIndex}
            />
          )}
        </SectionShell>
      </div>

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
            <ActionButton
              variant="primary"
              size="sm"
              onClick={handleNavigateToDetail}
              data-testid="jobs-sheet-navigate"
            >
              Detay Sayfasina Git &rarr;
            </ActionButton>
          </div>
        )}
      </Sheet>

      {/* QuickLook — Space ile hızlı önizleme */}
      <QuickLook
        open={quickLookOpen}
        onClose={() => setQuickLookOpen(false)}
        title="İş Ön İzleme"
        testId="jobs-quicklook"
      >
        {activeJob && (
          <JobQuickLookContent
            job={activeJob}
            onNavigate={() => {
              setQuickLookOpen(false);
              navigate(`/admin/jobs/${activeJob.id}`);
            }}
          />
        )}
      </QuickLook>
    </PageShell>
  );
}
