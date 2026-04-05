import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSourcesList } from "../../hooks/useSourcesList";
import { SourcesTable } from "../../components/sources/SourcesTable";
import { SourceDetailPanel } from "../../components/sources/SourceDetailPanel";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
import { Sheet } from "../../components/design-system/Sheet";
import { colors, spacing, typography } from "../../components/design-system/tokens";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";
import { useScopedKeyboardNavigation } from "../../hooks/useScopedKeyboardNavigation";

export function SourcesRegistryPage() {
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
    onSelect: handleSelect,
    enabled: !sheetOpen,
  });

  const handleRowSelect = useCallback((id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  }, []);

  return (
    <ReadOnlyGuard targetKey="panel:sources">
      <PageShell
        title="Sources Registry"
        subtitle="Haber kaynaklarının admin görünümü. Detay için bir source seçin veya ↑↓ tuşlarıyla gezinin."
        testId="sources-registry"
        actions={
          <ActionButton variant="primary" onClick={() => navigate("/admin/sources/new")}>
            + Yeni Source
          </ActionButton>
        }
      >
        <div onKeyDown={handleKeyDown} tabIndex={0} style={{ outline: "none" }}>
          <SectionShell testId="sources-table-section">
            {isLoading && <p style={{ color: colors.neutral[500] }}>Yükleniyor...</p>}
            {isError && (
              <p style={{ color: colors.error.base }}>
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {sources && sources.length === 0 && (
              <p style={{ color: colors.neutral[400], fontSize: typography.size.md, padding: spacing[4] }}>
                Henüz source yok.
              </p>
            )}
            {sources && sources.length > 0 && (
              <SourcesTable
                sources={sources}
                selectedId={selectedId}
                onSelect={handleRowSelect}
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
