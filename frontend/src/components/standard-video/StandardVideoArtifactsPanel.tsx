import type {
  StandardVideoScriptResponse,
  StandardVideoMetadataResponse,
} from "../../api/standardVideoApi";
import { isBlank } from "../../lib/isBlank";
import { colors, radius, typography } from "../design-system/tokens";

const FONT_SM = "0.875rem";
const BORDER = `1px solid ${colors.border.subtle}`;

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
        border: BORDER,
        borderRadius: radius.md,
        background: colors.neutral[0],
        marginBottom: "1.25rem",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.625rem 0.75rem",
          background: colors.neutral[50],
          borderBottom: BORDER,
          fontWeight: 600,
          fontSize: FONT_SM,
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
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem", fontSize: typography.size.md }}>
      <span style={{ color: colors.neutral[600], fontWeight: 500, minWidth: "120px" }}>{label}</span>
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
        {scriptLoading && <p style={{ color: colors.neutral[600], fontSize: typography.size.md }}>Yükleniyor...</p>}
        {scriptError && (
          <p style={{ color: colors.error.base, fontSize: typography.size.md }}>Script yüklenirken hata oluştu.</p>
        )}
        {!scriptLoading && !scriptError && script === null && (
          <p style={{ color: colors.neutral[500], fontSize: typography.size.md }}>
            Henüz script oluşturulmadı.
          </p>
        )}
        {!scriptLoading && !scriptError && script && (
          <div>
            <InfoRow label="Versiyon" value={script.version} />
            <InfoRow label="Kaynak Tipi" value={script.source_type} />
            <InfoRow label="Durum" value={script.generation_status} />
            <div style={{ marginTop: "0.75rem" }}>
              <div style={{ color: colors.neutral[600], fontWeight: 500, fontSize: typography.size.base, marginBottom: "0.25rem" }}>
                İçerik Önizleme
              </div>
              <div
                style={{
                  background: colors.neutral[50],
                  border: BORDER,
                  borderRadius: radius.sm,
                  padding: "0.5rem 0.75rem",
                  fontSize: typography.size.base,
                  color: colors.neutral[800],
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
        {metadataLoading && <p style={{ color: colors.neutral[600], fontSize: typography.size.md }}>Yükleniyor...</p>}
        {metadataError && (
          <p style={{ color: colors.error.base, fontSize: typography.size.md }}>Metadata yüklenirken hata oluştu.</p>
        )}
        {!metadataLoading && !metadataError && metadata === null && (
          <p style={{ color: colors.neutral[500], fontSize: typography.size.md }}>
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
              <InfoRow label="Etiketler" value={<code style={{ fontSize: typography.size.base, wordBreak: "break-all", overflowWrap: "anywhere" }}>{metadata.tags_json}</code>} />
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
