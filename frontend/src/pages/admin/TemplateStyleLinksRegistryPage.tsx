import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTemplateStyleLinksList } from "../../hooks/useTemplateStyleLinksList";
import { TemplateStyleLinksTable } from "../../components/template-style-links/TemplateStyleLinksTable";
import { TemplateStyleLinkDetailPanel } from "../../components/template-style-links/TemplateStyleLinkDetailPanel";
import { colors, spacing, typography } from "../../components/design-system/tokens";
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
      <p
        style={{
          margin: `0 0 ${spacing[5]}`,
          fontSize: typography.size.base,
          color: colors.neutral[500],
          lineHeight: typography.lineHeight.normal,
          maxWidth: "640px",
        }}
        data-testid="tsl-registry-workflow-note"
      >
        Sablonlar ile style blueprint'ler arasindaki baglantilari buradan
        yonetebilirsiniz. Her baglanti bir sablonun hangi gorsel kurallarla
        calisacagini belirler. Birincil, yedek ve deneysel roller atanabilir.
      </p>

      <div style={{ display: "flex", gap: spacing[6], alignItems: "flex-start" }}>
        <div style={{ flex: 2, minWidth: 0 }}>
          <SectionShell testId="tsl-table-section">
            {isLoading && <p style={{ color: colors.neutral[500], fontSize: typography.size.base, padding: spacing[4] }}>Yükleniyor...</p>}
            {isError && (
              <p style={{ color: colors.error.base, fontSize: typography.size.base, padding: spacing[4] }}>
                Hata: {error instanceof Error ? error.message : "kayıtlar yüklenemedi."}
              </p>
            )}
            {links && links.length === 0 && (
              <div style={{ textAlign: "center", padding: `${spacing[8]} ${spacing[4]}`, color: colors.neutral[500] }}>
                <p style={{ margin: 0, fontSize: typography.size.md }}>Henüz template style link yok.</p>
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

        <div style={{ flex: 1, minWidth: "260px" }}>
          <TemplateStyleLinkDetailPanel linkId={selectedId} />
        </div>
      </div>
    </PageShell>
  );
}
