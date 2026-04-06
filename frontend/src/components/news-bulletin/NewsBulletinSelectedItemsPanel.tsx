import { useState } from "react";
import { formatDateShort } from "../../lib/formatDate";
import { useNewsBulletinSelectedItems } from "../../hooks/useNewsBulletinSelectedItems";
import { useCreateNewsBulletinSelectedItem } from "../../hooks/useCreateNewsBulletinSelectedItem";
import { useUpdateNewsBulletinSelectedItem } from "../../hooks/useUpdateNewsBulletinSelectedItem";
import { NewsBulletinSelectedItemForm } from "./NewsBulletinSelectedItemForm";
import { NewsBulletinSelectedNewsPicker } from "./NewsBulletinSelectedNewsPicker";
import { UsedNewsWarningBadge } from "./UsedNewsWarningBadge";
import { UsedNewsWarningDetails } from "./UsedNewsWarningDetails";
import type { SelectedItemFormValues } from "./NewsBulletinSelectedItemForm";
import type { NewsItemResponse } from "../../api/newsItemsApi";

interface Props {
  bulletinId: string;
}

export function NewsBulletinSelectedItemsPanel({ bulletinId }: Props) {
  const { data: items, isLoading, isError } = useNewsBulletinSelectedItems(bulletinId);
  const createMutation = useCreateNewsBulletinSelectedItem(bulletinId);
  const updateMutation = useUpdateNewsBulletinSelectedItem(bulletinId);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  function handleCreate(values: SelectedItemFormValues) {
    createMutation.mutate(
      {
        news_item_id: values.news_item_id.trim(),
        sort_order: (() => { const n = Number(values.sort_order); return isNaN(n) || !isFinite(n) ? 0 : n; })(),
        selection_reason: values.selection_reason.trim() || undefined,
      },
      { onSuccess: () => setMode("view") }
    );
  }

  function handlePickerSelect(item: NewsItemResponse) {
    setPickerError(null);
    createMutation.mutate(
      { news_item_id: item.id, sort_order: (items?.length ?? 0) + 1 },
      {
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          setPickerError(msg.includes("409") ? "Bu haber zaten eklenmiş (duplicate)." : msg);
        },
      }
    );
  }

  function handleUpdate(values: SelectedItemFormValues) {
    if (!editingId) return;
    updateMutation.mutate(
      {
        selectionId: editingId,
        payload: {
          sort_order: (() => { const n = Number(values.sort_order); return isNaN(n) || !isFinite(n) ? 0 : n; })(),
          selection_reason: values.selection_reason.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setMode("view");
          setEditingId(null);
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="border border-border-subtle rounded-md p-4 mt-4">
        <p className="text-neutral-600 m-0">Selected news yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-border-subtle rounded-md p-4 mt-4">
        <p className="text-error m-0">Selected news yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="border border-border-subtle rounded-md p-4 mt-4">
        <h4 className="m-0 mb-4">Selected Item Ekle</h4>
        <NewsBulletinSelectedItemForm
          mode="create"
          isSubmitting={createMutation.isPending}
          submitError={createMutation.isError ? "Ekleme başarısız." : null}
          onSubmit={handleCreate}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  if (mode === "edit" && editingId) {
    const item = items?.find((i) => i.id === editingId);
    return (
      <div className="border border-border-subtle rounded-md p-4 mt-4">
        <h4 className="m-0 mb-4">Selected Item Düzenle</h4>
        <NewsBulletinSelectedItemForm
          mode="edit"
          initial={{
            news_item_id: item?.news_item_id ?? "",
            sort_order: String(item?.sort_order ?? 0),
            selection_reason: item?.selection_reason ?? "",
          }}
          isSubmitting={updateMutation.isPending}
          submitError={updateMutation.isError ? "Güncelleme başarısız." : null}
          onSubmit={handleUpdate}
          onCancel={() => { setMode("view"); setEditingId(null); }}
        />
      </div>
    );
  }

  // view mode
  return (
    <div className="border border-border-subtle rounded-md p-4 mt-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="m-0" data-testid="nb-selected-news-heading">Secili Haberler</h4>
        <button onClick={() => setMode("create")}>+ Manuel Ekle</button>
      </div>
      <p
        className="m-0 mb-3 text-base text-neutral-500 leading-normal"
        data-testid="nb-selected-news-note"
      >
        Kaynaklardan gelen haberlerden bulteninize dahil edilecek olanlari secin.
        Secili haberler bulten taslagi, script ve icerik uretiminin temelini olusturur.
      </p>

      <NewsBulletinSelectedNewsPicker
        onSelect={handlePickerSelect}
        isAdding={createMutation.isPending}
        addError={pickerError}
      />

      {!items || items.length === 0 ? (
        <p className="text-neutral-500 m-0">Henüz seçilmiş haber yok.</p>
      ) : (
        <table className="w-full text-base border-collapse">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left px-2 py-1 text-neutral-600 font-medium">News Item ID</th>
              <th className="text-left px-2 py-1 text-neutral-600 font-medium">Sıra</th>
              <th className="text-left px-2 py-1 text-neutral-600 font-medium">Gerekçe</th>
              <th className="text-left px-2 py-1 text-neutral-600 font-medium">Uyarı</th>
              <th className="text-left px-2 py-1 text-neutral-600 font-medium">Eklendi</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100">
                <td className="px-2 py-1 font-mono text-sm">
                  {item.news_item_id}
                </td>
                <td className="px-2 py-1">{item.sort_order}</td>
                <td className="px-2 py-1 break-words [overflow-wrap:anywhere]">{item.selection_reason ?? "—"}</td>
                <td className="px-2 py-1">
                  <UsedNewsWarningBadge warning={item.used_news_warning ?? false} />
                  {item.used_news_warning && (
                    <UsedNewsWarningDetails
                      usedNewsCount={item.used_news_count ?? 0}
                      lastUsageType={item.last_usage_type}
                      lastTargetModule={item.last_target_module}
                    />
                  )}
                </td>
                <td className="px-2 py-1 text-neutral-500">
                  {formatDateShort(item.created_at)}
                </td>
                <td className="px-2 py-1">
                  <button
                    onClick={() => { setEditingId(item.id); setMode("edit"); }}
                    className="text-sm"
                  >
                    Düzenle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
