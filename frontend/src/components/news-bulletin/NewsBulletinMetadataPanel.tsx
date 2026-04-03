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

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "1rem",
    marginTop: "1rem",
  };

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
        <h4 style={{ margin: "0 0 1rem" }}>Metadata Oluştur</h4>
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
      <div style={sectionStyle}>
        <h4 style={{ margin: "0 0 1rem" }}>Metadata Düzenle</h4>
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
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h4 style={{ margin: 0 }}>Metadata</h4>
        {metadata ? (
          <button onClick={() => setMode("edit")}>Düzenle</button>
        ) : (
          <button onClick={() => setMode("create")}>+ Metadata Ekle</button>
        )}
      </div>

      {!metadata ? (
        <p style={{ color: "#94a3b8", margin: 0 }}>Henüz metadata yok.</p>
      ) : (
        <table style={{ fontSize: "0.8125rem", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Başlık</td>
              <td style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.title ?? DASH}</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Açıklama</td>
              <td style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.description ?? DASH}</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Etiketler</td>
              <td style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>{metadata.tags_json ?? DASH}</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Kategori</td>
              <td>{metadata.category ?? DASH}</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Dil</td>
              <td>{metadata.language ?? DASH}</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Versiyon</td>
              <td>{metadata.version ?? DASH}</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Kaynak</td>
              <td>{metadata.source_type ?? DASH}</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Durum</td>
              <td>{metadata.generation_status ?? DASH}</td>
            </tr>
            {!isBlank(metadata.notes) && (
              <tr>
                <td style={{ color: "#64748b", paddingRight: "1rem", paddingBottom: "0.25rem" }}>Notlar</td>
                <td style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{metadata.notes}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
