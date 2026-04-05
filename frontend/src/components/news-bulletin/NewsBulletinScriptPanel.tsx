import { useState } from "react";
import { useNewsBulletinScript } from "../../hooks/useNewsBulletinScript";
import { useCreateNewsBulletinScript } from "../../hooks/useCreateNewsBulletinScript";
import { useUpdateNewsBulletinScript } from "../../hooks/useUpdateNewsBulletinScript";
import { NewsBulletinScriptForm } from "./NewsBulletinScriptForm";
import { isBlank } from "../../lib/isBlank";
import type { ScriptFormValues } from "./NewsBulletinScriptForm";
import { colors, radius, typography } from "../design-system/tokens";

const DASH = "—";
const LABEL_TD: React.CSSProperties = { color: colors.neutral[600], paddingRight: "1rem", paddingBottom: "0.25rem" };
const SECTION_STYLE: React.CSSProperties = { border: `1px solid ${colors.border.subtle}`, borderRadius: radius.md, padding: "1rem", marginTop: "1rem" };

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
      <div style={SECTION_STYLE}>
        <p style={{ color: colors.neutral[600], margin: 0 }}>Script yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={SECTION_STYLE}>
        <p style={{ color: colors.error.base, margin: 0 }}>Script yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div style={SECTION_STYLE}>
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
      <div style={SECTION_STYLE}>
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
    <div style={SECTION_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h4 style={{ margin: 0 }} data-testid="nb-script-heading">Script</h4>
        {script ? (
          <button onClick={() => setMode("edit")}>Düzenle</button>
        ) : (
          <button onClick={() => setMode("create")}>+ Script Ekle</button>
        )}
      </div>
      <p
        style={{
          margin: "0 0 0.75rem",
          fontSize: typography.size.base,
          color: colors.neutral[500],
          lineHeight: 1.5,
        }}
        data-testid="nb-script-note"
      >
        Secili haberlerden uretilen bulten taslagi. Script, haber seciminden sonraki
        uretim adimidir.
      </p>

      {!script ? (
        <p style={{ color: colors.neutral[500], margin: 0 }}>Henüz script yok.</p>
      ) : (
        <div>
          <table style={{ fontSize: typography.size.base, borderCollapse: "collapse", marginBottom: "0.75rem" }}>
            <tbody>
              <tr>
                <td style={LABEL_TD}>Versiyon</td>
                <td>{script.version ?? DASH}</td>
              </tr>
              <tr>
                <td style={LABEL_TD}>Kaynak</td>
                <td>{script.source_type ?? DASH}</td>
              </tr>
              <tr>
                <td style={LABEL_TD}>Durum</td>
                <td>{script.generation_status ?? DASH}</td>
              </tr>
              {!isBlank(script.notes) && (
                <tr>
                  <td style={LABEL_TD}>Notlar</td>
                  <td>{script.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ background: colors.neutral[50], border: `1px solid ${colors.border.subtle}`, borderRadius: radius.sm, padding: "0.75rem", fontSize: typography.size.base, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>
            {isBlank(script.content)
              ? DASH
              : showFull || (script.content ?? "").length <= PREVIEW_LIMIT
              ? script.content
              : (script.content ?? "").slice(0, PREVIEW_LIMIT) + "..."}
          </div>
          {(script.content ?? "").length > PREVIEW_LIMIT && (
            <button onClick={() => setShowFull((v) => !v)} style={{ marginTop: "0.5rem", background: "none", border: "none", color: colors.brand[500], cursor: "pointer", padding: 0 }}>
              {showFull ? "Daha az göster" : "Tamamını göster"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
