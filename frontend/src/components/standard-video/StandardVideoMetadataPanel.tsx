import { useState } from "react";
import type { StandardVideoMetadataResponse } from "../../api/standardVideoApi";
import { StandardVideoMetadataForm } from "./StandardVideoMetadataForm";
import type { MetadataFormValues } from "./StandardVideoMetadataForm";
import { isBlank } from "../../lib/isBlank";

const DASH = "—";

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

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // fall through to comma split
    }
  }
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

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

  const sectionCls = "border border-border-subtle rounded-md p-4 mb-5";

  if (isLoading) {
    return (
      <div className={sectionCls}>
        <p className="text-neutral-600 m-0">Metadata yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={sectionCls}>
        <p className="text-error m-0">Metadata yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className={sectionCls}>
        <h4 className="m-0 mb-4 text-lg font-semibold">Metadata Oluştur</h4>
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
      <div className={sectionCls}>
        <h4 className="m-0 mb-4 text-lg font-semibold">Metadata Düzenle</h4>
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
    <div className={sectionCls}>
      <div className="flex justify-between items-center mb-3">
        <h4 className="m-0 text-lg font-semibold">Metadata</h4>
        {metadata ? (
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
            + Metadata Ekle
          </button>
        )}
      </div>

      {!metadata ? (
        <p className="text-neutral-500 text-md m-0">
          Henüz metadata yok.
        </p>
      ) : (
        <table className="text-base border-collapse w-full">
          <tbody>
            <tr>
              <td className="text-neutral-600 pr-4 pb-1.5 whitespace-nowrap align-top">Başlık</td>
              <td className="pb-1.5 font-medium break-words [overflow-wrap:anywhere]">{metadata.title ?? DASH}</td>
            </tr>
            {metadata.description && (
              <tr>
                <td className="text-neutral-600 pr-4 pb-1.5 whitespace-nowrap align-top">Açıklama</td>
                <td className="pb-1.5 break-words [overflow-wrap:anywhere]">{metadata.description}</td>
              </tr>
            )}
            {tags.length > 0 && (
              <tr>
                <td className="text-neutral-600 pr-4 pb-1.5 whitespace-nowrap align-top">Etiketler</td>
                <td className="pb-1.5">
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="bg-border-subtle rounded-sm px-1.5 py-0.5 text-sm"
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
                <td className="text-neutral-600 pr-4 pb-1.5 whitespace-nowrap">Kategori</td>
                <td className="pb-1.5">{metadata.category}</td>
              </tr>
            )}
            {metadata.language && (
              <tr>
                <td className="text-neutral-600 pr-4 pb-1.5 whitespace-nowrap">Dil</td>
                <td className="pb-1.5">{metadata.language}</td>
              </tr>
            )}
            <tr>
              <td className="text-neutral-600 pr-4 pb-1.5 whitespace-nowrap">Versiyon</td>
              <td className="pb-1.5">{metadata.version ?? DASH}</td>
            </tr>
            <tr>
              <td className="text-neutral-600 pr-4 pb-1.5 whitespace-nowrap">Kaynak</td>
              <td className="pb-1.5">{metadata.source_type ?? DASH}</td>
            </tr>
            <tr>
              <td className="text-neutral-600 pr-4 pb-1.5 whitespace-nowrap">Durum</td>
              <td className="pb-1.5">{metadata.generation_status ?? DASH}</td>
            </tr>
            {!isBlank(metadata.notes) && (
              <tr>
                <td className="text-neutral-600 pr-4 pb-1.5 whitespace-nowrap align-top">Notlar</td>
                <td className="pb-1.5 break-words [overflow-wrap:anywhere]">{metadata.notes}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
