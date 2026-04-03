import { useState } from "react";
import { useTemplateStyleLinkDetail } from "../../hooks/useTemplateStyleLinkDetail";
import { useUpdateTemplateStyleLink } from "../../hooks/useUpdateTemplateStyleLink";
import { TemplateStyleLinkForm } from "./TemplateStyleLinkForm";
import { formatDateTime } from "../../lib/formatDate";
import type { TemplateStyleLinkFormValues } from "./TemplateStyleLinkForm";

interface TemplateStyleLinkDetailPanelProps {
  linkId: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>{label}: </span>
      <span style={{ fontSize: "0.875rem", color: value !== null && value !== undefined ? "#1e293b" : "#94a3b8", wordBreak: "break-word", overflowWrap: "anywhere" }}>
        {value !== null && value !== undefined ? String(value) : "—"}
      </span>
    </div>
  );
}

export function TemplateStyleLinkDetailPanel({ linkId }: TemplateStyleLinkDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const { data: link, isLoading, isError, error } = useTemplateStyleLinkDetail(linkId);
  const { mutate, isPending, error: updateError } = useUpdateTemplateStyleLink(linkId ?? "");

  if (!linkId) {
    return (
      <div style={{
        padding: "2rem", color: "#94a3b8", fontSize: "0.875rem",
        textAlign: "center", border: "1px dashed #e2e8f0", borderRadius: "6px",
      }}>
        Bir link seçin.
      </div>
    );
  }

  if (isLoading) return <p style={{ color: "#64748b", padding: "1rem" }}>Yükleniyor...</p>;

  if (isError) {
    return (
      <p style={{ color: "#dc2626", padding: "1rem" }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }

  if (!link) return null;

  if (editing) {
    function handleSubmit(values: TemplateStyleLinkFormValues) {
      mutate(
        {
          link_role: values.link_role.trim() || null,
          status: values.status,
          notes: values.notes.trim() || null,
        },
        { onSuccess: () => setEditing(false) }
      );
    }

    return (
      <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", color: "#1e293b" }}>Link Düzenle</h3>
        <TemplateStyleLinkForm
          mode="edit"
          initial={link}
          isSubmitting={isPending}
          submitError={updateError instanceof Error ? updateError.message : null}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(false)}
          submitLabel="Kaydet"
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", color: "#1e293b" }}>Template Style Link Detayı</h3>
        <button
          onClick={() => setEditing(true)}
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: "0.8rem",
            background: "#f1f5f9",
            color: "#475569",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Düzenle
        </button>
      </div>

      <Field label="ID" value={link.id} />
      <Field label="Template ID" value={link.template_id} />
      <Field label="Blueprint ID" value={link.style_blueprint_id} />
      <Field label="Link Role" value={link.link_role} />
      <Field label="Status" value={link.status} />
      <Field label="Notes" value={link.notes} />

      <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
        <Field label="Created" value={formatDateTime(link.created_at)} />
        <Field label="Updated" value={formatDateTime(link.updated_at)} />
      </div>
    </div>
  );
}
