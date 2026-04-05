import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTemplatesList } from "../../hooks/useTemplatesList";
import { TemplatesTable } from "../../components/templates/TemplatesTable";
import { TemplateDetailPanel } from "../../components/templates/TemplateDetailPanel";
import { ReadOnlyGuard } from "../../components/visibility/ReadOnlyGuard";
import { Sheet } from "../../components/design-system/Sheet";
import { colors, spacing, typography } from "../../components/design-system/tokens";
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
          style={{
            margin: `0 0 ${spacing[5]}`,
            fontSize: typography.size.base,
            color: colors.neutral[500],
            lineHeight: typography.lineHeight.normal,
            maxWidth: "640px",
          }}
        >
          Icerik, stil ve yayin sablonlarini buradan yonetebilirsiniz. Sablonlar
          uretim hattinin yapi taslaridir. Bir sablon secerek detay, kural ve
          style blueprint iliskilerini gorebilirsiniz. ↑↓ tuslariyla gezinip Enter ile detay panelini acabilirsiniz.
        </p>

        <div onKeyDown={handleKeyDown} tabIndex={0} style={{ outline: "none" }}>
          <SectionShell testId="templates-table-section">
            {isLoading && <p style={{ color: colors.neutral[500], fontSize: typography.size.base, padding: spacing[4] }}>Yükleniyor...</p>}
            {isError && (
              <p style={{ color: colors.error.base, fontSize: typography.size.base, padding: spacing[4] }}>
                Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
              </p>
            )}
            {templates && templates.length === 0 && (
              <div style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }}>
                <p style={{ margin: 0, fontSize: typography.size.md }}>Henüz template yok.</p>
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
