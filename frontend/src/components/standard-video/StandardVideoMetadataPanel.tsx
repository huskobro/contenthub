import { useState } from "react";
import type { StandardVideoMetadataResponse } from "../../api/standardVideoApi";

const FIELD_STYLE: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.375rem 0.5rem",
  fontSize: "0.875rem",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "#475569",
  marginBottom: "0.25rem",
};

const ROW_STYLE: React.CSSProperties = { marginBottom: "0.875rem" };

const SOURCE_TYPE_OPTIONS = ["manual", "generated"];
const GENERATION_STATUS_OPTIONS = ["draft", "ready"];

interface MetadataFormValues {
  title: string;
  description: string;
  tags_json: string;
  category: string;
  language: string;
  source_type: string;
  generation_status: string;
  notes: string;
}

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

function parseTags(tags_json: string | null | undefined): string[] {
  if (!tags_json) return [];
  try {
    const parsed = JSON.parse(tags_json);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // ignore
  }
  return [];
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
  const [form, setForm] = useState<MetadataFormValues>({
    title: "",
    description: "",
    tags_json: "",
    category: "",
    language: "",
    source_type: "manual",
    generation_status: "draft",
    notes: "",
  });
  const [titleError, setTitleError] = useState("");

  function openCreate() {
    setForm({
      title: "",
      description: "",
      tags_json: "",
      category: "",
      language: "",
      source_type: "manual",
      generation_status: "draft",
      notes: "",
    });
    setTitleError("");
    setMode("create");
  }

  function openEdit() {
    setForm({
      title: toStr(metadata?.title),
      description: toStr(metadata?.description),
      tags_json: toStr(metadata?.tags_json),
      category: toStr(metadata?.category),
      language: toStr(metadata?.language),
      source_type: toStr(metadata?.source_type) || "manual",
      generation_status: toStr(metadata?.generation_status) || "draft",
      notes: toStr(metadata?.notes),
    });
    setTitleError("");
    setMode("edit");
  }

  function cancel() {
    setMode("view");
    setTitleError("");
  }

  function set(field: keyof MetadataFormValues, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError("Başlık zorunludur.");
      return;
    }
    setTitleError("");
    const payload = {
      title: form.title,
      description: form.description || undefined,
      tags_json: form.tags_json || undefined,
      category: form.category || undefined,
      language: form.language || undefined,
      source_type: form.source_type || undefined,
      generation_status: form.generation_status || undefined,
      notes: form.notes || undefined,
    };
    if (mode === "create") {
      onCreate(payload);
    } else {
      onUpdate(payload);
    }
    setMode("view");
  }

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

  if (mode === "create" || mode === "edit") {
    const isSubmitting = mode === "create" ? isCreating : isUpdating;
    const mutationError = mode === "create" ? createError : updateError;
    return (
      <div style={sectionStyle}>
        <h4 style={{ margin: "0 0 1rem", fontSize: "0.9375rem", fontWeight: 600 }}>
          {mode === "create" ? "Metadata Oluştur" : "Metadata Düzenle"}
        </h4>
        <form onSubmit={handleSubmit}>
          <div style={ROW_STYLE}>
            <label style={LABEL_STYLE}>
              Başlık <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              style={FIELD_STYLE}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Video başlığı"
            />
            {titleError && (
              <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>
                {titleError}
              </p>
            )}
          </div>
          <div style={ROW_STYLE}>
            <label style={LABEL_STYLE}>Açıklama</label>
            <textarea
              style={{ ...FIELD_STYLE, minHeight: "80px", resize: "vertical" }}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Video açıklaması"
            />
          </div>
          <div style={ROW_STYLE}>
            <label style={LABEL_STYLE}>Etiketler (JSON dizisi)</label>
            <input
              style={FIELD_STYLE}
              value={form.tags_json}
              onChange={(e) => set("tags_json", e.target.value)}
              placeholder='["etiket1", "etiket2"]'
            />
          </div>
          <div style={ROW_STYLE}>
            <label style={LABEL_STYLE}>Kategori</label>
            <input
              style={FIELD_STYLE}
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="örn. education, technology"
            />
          </div>
          <div style={ROW_STYLE}>
            <label style={LABEL_STYLE}>Dil</label>
            <input
              style={FIELD_STYLE}
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
              placeholder="örn. tr, en"
            />
          </div>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.875rem" }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>Kaynak Tipi</label>
              <select
                style={FIELD_STYLE}
                value={form.source_type}
                onChange={(e) => set("source_type", e.target.value)}
              >
                {SOURCE_TYPE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>Üretim Durumu</label>
              <select
                style={FIELD_STYLE}
                value={form.generation_status}
                onChange={(e) => set("generation_status", e.target.value)}
              >
                {GENERATION_STATUS_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={ROW_STYLE}>
            <label style={LABEL_STYLE}>Notlar</label>
            <input
              style={FIELD_STYLE}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Opsiyonel notlar"
            />
          </div>
          {mutationError && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
              {mutationError}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "0.5rem 1.25rem",
                fontSize: "0.875rem",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Kaydediliyor..." : mode === "create" ? "Oluştur" : "Güncelle"}
            </button>
            <button
              type="button"
              onClick={cancel}
              style={{
                padding: "0.5rem 1.25rem",
                fontSize: "0.875rem",
                background: "transparent",
                color: "#64748b",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              İptal
            </button>
          </div>
        </form>
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
            onClick={openEdit}
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
            onClick={openCreate}
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
              <td style={{ paddingBottom: "0.375rem", fontWeight: 500 }}>{metadata.title}</td>
            </tr>
            {metadata.description && (
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.375rem", whiteSpace: "nowrap", verticalAlign: "top" }}>Açıklama</td>
                <td style={{ paddingBottom: "0.375rem" }}>{metadata.description}</td>
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
                <td style={{ paddingBottom: "0.375rem" }}>{metadata.notes}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
