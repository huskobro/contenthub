import { useState } from "react";
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

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "1rem",
    marginTop: "1rem",
  };

  function handleCreate(values: SelectedItemFormValues) {
    createMutation.mutate(
      {
        news_item_id: values.news_item_id.trim(),
        sort_order: Number(values.sort_order),
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
          sort_order: Number(values.sort_order),
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
      <div style={sectionStyle}>
        <p style={{ color: "#64748b", margin: 0 }}>Selected news yükleniyor...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={sectionStyle}>
        <p style={{ color: "#dc2626", margin: 0 }}>Selected news yüklenirken hata oluştu.</p>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div style={sectionStyle}>
        <h4 style={{ margin: "0 0 1rem" }}>Selected Item Ekle</h4>
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
      <div style={sectionStyle}>
        <h4 style={{ margin: "0 0 1rem" }}>Selected Item Düzenle</h4>
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
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h4 style={{ margin: 0 }}>Selected News</h4>
        <button onClick={() => setMode("create")}>+ Manuel Ekle</button>
      </div>

      <NewsBulletinSelectedNewsPicker
        onSelect={handlePickerSelect}
        isAdding={createMutation.isPending}
        addError={pickerError}
      />

      {!items || items.length === 0 ? (
        <p style={{ color: "#94a3b8", margin: 0 }}>Henüz seçilmiş haber yok.</p>
      ) : (
        <table style={{ width: "100%", fontSize: "0.8125rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ textAlign: "left", padding: "0.25rem 0.5rem", color: "#64748b", fontWeight: 500 }}>News Item ID</th>
              <th style={{ textAlign: "left", padding: "0.25rem 0.5rem", color: "#64748b", fontWeight: 500 }}>Sıra</th>
              <th style={{ textAlign: "left", padding: "0.25rem 0.5rem", color: "#64748b", fontWeight: 500 }}>Gerekçe</th>
              <th style={{ textAlign: "left", padding: "0.25rem 0.5rem", color: "#64748b", fontWeight: 500 }}>Uyarı</th>
              <th style={{ textAlign: "left", padding: "0.25rem 0.5rem", color: "#64748b", fontWeight: 500 }}>Eklendi</th>
              <th style={{ padding: "0.25rem 0.5rem" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "0.25rem 0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                  {item.news_item_id}
                </td>
                <td style={{ padding: "0.25rem 0.5rem" }}>{item.sort_order}</td>
                <td style={{ padding: "0.25rem 0.5rem" }}>{item.selection_reason ?? "—"}</td>
                <td style={{ padding: "0.25rem 0.5rem" }}>
                  <UsedNewsWarningBadge warning={item.used_news_warning ?? false} />
                  {item.used_news_warning && (
                    <UsedNewsWarningDetails
                      usedNewsCount={item.used_news_count ?? 0}
                      lastUsageType={item.last_usage_type}
                      lastTargetModule={item.last_target_module}
                    />
                  )}
                </td>
                <td style={{ padding: "0.25rem 0.5rem", color: "#94a3b8" }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "0.25rem 0.5rem" }}>
                  <button
                    onClick={() => { setEditingId(item.id); setMode("edit"); }}
                    style={{ fontSize: "0.75rem" }}
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
