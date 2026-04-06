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
    <div className="border border-border-subtle rounded-md bg-neutral-0 mb-5 overflow-hidden">
      <div className="px-3 py-2.5 bg-neutral-50 border-b border-border-subtle font-semibold text-sm">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 mb-1 text-md">
      <span className="text-neutral-600 font-medium min-w-[120px]">{label}</span>
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
        {scriptLoading && <p className="text-neutral-600 text-md">Yükleniyor...</p>}
        {scriptError && (
          <p className="text-error text-md">Script yüklenirken hata oluştu.</p>
        )}
        {!scriptLoading && !scriptError && script === null && (
          <p className="text-neutral-500 text-md">
            Henüz script oluşturulmadı.
          </p>
        )}
        {!scriptLoading && !scriptError && script && (
          <div>
            <InfoRow label="Versiyon" value={script.version} />
            <InfoRow label="Kaynak Tipi" value={script.source_type} />
            <InfoRow label="Durum" value={script.generation_status} />
            <div className="mt-3">
              <div className="text-neutral-600 font-medium text-base mb-1">
                İçerik Önizleme
              </div>
              <div className="bg-neutral-50 border border-border-subtle rounded-sm px-3 py-2 text-base text-neutral-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-[120px] overflow-hidden">
                {isBlank(script.content)
                  ? "—"
                  : (script.content ?? "").length > 300
                  ? (script.content ?? "").slice(0, 300) + "..."
                  : script.content}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Metadata">
        {metadataLoading && <p className="text-neutral-600 text-md">Yükleniyor...</p>}
        {metadataError && (
          <p className="text-error text-md">Metadata yüklenirken hata oluştu.</p>
        )}
        {!metadataLoading && !metadataError && metadata === null && (
          <p className="text-neutral-500 text-md">
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
              <InfoRow label="Etiketler" value={<code className="text-base break-all [overflow-wrap:anywhere]">{metadata.tags_json}</code>} />
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
