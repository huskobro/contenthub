import { useState } from "react";
import type { StandardVideoScriptResponse } from "../../api/standardVideoApi";

const PREVIEW_LIMIT = 400;

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

const ROW_STYLE: React.CSSProperties = {
  marginBottom: "0.875rem",
};

interface ScriptFormValues {
  content: string;
  source_type: string;
  generation_status: string;
  notes: string;
}

interface Props {
  videoId: string;
  isLoading: boolean;
  isError: boolean;
  script: StandardVideoScriptResponse | null | undefined;
  onCreate: (values: { content: string; source_type?: string; generation_status?: string; notes?: string }) => void;
  onUpdate: (values: { content?: string; source_type?: string; generation_status?: string; notes?: string }) => void;
  isCreating: boolean;
  isUpdating: boolean;
  createError: string | null;
  updateError: string | null;
}

function toStr(v: string | null | undefined): string {
  return v ?? "";
}

export function StandardVideoScriptPanel({
  isLoading,
  isError,
  script,
  onCreate,
  onUpdate,
  isCreating,
  isUpdating,
  createError,
  updateError,
}: Props) {
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [showFull, setShowFull] = useState(false);
  const [form, setForm] = useState<ScriptFormValues>({
    content: "",
    source_type: "manual",
    generation_status: "draft",
    notes: "",
  });
  const [contentError, setContentError] = useState("");

  function openCreate() {
    setForm({ content: "", source_type: "manual", generation_status: "draft", notes: "" });
    setContentError("");
    setMode("create");
  }

  function openEdit() {
    setForm({
      content: toStr(script?.content),
      source_type: toStr(script?.source_type) || "manual",
      generation_status: toStr(script?.generation_status) || "draft",
      notes: toStr(script?.notes),
    });
    setContentError("");
    setMode("edit");
  }

  function cancel() {
    setMode("view");
    setContentError("");
  }

  function set(field: keyof ScriptFormValues, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim()) {
      setContentError("İçerik zorunludur.");
      return;
    }
    setContentError("");
    const payload = {
      content: form.content,
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
        <p style={{ color: "#64748b", margin: 0 }}>Script yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={sectionStyle}>
        <p style={{ color: "#dc2626", margin: 0 }}>Script yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (mode === "create" || mode === "edit") {
    const isSubmitting = mode === "create" ? isCreating : isUpdating;
    const mutationError = mode === "create" ? createError : updateError;
    return (
      <div style={sectionStyle}>
        <h4 style={{ margin: "0 0 1rem", fontSize: "0.9375rem", fontWeight: 600 }}>
          {mode === "create" ? "Script Oluştur" : "Script Düzenle"}
        </h4>
        <form onSubmit={handleSubmit}>
          <div style={ROW_STYLE}>
            <label style={LABEL_STYLE}>
              İçerik <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <textarea
              style={{ ...FIELD_STYLE, minHeight: "160px", resize: "vertical" }}
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Script içeriği..."
            />
            {contentError && (
              <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>
                {contentError}
              </p>
            )}
          </div>
          <div style={ROW_STYLE}>
            <label style={LABEL_STYLE}>Kaynak Tipi</label>
            <input
              style={FIELD_STYLE}
              value={form.source_type}
              onChange={(e) => set("source_type", e.target.value)}
              placeholder="örn. manual, ai"
            />
          </div>
          <div style={ROW_STYLE}>
            <label style={LABEL_STYLE}>Üretim Durumu</label>
            <input
              style={FIELD_STYLE}
              value={form.generation_status}
              onChange={(e) => set("generation_status", e.target.value)}
              placeholder="örn. draft, approved"
            />
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
  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h4 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}>Script</h4>
        {script ? (
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
            + Script Ekle
          </button>
        )}
      </div>

      {!script ? (
        <p style={{ color: "#94a3b8", fontSize: "0.875rem", margin: 0 }}>
          Henüz script yok.
        </p>
      ) : (
        <div>
          <table style={{ fontSize: "0.8125rem", borderCollapse: "collapse", marginBottom: "0.75rem" }}>
            <tbody>
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Versiyon</td>
                <td style={{ paddingBottom: "0.25rem" }}>{script.version}</td>
              </tr>
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Kaynak</td>
                <td style={{ paddingBottom: "0.25rem" }}>{script.source_type}</td>
              </tr>
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Durum</td>
                <td style={{ paddingBottom: "0.25rem" }}>{script.generation_status}</td>
              </tr>
              {script.notes && (
                <tr>
                  <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Notlar</td>
                  <td style={{ paddingBottom: "0.25rem" }}>{script.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              padding: "0.75rem",
              fontSize: "0.8125rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {showFull || script.content.length <= PREVIEW_LIMIT
              ? script.content
              : script.content.slice(0, PREVIEW_LIMIT) + "..."}
          </div>
          {script.content.length > PREVIEW_LIMIT && (
            <button
              onClick={() => setShowFull((v) => !v)}
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8125rem",
                background: "none",
                border: "none",
                color: "#3b82f6",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {showFull ? "Daha az göster" : "Tamamını göster"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
