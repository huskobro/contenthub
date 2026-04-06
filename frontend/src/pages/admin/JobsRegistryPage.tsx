import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useJobsList } from "../../hooks/useJobsList";
import { JobsTable } from "../../components/jobs/JobsTable";
import { JobDetailPanel } from "../../components/jobs/JobDetailPanel";
import { Sheet } from "../../components/design-system/Sheet";
import { QuickLook, useQuickLookTrigger } from "../../components/design-system/QuickLook";
import { JobQuickLookContent } from "../../components/quicklook/JobQuickLookContent";
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
      subtitle="Tum uretim isleri, kuyruk durumu ve operasyonlar."
      testId="jobs-registry"
    >
      <p data-testid="jobs-registry-workflow-note" className="m-0 mb-3 text-xs text-neutral-400">
        Olusturma &rarr; Kuyruk &rarr; Adim Isleme &rarr; Tamamlama &rarr; Yayin &middot; ↑↓ gezin, Enter detay
      </p>
      <div onKeyDown={handleKeyDown} tabIndex={0} className="outline-none">
        <SectionShell testId="jobs-table-section">
          {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
          {isError && (
            <p className="text-error text-base p-4">
              Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
            </p>
          )}
          {!isLoading && !isError && jobs && jobs.length === 0 && (
            <div className="text-center py-8 px-4 text-neutral-500">
              <p className="m-0 text-md">Henüz kayıtlı job yok.</p>
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

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="İş Detayı"
        testId="jobs-sheet"
        width="480px"
      >
        <JobDetailPanel selectedId={selectedId} />
        {selectedId && (
          <div className="mt-4 border-t border-border-subtle pt-4">
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
