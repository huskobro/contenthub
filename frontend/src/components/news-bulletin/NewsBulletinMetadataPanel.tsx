import { useState } from "react";
import { useNewsBulletinMetadata } from "../../hooks/useNewsBulletinMetadata";
import { useCreateNewsBulletinMetadata } from "../../hooks/useCreateNewsBulletinMetadata";
import { useUpdateNewsBulletinMetadata } from "../../hooks/useUpdateNewsBulletinMetadata";
import { NewsBulletinMetadataForm } from "./NewsBulletinMetadataForm";
import { isBlank } from "../../lib/isBlank";
import type { MetadataFormValues } from "./NewsBulletinMetadataForm";

const DASH = "—";

interface Props {
  bulletinId: string;
}

export function NewsBulletinMetadataPanel({ bulletinId }: Props) {
  const { data: metadata, isLoading, isError } = useNewsBulletinMetadata(bulletinId);
  const createMutation = useCreateNewsBulletinMetadata(bulletinId);
  const updateMutation = useUpdateNewsBulletinMetadata(bulletinId);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");


  function handleCreate(values: MetadataFormValues) {
    createMutation.mutate(
      {
        title: values.title || undefined,
        description: values.description || undefined,
        tags_json: values.tags_json || undefined,
        category: values.category || undefined,
        language: values.language || undefined,
        source_type: values.source_type || undefined,
        generation_status: values.generation_status || undefined,
        notes: values.notes || undefined,
      },
      { onSuccess: () => setMode("view") }
    );
  }

  function handleUpdate(values: MetadataFormValues) {
    updateMutation.mutate(
      {
        title: values.title || null,
        description: values.description || null,
        tags_json: values.tags_json || null,
        category: values.category || null,
        language: values.language || null,
        source_type: values.source_type || null,
        generation_status: values.generation_status || undefined,
        notes: values.notes || null,
      },
      { onSuccess: () => setMode("view") }
    );
  }

  if (isLoading) {
    return (
      <div className="border border-border-subtle rounded-md p-4 mt-4">
        <p className="text-neutral-600 m-0">Metadata yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-border-subtle rounded-md p-4 mt-4">
        <p className="text-error m-0">Metadata yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="border border-border-subtle rounded-md p-4 mt-4">
        <h4 className="m-0 mb-4">Metadata Oluştur</h4>
        <NewsBulletinMetadataForm
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
        <h4 className="m-0 mb-4">Metadata Düzenle</h4>
        <NewsBulletinMetadataForm
          mode="edit"
          initial={{
            title: metadata?.title ?? "",
            description: metadata?.description ?? "",
            tags_json: metadata?.tags_json ?? "",
            category: metadata?.category ?? "",
            language: metadata?.language ?? "",
            source_type: metadata?.source_type ?? "manual",
            generation_status: metadata?.generation_status ?? "draft",
            notes: metadata?.notes ?? "",
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
        <h4 className="m-0" data-testid="nb-metadata-heading">Metadata</h4>
        {metadata ? (
          <button onClick={() => setMode("edit")}>Düzenle</button>
        ) : (
          <button onClick={() => setMode("create")}>+ Metadata Ekle</button>
        )}
      </div>
      <p
        className="m-0 mb-3 text-base text-neutral-500 leading-normal"
        data-testid="nb-metadata-note"
      >
        Bulten baslik, aciklama, etiket ve kategori bilgileri. Metadata,
        script ile birlikte bulten ciktisinin temelini olusturur.
      </p>

      {!metadata ? (
        <p className="text-neutral-500 m-0">Henüz metadata yok.</p>
      ) : (
        <table className="text-base border-collapse">
          <tbody>
            <tr>
              <td className="text-neutral-600 pr-4 pb-1">Başlık</td>
              <td className="break-words [overflow-wrap:anywhere]">{metadata.title ?? DASH}</td>
            </tr>
            <tr>
              <td className="text-neutral-600 pr-4 pb-1">Açıklama</td>
              <td className="break-words [overflow-wrap:anywhere]">{metadata.description ?? DASH}</td>
            </tr>
            <tr>
              <td className="text-neutral-600 pr-4 pb-1">Etiketler</td>
              <td className="break-all [overflow-wrap:anywhere]">{metadata.tags_json ?? DASH}</td>
            </tr>
            <tr>
              <td className="text-neutral-600 pr-4 pb-1">Kategori</td>
              <td>{metadata.category ?? DASH}</td>
            </tr>
            <tr>
              <td className="text-neutral-600 pr-4 pb-1">Dil</td>
              <td>{metadata.language ?? DASH}</td>
            </tr>
            <tr>
              <td className="text-neutral-600 pr-4 pb-1">Versiyon</td>
              <td>{metadata.version ?? DASH}</td>
            </tr>
            <tr>
              <td className="text-neutral-600 pr-4 pb-1">Kaynak</td>
              <td>{metadata.source_type ?? DASH}</td>
            </tr>
            <tr>
              <td className="text-neutral-600 pr-4 pb-1">Durum</td>
              <td>{metadata.generation_status ?? DASH}</td>
            </tr>
            {!isBlank(metadata.notes) && (
              <tr>
                <td className="text-neutral-600 pr-4 pb-1">Notlar</td>
                <td className="break-words [overflow-wrap:anywhere]">{metadata.notes}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
