import { useState } from "react";
import type { StandardVideoScriptResponse } from "../../api/standardVideoApi";
import { StandardVideoScriptForm } from "./StandardVideoScriptForm";
import type { ScriptFormValues } from "./StandardVideoScriptForm";
import { isBlank } from "../../lib/isBlank";

const PREVIEW_LIMIT = 400;
const DASH = "—";
const PAD_B_XS = "0.25rem";
const LABEL_TD: React.CSSProperties = { color: "#64748b", paddingRight: "1rem", paddingBottom: PAD_B_XS };
const SECTION_STYLE: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: "6px", padding: "1rem", marginBottom: "1.25rem" };
const FORM_HEADING: React.CSSProperties = { margin: "0 0 1rem", fontSize: "0.9375rem", fontWeight: 600 };
const RADIUS_XS = "4px";
const CURSOR_PTR = "pointer";
const COLOR_BLUE = "#3b82f6";

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

  function handleCreate(values: ScriptFormValues) {
    onCreate({
      content: values.content,
      source_type: values.source_type || undefined,
      generation_status: values.generation_status || undefined,
      notes: values.notes || undefined,
    });
    setMode("view");
  }

  function handleUpdate(values: ScriptFormValues) {
    onUpdate({
      content: values.content,
      source_type: values.source_type || undefined,
      generation_status: values.generation_status || undefined,
      notes: values.notes || undefined,
    });
    setMode("view");
  }


  if (isLoading) {
    return (
      <div style={SECTION_STYLE}>
        <p style={{ color: "#64748b", margin: 0 }}>Script yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={SECTION_STYLE}>
        <p style={{ color: "#dc2626", margin: 0 }}>Script yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div style={SECTION_STYLE}>
        <h4 style={FORM_HEADING}>Script Oluştur</h4>
        <StandardVideoScriptForm
          mode="create"
          isSubmitting={isCreating}
          submitError={createError}
          onSubmit={handleCreate}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <div style={SECTION_STYLE}>
        <h4 style={FORM_HEADING}>Script Düzenle</h4>
        <StandardVideoScriptForm
          mode="edit"
          initial={{
            content: toStr(script?.content),
            source_type: toStr(script?.source_type) || "manual",
            generation_status: toStr(script?.generation_status) || "draft",
            notes: toStr(script?.notes),
          }}
          isSubmitting={isUpdating}
          submitError={updateError}
          onSubmit={handleUpdate}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  // view mode
  return (
    <div style={SECTION_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h4 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}>Script</h4>
        {script ? (
          <button
            onClick={() => setMode("edit")}
            style={{
              fontSize: "0.8125rem",
              padding: "0.25rem 0.75rem",
              background: "transparent",
              color: COLOR_BLUE,
              border: "1px solid #3b82f6",
              borderRadius: RADIUS_XS,
              cursor: CURSOR_PTR,
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
              background: COLOR_BLUE,
              color: "#fff",
              border: "none",
              borderRadius: RADIUS_XS,
              cursor: CURSOR_PTR,
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
                <td style={LABEL_TD}>Versiyon</td>
                <td style={{ paddingBottom: PAD_B_XS }}>{script.version ?? DASH}</td>
              </tr>
              <tr>
                <td style={LABEL_TD}>Kaynak</td>
                <td style={{ paddingBottom: PAD_B_XS }}>{script.source_type ?? DASH}</td>
              </tr>
              <tr>
                <td style={LABEL_TD}>Durum</td>
                <td style={{ paddingBottom: PAD_B_XS }}>{script.generation_status ?? DASH}</td>
              </tr>
              {!isBlank(script.notes) && (
                <tr>
                  <td style={LABEL_TD}>Notlar</td>
                  <td style={{ paddingBottom: PAD_B_XS }}>{script.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: RADIUS_XS,
              padding: "0.75rem",
              fontSize: "0.8125rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {isBlank(script.content)
              ? DASH
              : showFull || (script.content ?? "").length <= PREVIEW_LIMIT
              ? script.content
              : (script.content ?? "").slice(0, PREVIEW_LIMIT) + "..."}
          </div>
          {(script.content ?? "").length > PREVIEW_LIMIT && (
            <button
              onClick={() => setShowFull((v) => !v)}
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8125rem",
                background: "none",
                border: "none",
                color: COLOR_BLUE,
                cursor: CURSOR_PTR,
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
