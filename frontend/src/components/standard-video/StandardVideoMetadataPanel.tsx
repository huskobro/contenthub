import { useState } from "react";
import type { StandardVideoMetadataResponse } from "../../api/standardVideoApi";
import { StandardVideoMetadataForm } from "./StandardVideoMetadataForm";
import type { MetadataFormValues } from "./StandardVideoMetadataForm";

interface Props {
  videoId: string;
  isLoading: boolean;
  isError: boolean;
  metadata: StandardVideoMetadataResponse | null | undefined;
  onCreate: (values: {
    title: string;
    description?: string;
    tags_json?: string;
    category?: string;
    language?: string;
    source_type?: string;
    generation_status?: string;
    notes?: string;
  }) => void;
  onUpdate: (values: {
    title?: string;
    description?: string;
    tags_json?: string;
    category?: string;
    language?: string;
    source_type?: string;
    generation_status?: string;
    notes?: string;
  }) => void;
  isCreating: boolean;
  isUpdating: boolean;
  createError: string | null;
  updateError: string | null;
}

function toStr(v: string | null | undefined): string {
  return v ?? "";
}

/** Parse tags_json (JSON array) or comma-separated string → string[] */
function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  // try JSON array first
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // fall through to comma split
    }
  }
  // comma-separated fallback
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Convert form tags_json string (comma-separated) to JSON array string for storage */
function normalizeTagsJson(raw: string): string | undefined {
  if (!raw.trim()) return undefined;
  const tags = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return tags.length > 0 ? JSON.stringify(tags) : undefined;
}

function formValuesToPayload(values: MetadataFormValues) {
  return {
    title: values.title,
    description: values.description || undefined,
    tags_json: normalizeTagsJson(values.tags_json),
    category: values.category || undefined,
    language: values.language || undefined,
    source_type: values.source_type || undefined,
    generation_status: values.generation_status || undefined,
    notes: values.notes || undefined,
  };
}

/** Convert stored tags_json (JSON array) back to comma string for the form */
function tagsJsonToFormValue(raw: string | null | undefined): string {
  const tags = parseTags(raw);
  return tags.join(", ");
}

export function StandardVideoMetadataPanel({
  isLoading,
  isError,
  metadata,
  onCreate,
  onUpdate,
  isCreating,
  isUpdating,
  createError,
  updateError,
}: Props) {
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "1rem",
    marginBottom: "1.25rem",
  };

  if (isLoading) {
    return (
      <div style={sectionStyle}>
        <p style={{ color: "#64748b", margin: 0 }}>Metadata yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={sectionStyle}>
        <p style={{ color: "#dc2626", margin: 0 }}>Metadata yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div style={sectionStyle}>
        <h4 style={{ margin: "0 0 1rem", fontSize: "0.9375rem", fontWeight: 600 }}>
          Metadata Oluştur
        </h4>
        <StandardVideoMetadataForm
          mode="create"
          isSubmitting={isCreating}
          submitError={createError}
          onSubmit={(values) => {
            onCreate(formValuesToPayload(values));
            setMode("view");
          }}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <div style={sectionStyle}>
        <h4 style={{ margin: "0 0 1rem", fontSize: "0.9375rem", fontWeight: 600 }}>
          Metadata Düzenle
        </h4>
        <StandardVideoMetadataForm
          mode="edit"
          initial={{
            title: toStr(metadata?.title),
            description: toStr(metadata?.description),
            tags_json: tagsJsonToFormValue(metadata?.tags_json),
            category: toStr(metadata?.category),
            language: toStr(metadata?.language),
            source_type: toStr(metadata?.source_type) || "manual",
            generation_status: toStr(metadata?.generation_status) || "draft",
            notes: toStr(metadata?.notes),
          }}
          isSubmitting={isUpdating}
          submitError={updateError}
          onSubmit={(values) => {
            onUpdate(formValuesToPayload(values));
            setMode("view");
          }}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  // view mode
  const tags = parseTags(metadata?.tags_json);

  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h4 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}>Metadata</h4>
        {metadata ? (
          <button
            onClick={() => setMode("edit")}
            style={{
              fontSize: "0.8125rem",
              padding: "0.25rem 0.75rem",
              background: "transparent",
              color: "#3b82f6",
              border: "1px solid #3b82f6",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Düzenle
          </button>
        ) : (
          <button
            onClick={() => setMode("create")}
            style={{
              fontSize: "0.8125rem",
              padding: "0.25rem 0.75rem",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Metadata Ekle
          </button>
        )}
      </div>

      {!metadata ? (
        <p style={{ color: "#94a3b8", fontSize: "0.875rem", margin: 0 }}>
          Henüz metadata yok.
        </p>
      ) : (
        <table style={{ fontSize: "0.8125rem", borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.375rem", whiteSpace: "nowrap", verticalAlign: "top" }}>Başlık</td>
              <td style={{ paddingBottom: "0.375rem", fontWeight: 500, wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.title}</td>
            </tr>
            {metadata.description && (
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.375rem", whiteSpace: "nowrap", verticalAlign: "top" }}>Açıklama</td>
                <td style={{ paddingBottom: "0.375rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.description}</td>
              </tr>
            )}
            {tags.length > 0 && (
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.375rem", whiteSpace: "nowrap", verticalAlign: "top" }}>Etiketler</td>
                <td style={{ paddingBottom: "0.375rem" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        style={{
                          background: "#e2e8f0",
                          borderRadius: "3px",
                          padding: "0.125rem 0.375rem",
                          fontSize: "0.75rem",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )}
            {metadata.category && (
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.375rem", whiteSpace: "nowrap" }}>Kategori</td>
                <td style={{ paddingBottom: "0.375rem" }}>{metadata.category}</td>
              </tr>
            )}
            {metadata.language && (
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.375rem", whiteSpace: "nowrap" }}>Dil</td>
                <td style={{ paddingBottom: "0.375rem" }}>{metadata.language}</td>
              </tr>
            )}
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.375rem", whiteSpace: "nowrap" }}>Versiyon</td>
              <td style={{ paddingBottom: "0.375rem" }}>{metadata.version}</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.375rem", whiteSpace: "nowrap" }}>Kaynak</td>
              <td style={{ paddingBottom: "0.375rem" }}>{metadata.source_type}</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.375rem", whiteSpace: "nowrap" }}>Durum</td>
              <td style={{ paddingBottom: "0.375rem" }}>{metadata.generation_status}</td>
            </tr>
            {metadata.notes && (
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.375rem", whiteSpace: "nowrap", verticalAlign: "top" }}>Notlar</td>
                <td style={{ paddingBottom: "0.375rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.notes}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
