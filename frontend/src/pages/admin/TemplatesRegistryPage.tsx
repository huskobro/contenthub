import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTemplatesList } from "../../hooks/useTemplatesList";
import { TemplatesTable } from "../../components/templates/TemplatesTable";
import { TemplateDetailPanel } from "../../components/templates/TemplateDetailPanel";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
import { Sheet } from "../../components/design-system/Sheet";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";
import { useScopedKeyboardNavigation } from "../../hooks/useScopedKeyboardNavigation";

export function TemplatesRegistryPage() {
  const location = useLocation();
  const initialSelected = (location.state as { selectedId?: string } | null)?.selectedId ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [sheetOpen, setSheetOpen] = useState(!!initialSelected);
  const navigate = useNavigate();
  const { data: templates, isLoading, isError, error } = useTemplatesList();

  const templateList = templates ?? [];

  const handleSelect = useCallback(
    (index: number) => {
      if (templateList[index]) {
        setSelectedId(templateList[index].id);
        setSheetOpen(true);
      }
    },
    [templateList]
  );

  const { activeIndex, handleKeyDown } = useScopedKeyboardNavigation({
    scopeId: "templates-table",
    scopeLabel: "Templates Table",
    itemCount: templateList.length,
    onSelect: handleSelect,
    enabled: !sheetOpen,
  });

  const handleRowSelect = useCallback((id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  }, []);

  return (
    <ReadOnlyGuard targetKey="panel:templates">
      <PageShell
        title="Sablon Kayitlari"
        testId="tpl-registry"
        actions={
          <ActionButton variant="primary" onClick={() => navigate("/admin/templates/new")}>
            + Yeni Sablon Olustur
          </ActionButton>
        }
      >
        <p
          data-testid="tpl-registry-workflow-note"
          className="m-0 mb-5 text-base text-neutral-500 leading-normal max-w-[640px]"
        >
          Icerik, stil ve yayin sablonlarini buradan yonetebilirsiniz. Sablonlar
          uretim hattinin yapi taslaridir. Bir sablon secerek detay, kural ve
          style blueprint iliskilerini gorebilirsiniz. &uarr;&darr; tuslariyla gezinip Enter ile detay panelini acabilirsiniz.
        </p>

        <div onKeyDown={handleKeyDown} tabIndex={0} className="outline-none">
          <SectionShell testId="templates-table-section">
            {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
            {isError && (
              <p className="text-error text-base p-4">
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {templates && templates.length === 0 && (
              <div className="text-center py-8 px-4 text-neutral-500">
                <p className="m-0 text-md">Henüz template yok.</p>
              </div>
            )}
            {templates && templates.length > 0 && (
              <TemplatesTable
                templates={templates}
                selectedId={selectedId}
                onSelect={handleRowSelect}
              />
            )}
          </SectionShell>
        </div>

        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Sablon Detayı"
          testId="templates-sheet"
          width="440px"
        >
          <TemplateDetailPanel templateId={selectedId} />
        </Sheet>
      </PageShell>
    </ReadOnlyGuard>
  );
}
