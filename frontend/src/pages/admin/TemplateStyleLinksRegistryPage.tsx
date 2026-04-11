import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTemplateStyleLinksList } from "../../hooks/useTemplateStyleLinksList";
import { TemplateStyleLinksTable } from "../../components/template-style-links/TemplateStyleLinksTable";
import { TemplateStyleLinkDetailPanel } from "../../components/template-style-links/TemplateStyleLinkDetailPanel";
import { PageShell, SectionShell, ActionButton } from "../../components/design-system/primitives";

export function TemplateStyleLinksRegistryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(
    (location.state as { selectedId?: string } | null)?.selectedId ?? null
  );
  const { data: links, isLoading, isError, error } = useTemplateStyleLinksList();

  return (
    <PageShell
      title="Sablon-Stil Baglantilari"
      testId="tsl-registry"
      actions={
        <ActionButton variant="primary" onClick={() => navigate("/admin/template-style-links/new")}>
          + Yeni Baglanti Olustur
        </ActionButton>
      }
    >
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="tsl-registry-workflow-note">
        Sablon-blueprint baglantilari. Birincil, yedek ve deneysel roller atanabilir.
      </p>

      <div className="flex gap-6 items-start">
        <div className="flex-[2] min-w-0">
          <SectionShell testId="tsl-table-section">
            {isLoading && <p className="text-neutral-500 text-base p-4">Yükleniyor...</p>}
            {isError && (
              <p className="text-error text-base p-4">
                Hata: {error instanceof Error ? error.message : "kayıtlar yüklenemedi."}
              </p>
            )}
            {links && links.length === 0 && (
              <div className="text-center py-8 px-4 text-neutral-500">
                <p className="m-0 text-md">Henüz template style link yok.</p>
              </div>
            )}
            {links && links.length > 0 && (
              <TemplateStyleLinksTable
                links={links}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </SectionShell>
        </div>

        <div className="flex-1 min-w-[260px]">
          <TemplateStyleLinkDetailPanel
            linkId={selectedId}
            onDeleted={() => setSelectedId(null)}
          />
        </div>
      </div>
    </PageShell>
  );
}
