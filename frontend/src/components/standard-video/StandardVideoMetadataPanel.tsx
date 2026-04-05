import { useState } from "react";
import type { StandardVideoMetadataResponse } from "../../api/standardVideoApi";
import { StandardVideoMetadataForm } from "./StandardVideoMetadataForm";
import type { MetadataFormValues } from "./StandardVideoMetadataForm";
import { isBlank } from "../../lib/isBlank";
import { colors, radius, typography } from "../design-system/tokens";

const DASH = "—";
const PAD_B_SM = "0.375rem";
const LABEL_TD: React.CSSProperties = { color: colors.neutral[600], paddingRight: "1rem", paddingBottom: PAD_B_SM, whiteSpace: "nowrap" };
const LABEL_TD_TOP: React.CSSProperties = { ...LABEL_TD, verticalAlign: "top" };
const SECTION_STYLE: React.CSSProperties = { border: `1px solid ${colors.border.subtle}`, borderRadius: radius.md, padding: "1rem", marginBottom: "1.25rem" };
const FORM_HEADING: React.CSSProperties = { margin: "0 0 1rem", fontSize: typography.size.lg, fontWeight: 600 };

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


  if (isLoading) {
    return (
      <div style={SECTION_STYLE}>
        <p style={{ color: colors.neutral[600], margin: 0 }}>Metadata yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={SECTION_STYLE}>
        <p style={{ color: colors.error.base, margin: 0 }}>Metadata yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div style={SECTION_STYLE}>
        <h4 style={FORM_HEADING}>
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
      <div style={SECTION_STYLE}>
        <h4 style={FORM_HEADING}>
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
    <div style={SECTION_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h4 style={{ margin: 0, fontSize: typography.size.lg, fontWeight: 600 }}>Metadata</h4>
        {metadata ? (
          <button
            onClick={() => setMode("edit")}
            style={{
              fontSize: typography.size.base,
              padding: "0.25rem 0.75rem",
              background: "transparent",
              color: colors.brand[500],
              border: `1px solid ${colors.brand[500]}`,
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
          >
            Düzenle
          </button>
        ) : (
          <button
            onClick={() => setMode("create")}
            style={{
              fontSize: typography.size.base,
              padding: "0.25rem 0.75rem",
              background: colors.brand[500],
              color: colors.neutral[0],
              border: "none",
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
          >
            + Metadata Ekle
          </button>
        )}
      </div>

      {!metadata ? (
        <p style={{ color: colors.neutral[500], fontSize: typography.size.md, margin: 0 }}>
          Henüz metadata yok.
        </p>
      ) : (
        <table style={{ fontSize: typography.size.base, borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            <tr>
              <td style={LABEL_TD_TOP}>Başlık</td>
              <td style={{ paddingBottom: PAD_B_SM, fontWeight: 500, wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.title ?? DASH}</td>
            </tr>
            {metadata.description && (
              <tr>
                <td style={LABEL_TD_TOP}>Açıklama</td>
                <td style={{ paddingBottom: PAD_B_SM, wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.description}</td>
              </tr>
            )}
            {tags.length > 0 && (
              <tr>
                <td style={LABEL_TD_TOP}>Etiketler</td>
                <td style={{ paddingBottom: PAD_B_SM }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        style={{
                          background: colors.border.subtle,
                          borderRadius: radius.sm,
                          padding: "0.125rem 0.375rem",
                          fontSize: typography.size.sm,
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
                <td style={LABEL_TD}>Kategori</td>
                <td style={{ paddingBottom: PAD_B_SM }}>{metadata.category}</td>
              </tr>
            )}
            {metadata.language && (
              <tr>
                <td style={LABEL_TD}>Dil</td>
                <td style={{ paddingBottom: PAD_B_SM }}>{metadata.language}</td>
              </tr>
            )}
            <tr>
              <td style={LABEL_TD}>Versiyon</td>
              <td style={{ paddingBottom: PAD_B_SM }}>{metadata.version ?? DASH}</td>
            </tr>
            <tr>
              <td style={LABEL_TD}>Kaynak</td>
              <td style={{ paddingBottom: PAD_B_SM }}>{metadata.source_type ?? DASH}</td>
            </tr>
            <tr>
              <td style={LABEL_TD}>Durum</td>
              <td style={{ paddingBottom: PAD_B_SM }}>{metadata.generation_status ?? DASH}</td>
            </tr>
            {!isBlank(metadata.notes) && (
              <tr>
                <td style={LABEL_TD_TOP}>Notlar</td>
                <td style={{ paddingBottom: PAD_B_SM, wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.notes}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
