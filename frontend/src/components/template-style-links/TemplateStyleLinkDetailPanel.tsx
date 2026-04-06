import { useState } from "react";
import { useTemplateStyleLinkDetail } from "../../hooks/useTemplateStyleLinkDetail";
import { useUpdateTemplateStyleLink } from "../../hooks/useUpdateTemplateStyleLink";
import { TemplateStyleLinkForm } from "./TemplateStyleLinkForm";
import { formatDateTime } from "../../lib/formatDate";
import type { TemplateStyleLinkFormValues } from "./TemplateStyleLinkForm";
import { cn } from "../../lib/cn";

interface TemplateStyleLinkDetailPanelProps {
  linkId: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="mb-2">
      <span className="text-sm font-semibold text-neutral-600">{label}: </span>
      <span className={cn("text-md break-words [overflow-wrap:anywhere]", value !== null && value !== undefined ? "text-neutral-900" : "text-neutral-500")}>
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
      <div className="p-8 text-neutral-500 text-md text-center border border-dashed border-border-subtle rounded-md">
        Bir link seçin.
      </div>
    );
  }

  if (isLoading) return <p className="text-neutral-600 p-4">Yükleniyor...</p>;

  if (isError) {
    return (
      <p className="text-error p-4">
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
      <div>
        <h3 className="m-0 mb-4 text-lg text-neutral-900">Link Düzenle</h3>
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0 text-lg text-neutral-900" data-testid="tsl-detail-heading">Sablon-Stil Baglanti Detayı</h3>
        <button
          onClick={() => setEditing(true)}
          className="px-3 py-1 text-base bg-neutral-100 text-neutral-700 border border-border-subtle rounded-sm cursor-pointer"
        >
          Düzenle
        </button>
      </div>
      <p
        className="m-0 mb-4 text-base text-neutral-500 leading-normal"
        data-testid="tsl-detail-workflow-note"
      >
        Bu baglanti sablonun hangi style blueprint kurallariyla calisacagini
        belirler. Rol ve durum bilgisi asagida gorulur.
      </p>

      <Field label="ID" value={link.id} />
      <Field label="Template ID" value={link.template_id} />
      <Field label="Blueprint ID" value={link.style_blueprint_id} />
      <Field label="Link Role" value={link.link_role} />
      <Field label="Status" value={link.status} />
      <Field label="Notes" value={link.notes} />

      <div className="mt-3 border-t border-border-subtle pt-3">
        <Field label="Created" value={formatDateTime(link.created_at)} />
        <Field label="Updated" value={formatDateTime(link.updated_at)} />
      </div>
    </div>
  );
}
