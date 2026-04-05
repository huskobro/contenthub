import { useState } from "react";
import { useTemplateStyleLinkDetail } from "../../hooks/useTemplateStyleLinkDetail";
import { useUpdateTemplateStyleLink } from "../../hooks/useUpdateTemplateStyleLink";
import { TemplateStyleLinkForm } from "./TemplateStyleLinkForm";
import { formatDateTime } from "../../lib/formatDate";
import type { TemplateStyleLinkFormValues } from "./TemplateStyleLinkForm";
import { colors, radius, typography } from "../design-system/tokens";

const RADIUS_SM = "6px";
const COLOR_DARK = colors.neutral[900];
const BORDER = `1px solid ${colors.border.subtle}`;

interface TemplateStyleLinkDetailPanelProps {
  linkId: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={{ fontSize: typography.size.sm, fontWeight: 600, color: colors.neutral[600] }}>{label}: </span>
      <span style={{ fontSize: typography.size.md, color: value !== null && value !== undefined ? COLOR_DARK : colors.neutral[500], wordBreak: "break-word", overflowWrap: "anywhere" }}>
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
        padding: "2rem", color: colors.neutral[500], fontSize: typography.size.md,
        textAlign: "center", border: `1px dashed ${colors.border.subtle}`, borderRadius: RADIUS_SM,
      }}>
        Bir link seçin.
      </div>
    );
  }

  if (isLoading) return <p style={{ color: colors.neutral[600], padding: "1rem" }}>Yükleniyor...</p>;

  if (isError) {
    return (
      <p style={{ color: colors.error.base, padding: "1rem" }}>
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
      <div style={{ padding: "1.25rem", border: BORDER, borderRadius: RADIUS_SM, background: colors.neutral[0] }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: typography.size.lg, color: COLOR_DARK }}>Link Düzenle</h3>
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
    <div style={{ padding: "1.25rem", border: BORDER, borderRadius: RADIUS_SM, background: colors.neutral[0] }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: typography.size.lg, color: COLOR_DARK }} data-testid="tsl-detail-heading">Sablon-Stil Baglanti Detayı</h3>
        <button
          onClick={() => setEditing(true)}
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: typography.size.base,
            background: colors.neutral[100],
            color: colors.neutral[700],
            border: BORDER,
            borderRadius: radius.sm,
            cursor: "pointer",
          }}
        >
          Düzenle
        </button>
      </div>
      <p
        style={{
          margin: "0 0 1rem",
          fontSize: typography.size.base,
          color: colors.neutral[500],
          lineHeight: 1.5,
        }}
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

      <div style={{ marginTop: "0.75rem", borderTop: `1px solid ${colors.neutral[100]}`, paddingTop: "0.75rem" }}>
        <Field label="Created" value={formatDateTime(link.created_at)} />
        <Field label="Updated" value={formatDateTime(link.updated_at)} />
      </div>
    </div>
  );
}
