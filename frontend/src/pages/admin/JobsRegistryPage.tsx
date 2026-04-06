import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useJobsList } from "../../hooks/useJobsList";
import { markJobsAsTestData } from "../../api/jobsApi";
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
import { useToast } from "../../hooks/useToast";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export function JobsRegistryPage() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: jobs, isLoading, isError, error } = useJobsList(includeArchived);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quickLookOpen, setQuickLookOpen] = useState(false);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: (jobIds: string[]) => markJobsAsTestData(jobIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job(lar) arşivlendi");
      setArchiveConfirmId(null);
    },
    onError: () => {
      toast.error("Arşivleme başarısız");
    },
  });

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

  const handleArchiveClick = useCallback(
    (jobId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (archiveConfirmId === jobId) {
        archiveMutation.mutate([jobId]);
      } else {
        setArchiveConfirmId(jobId);
      }
    },
    [archiveConfirmId, archiveMutation]
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

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-3">
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Arşivlenmişleri göster
        </label>
      </div>

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
            <>
              <JobsTable
                jobs={jobs}
                selectedId={selectedId}
                onSelect={handleRowClick}
                activeIndex={activeIndex}
              />
              {/* Per-row archive actions rendered below table for terminal-state jobs */}
              <div className="mt-2 flex flex-wrap gap-2 px-1">
                {jobList
                  .filter((j) => TERMINAL_STATUSES.has(j.status))
                  .map((j) => {
                    const isConfirming = archiveConfirmId === j.id;
                    return (
                      <div key={j.id} className="flex items-center gap-1">
                        <span className="text-xs text-neutral-500 truncate max-w-[120px]" title={j.id}>
                          {j.id.slice(0, 8)}…
                        </span>
                        {isConfirming ? (
                          <button
                            title="Bu job arşivlenir ve varsayılan listeden kaldırılır. Veriler silinmez, 'Arşivlenmiş' filtresiyle erişilebilir."
                            onClick={(e) => handleArchiveClick(j.id, e)}
                            disabled={archiveMutation.isPending}
                            className="text-xs px-2 py-0.5 rounded bg-error text-white font-medium cursor-pointer border-0 disabled:opacity-50"
                          >
                            Emin misiniz? Arşivle
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleArchiveClick(j.id, e)}
                            disabled={archiveMutation.isPending}
                            className="text-xs px-2 py-0.5 rounded text-neutral-500 hover:text-warning cursor-pointer border border-border-subtle bg-transparent disabled:opacity-50"
                          >
                            Arşivle
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
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
