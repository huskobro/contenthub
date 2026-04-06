import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUsedNewsList } from "../../hooks/useUsedNewsList";
import { UsedNewsTable } from "../../components/used-news/UsedNewsTable";
import { UsedNewsDetailPanel } from "../../components/used-news/UsedNewsDetailPanel";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";

export function UsedNewsRegistryPage() {
  const { data: records, isLoading, isError } = useUsedNewsList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { selectedId?: string } | null;
    if (state?.selectedId) {
      setSelectedId(state.selectedId);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  return (
    <PageShell
      title="Used News Registry"
      testId="used-news-registry"
      actions={
        <ActionButton variant="primary" onClick={() => navigate("/admin/used-news/new")}>
          + Yeni
        </ActionButton>
      }
    >
      <div className="flex gap-6">
        <div className="flex-1">
          <SectionShell testId="used-news-table-section">
            {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
            {isError && <p className="text-error text-base p-4">Hata: kayıtlar yüklenemedi.</p>}
            {!isLoading && !isError && records && records.length === 0 && (
              <div className="text-center py-8 px-4 text-neutral-500">
                <p className="m-0 text-md">Henüz kullanılmış haber kaydı yok.</p>
              </div>
            )}
            {records && records.length > 0 && (
              <UsedNewsTable
                records={records}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </SectionShell>
        </div>

        {selectedId && (
          <div className="w-[360px] border-l border-border pl-6">
            <UsedNewsDetailPanel selectedId={selectedId} />
          </div>
        )}
      </div>
    </PageShell>
  );
}
