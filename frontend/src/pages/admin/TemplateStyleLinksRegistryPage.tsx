import { useState } from "react";
import { useTemplateStyleLinksList } from "../../hooks/useTemplateStyleLinksList";
import { TemplateStyleLinksTable } from "../../components/template-style-links/TemplateStyleLinksTable";
import { TemplateStyleLinkDetailPanel } from "../../components/template-style-links/TemplateStyleLinkDetailPanel";

export function TemplateStyleLinksRegistryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: links, isLoading, isError, error } = useTemplateStyleLinksList();

  return (
    <div>
      <h2 style={{ margin: "0 0 0.25rem" }}>Template Style Links</h2>
      <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.875rem" }}>
        Template ve Style Blueprint arasındaki bağlantı kayıtları. Detay için bir kayıt seçin.
      </p>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
        <div style={{ flex: 2, minWidth: 0 }}>
          {isLoading && <p style={{ color: "#64748b" }}>Yükleniyor...</p>}
          {isError && (
            <p style={{ color: "#dc2626" }}>
              Hata: {error instanceof Error ? error.message : "kayıtlar yüklenemedi."}
            </p>
          )}
          {links && links.length === 0 && (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Henüz template style link yok.</p>
          )}
          {links && links.length > 0 && (
            <TemplateStyleLinksTable
              links={links}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        <div style={{ flex: 1, minWidth: "260px" }}>
          <TemplateStyleLinkDetailPanel linkId={selectedId} />
        </div>
      </div>
    </div>
  );
}
