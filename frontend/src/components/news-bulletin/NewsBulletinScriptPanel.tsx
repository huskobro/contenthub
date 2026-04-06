import { useState } from "react";
import { useNewsBulletinScript } from "../../hooks/useNewsBulletinScript";
import { useCreateNewsBulletinScript } from "../../hooks/useCreateNewsBulletinScript";
import { useUpdateNewsBulletinScript } from "../../hooks/useUpdateNewsBulletinScript";
import { NewsBulletinScriptForm } from "./NewsBulletinScriptForm";
import { isBlank } from "../../lib/isBlank";
import type { ScriptFormValues } from "./NewsBulletinScriptForm";

const DASH = "—";

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
      <div className="border border-border-subtle rounded-md p-4 mt-4">
        <p className="text-neutral-600 m-0">Script yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-border-subtle rounded-md p-4 mt-4">
        <p className="text-error m-0">Script yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="border border-border-subtle rounded-md p-4 mt-4">
        <h4 className="m-0 mb-4">Script Oluştur</h4>
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
      <div className="border border-border-subtle rounded-md p-4 mt-4">
        <h4 className="m-0 mb-4">Script Düzenle</h4>
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
    <div className="border border-border-subtle rounded-md p-4 mt-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="m-0" data-testid="nb-script-heading">Script</h4>
        {script ? (
          <button onClick={() => setMode("edit")}>Düzenle</button>
        ) : (
          <button onClick={() => setMode("create")}>+ Script Ekle</button>
        )}
      </div>
      <p
        className="m-0 mb-3 text-base text-neutral-500 leading-normal"
        data-testid="nb-script-note"
      >
        Secili haberlerden uretilen bulten taslagi. Script, haber seciminden sonraki
        uretim adimidir.
      </p>

      {!script ? (
        <p className="text-neutral-500 m-0">Henüz script yok.</p>
      ) : (
        <div>
          <table className="text-base border-collapse mb-3">
            <tbody>
              <tr>
                <td className="text-neutral-600 pr-4 pb-1">Versiyon</td>
                <td>{script.version ?? DASH}</td>
              </tr>
              <tr>
                <td className="text-neutral-600 pr-4 pb-1">Kaynak</td>
                <td>{script.source_type ?? DASH}</td>
              </tr>
              <tr>
                <td className="text-neutral-600 pr-4 pb-1">Durum</td>
                <td>{script.generation_status ?? DASH}</td>
              </tr>
              {!isBlank(script.notes) && (
                <tr>
                  <td className="text-neutral-600 pr-4 pb-1">Notlar</td>
                  <td>{script.notes}</td>
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
            <button onClick={() => setShowFull((v) => !v)} className="mt-2 bg-transparent border-none text-brand-500 cursor-pointer p-0">
              {showFull ? "Daha az göster" : "Tamamını göster"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
