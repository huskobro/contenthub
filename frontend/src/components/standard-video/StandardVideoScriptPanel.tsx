import { useState } from "react";
import type { StandardVideoScriptResponse } from "../../api/standardVideoApi";
import { StandardVideoScriptForm } from "./StandardVideoScriptForm";
import type { ScriptFormValues } from "./StandardVideoScriptForm";
import { isBlank } from "../../lib/isBlank";

const PREVIEW_LIMIT = 400;
const DASH = "—";

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

  const sectionCls = "border border-border-subtle rounded-md p-4 mb-5";

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
      <div className={sectionCls}>
        <p className="text-neutral-600 m-0">Script yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={sectionCls}>
        <p className="text-error m-0">Script yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className={sectionCls}>
        <h4 className="m-0 mb-4 text-lg font-semibold">Script Oluştur</h4>
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
      <div className={sectionCls}>
        <h4 className="m-0 mb-4 text-lg font-semibold">Script Düzenle</h4>
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
    <div className={sectionCls}>
      <div className="flex justify-between items-center mb-3">
        <h4 className="m-0 text-lg font-semibold">Script</h4>
        {script ? (
          <button
            onClick={() => setMode("edit")}
            className="text-base px-3 py-1 bg-transparent text-brand-500 border border-brand-500 rounded-sm cursor-pointer hover:bg-brand-50 transition-colors duration-fast"
          >
            Düzenle
          </button>
        ) : (
          <button
            onClick={() => setMode("create")}
            className="text-base px-3 py-1 bg-brand-500 text-neutral-0 border-none rounded-sm cursor-pointer hover:bg-brand-600 transition-colors duration-fast"
          >
            + Script Ekle
          </button>
        )}
      </div>

      {!script ? (
        <p className="text-neutral-500 text-md m-0">
          Henüz script yok.
        </p>
      ) : (
        <div>
          <table className="text-base border-collapse mb-3">
            <tbody>
              <tr>
                <td className="text-neutral-600 pr-4 pb-1">Versiyon</td>
                <td className="pb-1">{script.version ?? DASH}</td>
              </tr>
              <tr>
                <td className="text-neutral-600 pr-4 pb-1">Kaynak</td>
                <td className="pb-1">{script.source_type ?? DASH}</td>
              </tr>
              <tr>
                <td className="text-neutral-600 pr-4 pb-1">Durum</td>
                <td className="pb-1">{script.generation_status ?? DASH}</td>
              </tr>
              {!isBlank(script.notes) && (
                <tr>
                  <td className="text-neutral-600 pr-4 pb-1">Notlar</td>
                  <td className="pb-1">{script.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="bg-neutral-50 border border-border-subtle rounded-sm p-3 text-base whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {isBlank(script.content)
              ? DASH
              : showFull || (script.content ?? "").length <= PREVIEW_LIMIT
              ? script.content
              : (script.content ?? "").slice(0, PREVIEW_LIMIT) + "..."}
          </div>
          {(script.content ?? "").length > PREVIEW_LIMIT && (
            <button
              onClick={() => setShowFull((v) => !v)}
              className="mt-2 text-base bg-transparent border-none text-brand-500 cursor-pointer p-0 hover:underline"
            >
              {showFull ? "Daha az göster" : "Tamamını göster"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
