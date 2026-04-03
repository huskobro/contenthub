import type {
  StandardVideoScriptResponse,
  StandardVideoMetadataResponse,
} from "../../api/standardVideoApi";
import { isBlank } from "../../lib/isBlank";

interface Props {
  scriptLoading: boolean;
  scriptError: boolean;
  script: StandardVideoScriptResponse | null | undefined;
  metadataLoading: boolean;
  metadataError: boolean;
  metadata: StandardVideoMetadataResponse | null | undefined;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        background: "#fff",
        marginBottom: "1.25rem",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.625rem 0.75rem",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          fontWeight: 600,
          fontSize: "0.875rem",
        }}
      >
        {title}
      </div>
      <div style={{ padding: "0.75rem" }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem", fontSize: "0.875rem" }}>
      <span style={{ color: "#64748b", fontWeight: 500, minWidth: "120px" }}>{label}</span>
      <span>{value ?? "—"}</span>
    </div>
  );
}

export function StandardVideoArtifactsPanel({
  scriptLoading,
  scriptError,
  script,
  metadataLoading,
  metadataError,
  metadata,
}: Props) {
  return (
    <div>
      <SectionCard title="Script">
        {scriptLoading && <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Yükleniyor...</p>}
        {scriptError && (
          <p style={{ color: "#dc2626", fontSize: "0.875rem" }}>Script yüklenirken hata oluştu.</p>
        )}
        {!scriptLoading && !scriptError && script === null && (
          <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
            Henüz script oluşturulmadı.
          </p>
        )}
        {!scriptLoading && !scriptError && script && (
          <div>
            <InfoRow label="Versiyon" value={script.version} />
            <InfoRow label="Kaynak Tipi" value={script.source_type} />
            <InfoRow label="Durum" value={script.generation_status} />
            <div style={{ marginTop: "0.75rem" }}>
              <div style={{ color: "#64748b", fontWeight: 500, fontSize: "0.8125rem", marginBottom: "0.25rem" }}>
                İçerik Önizleme
              </div>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.8125rem",
                  color: "#334155",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                  maxHeight: "120px",
                  overflow: "hidden",
                }}
              >
                {isBlank(script.content)
                  ? "—"
                  : (script.content ?? "").length > 300
                  ? (script.content ?? "").slice(0, 300) + "…"
                  : script.content}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Metadata">
        {metadataLoading && <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Yükleniyor...</p>}
        {metadataError && (
          <p style={{ color: "#dc2626", fontSize: "0.875rem" }}>Metadata yüklenirken hata oluştu.</p>
        )}
        {!metadataLoading && !metadataError && metadata === null && (
          <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
            Henüz metadata oluşturulmadı.
          </p>
        )}
        {!metadataLoading && !metadataError && metadata && (
          <div>
            <InfoRow label="Başlık" value={metadata.title} />
            <InfoRow label="Kategori" value={metadata.category} />
            <InfoRow label="Dil" value={metadata.language} />
            <InfoRow label="Versiyon" value={metadata.version} />
            <InfoRow label="Kaynak Tipi" value={metadata.source_type} />
            <InfoRow label="Durum" value={metadata.generation_status} />
            {metadata.tags_json && (
              <InfoRow label="Etiketler" value={<code style={{ fontSize: "0.8rem", wordBreak: "break-all", overflowWrap: "anywhere" }}>{metadata.tags_json}</code>} />
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
