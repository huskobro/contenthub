import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSourcesList } from "../../hooks/useSourcesList";
import { SourcesTable } from "../../components/sources/SourcesTable";
import { SourceDetailPanel } from "../../components/sources/SourceDetailPanel";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
import { Sheet } from "../../components/design-system/Sheet";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";
import { useScopedKeyboardNavigation } from "../../hooks/useScopedKeyboardNavigation";
import { bulkDeleteSources } from "../../api/sourcesApi";
import { useToast } from "../../hooks/useToast";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

/**
 * Public entry point. Aurora surface override (admin.sources.registry)
 * geçerliyse onu kullanır; aksi halde legacy yüzeye düşer.
 */
export function SourcesRegistryPage() {
  const Override = useSurfacePageOverride("admin.sources.registry");
  if (Override) return <Override />;
  return <LegacySourcesRegistryPage />;
}

function LegacySourcesRegistryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSelected = (location.state as { selectedId?: string } | null)?.selectedId ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [sheetOpen, setSheetOpen] = useState(!!initialSelected);
  const { data: sources, isLoading, isError, error } = useSourcesList();

  const sourceList = sources ?? [];

  const handleSelect = useCallback(
    (index: number) => {
      if (sourceList[index]) {
        setSelectedId(sourceList[index].id);
        setSheetOpen(true);
      }
    },
    [sourceList]
  );

  const { activeIndex, handleKeyDown } = useScopedKeyboardNavigation({
    scopeId: "sources-table",
    scopeLabel: "Sources Table",
    itemCount: sourceList.length,
    onEnter: handleSelect,
    enabled: !sheetOpen,
  });

  const handleRowSelect = useCallback((id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  }, []);

  const queryClient = useQueryClient();
  const toast = useToast();
  const { mutate: bulkDelete } = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteSources(ids),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} kaynak silindi`);
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["news-items"] });
      queryClient.invalidateQueries({ queryKey: ["source-scans"] });
      if (ids.includes(selectedId ?? "")) {
        setSelectedId(null);
        setSheetOpen(false);
      }
    },
    onError: () => toast.error("Silme işlemi başarısız"),
  });

  return (
    <ReadOnlyGuard targetKey="panel:sources">
      <PageShell
        title="Sources Registry"
        subtitle="Haber kaynaklari. ↑↓ gezin, detay icin secin."
        testId="sources-registry"
        actions={
          <ActionButton variant="primary" onClick={() => navigate("/admin/sources/new")}>
            + Yeni Source
          </ActionButton>
        }
      >
        <div onKeyDown={handleKeyDown} tabIndex={0} className="outline-none">
          <SectionShell testId="sources-table-section">
            {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
            {isError && (
              <p className="text-error text-base p-4">
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {sources && sources.length === 0 && (
              <div className="text-center py-8 px-4 text-neutral-500">
                <p className="m-0 text-md">Henüz source yok.</p>
              </div>
            )}
            {sources && sources.length > 0 && (
              <SourcesTable
                sources={sources}
                selectedId={selectedId}
                onSelect={handleRowSelect}
                onBulkDelete={(ids) => bulkDelete(ids)}
              />
            )}
          </SectionShell>
        </div>

        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Kaynak Detayı"
          testId="sources-sheet"
          width="440px"
        >
          <SourceDetailPanel sourceId={selectedId} />
        </Sheet>
      </PageShell>
    </ReadOnlyGuard>
  );
}
