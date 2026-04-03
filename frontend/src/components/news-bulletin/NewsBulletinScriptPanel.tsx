import { useState } from "react";
import { useNewsBulletinScript } from "../../hooks/useNewsBulletinScript";
import { useCreateNewsBulletinScript } from "../../hooks/useCreateNewsBulletinScript";
import { useUpdateNewsBulletinScript } from "../../hooks/useUpdateNewsBulletinScript";
import { NewsBulletinScriptForm } from "./NewsBulletinScriptForm";
import type { ScriptFormValues } from "./NewsBulletinScriptForm";

interface Props {
  bulletinId: string;
}

const PREVIEW_LIMIT = 400;

export function NewsBulletinScriptPanel({ bulletinId }: Props) {
  const { data: script, isLoading, isError } = useNewsBulletinScript(bulletinId);
  const createMutation = useCreateNewsBulletinScript(bulletinId);
  const updateMutation = useUpdateNewsBulletinScript(bulletinId);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [showFull, setShowFull] = useState(false);

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "1rem",
    marginTop: "1rem",
  };

  function handleCreate(values: ScriptFormValues) {
    createMutation.mutate(
      {
        content: values.content,
        source_type: values.source_type || undefined,
        generation_status: values.generation_status || undefined,
        notes: values.notes || undefined,
      },
      { onSuccess: () => setMode("view") }
    );
  }

  function handleUpdate(values: ScriptFormValues) {
    updateMutation.mutate(
      {
        content: values.content,
        source_type: values.source_type || undefined,
        generation_status: values.generation_status || undefined,
        notes: values.notes || undefined,
      },
      { onSuccess: () => setMode("view") }
    );
  }

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

  if (mode === "create") {
    return (
      <div style={sectionStyle}>
        <h4 style={{ margin: "0 0 1rem" }}>Script Oluştur</h4>
        <NewsBulletinScriptForm
          mode="create"
          isSubmitting={createMutation.isPending}
          submitError={createMutation.isError ? "Oluşturma başarısız." : null}
          onSubmit={handleCreate}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <div style={sectionStyle}>
        <h4 style={{ margin: "0 0 1rem" }}>Script Düzenle</h4>
        <NewsBulletinScriptForm
          mode="edit"
          initial={{
            content: script?.content ?? "",
            source_type: script?.source_type ?? "manual",
            generation_status: script?.generation_status ?? "draft",
            notes: script?.notes ?? "",
          }}
          isSubmitting={updateMutation.isPending}
          submitError={updateMutation.isError ? "Güncelleme başarısız." : null}
          onSubmit={handleUpdate}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  // view mode
  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h4 style={{ margin: 0 }}>Script</h4>
        {script ? (
          <button onClick={() => setMode("edit")}>Düzenle</button>
        ) : (
          <button onClick={() => setMode("create")}>+ Script Ekle</button>
        )}
      </div>

      {!script ? (
        <p style={{ color: "#94a3b8", margin: 0 }}>Henüz script yok.</p>
      ) : (
        <div>
          <table style={{ fontSize: "0.8125rem", borderCollapse: "collapse", marginBottom: "0.75rem" }}>
            <tbody>
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Versiyon</td>
                <td>{script.version ?? "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Kaynak</td>
                <td>{script.source_type ?? "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Durum</td>
                <td>{script.generation_status ?? "—"}</td>
              </tr>
              {script.notes && (
                <tr>
                  <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Notlar</td>
                  <td>{script.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "0.75rem", fontSize: "0.8125rem", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>
            {showFull || (script.content ?? "").length <= PREVIEW_LIMIT
              ? (script.content ?? "—")
              : (script.content ?? "").slice(0, PREVIEW_LIMIT) + "..."}
          </div>
          {(script.content ?? "").length > PREVIEW_LIMIT && (
            <button onClick={() => setShowFull((v) => !v)} style={{ marginTop: "0.5rem", background: "none", border: "none", color: "#3b82f6", cursor: "pointer", padding: 0 }}>
              {showFull ? "Daha az göster" : "Tamamını göster"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
