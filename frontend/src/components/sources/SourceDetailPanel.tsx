import { useState } from "react";
import { useSourceDetail } from "../../hooks/useSourceDetail";
import { useUpdateSource } from "../../hooks/useUpdateSource";
import { useReadOnly } from "../visibility/ReadOnlyGuard";
import { SourceForm } from "./SourceForm";
import { formatDateTime } from "../../lib/formatDate";
import { isBlank } from "../../lib/isBlank";
import type { SourceCreatePayload } from "../../api/sourcesApi";
import { colors, radius, typography } from "../design-system/tokens";

const FONT_SM = "0.875rem";
const COLOR_DARK = colors.neutral[900];
const COLOR_FAINT = colors.neutral[500];
const LABEL_SPAN: React.CSSProperties = { fontSize: typography.size.sm, fontWeight: 600, color: colors.neutral[600] };
const PANEL_BOX: React.CSSProperties = { padding: "1.25rem", border: `1px solid ${colors.border.subtle}`, borderRadius: radius.md, background: colors.neutral[0] };
const SECTION_DIVIDER: React.CSSProperties = { marginTop: "0.75rem", borderTop: `1px solid ${colors.neutral[100]}`, paddingTop: "0.75rem" };

interface SourceDetailPanelProps {
  sourceId: string | null;
}

function Field({ label, value }: { label: string; value: string | null }) {
  const blank = isBlank(value);
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={LABEL_SPAN}>{label}: </span>
      <span style={{ fontSize: FONT_SM, color: blank ? COLOR_FAINT : COLOR_DARK, wordBreak: "break-word", overflowWrap: "anywhere" }}>
        {blank ? "—" : value}
      </span>
    </div>
  );
}

function UrlField({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={LABEL_SPAN}>{label}: </span>
      {!isBlank(value) ? (
        <span style={{
          fontSize: typography.size.base, color: colors.brand[700],
          wordBreak: "break-all", overflowWrap: "anywhere", fontFamily: "monospace",
        }}>
          {value}
        </span>
      ) : (
        <span style={{ fontSize: FONT_SM, color: COLOR_FAINT }}>—</span>
      )}
    </div>
  );
}

export function SourceDetailPanel({ sourceId }: SourceDetailPanelProps) {
  const readOnly = useReadOnly();
  const [editMode, setEditMode] = useState(false);
  const { data: source, isLoading, isError, error } = useSourceDetail(sourceId);
  const { mutate: updateMutate, isPending: isUpdating, error: updateError } = useUpdateSource(sourceId ?? "");

  // Reset edit mode when selected source changes
  const [prevSourceId, setPrevSourceId] = useState(sourceId);
  if (sourceId !== prevSourceId) {
    setPrevSourceId(sourceId);
    setEditMode(false);
  }

  if (!sourceId) {
    return (
      <div style={{
        padding: "2rem", color: COLOR_FAINT, fontSize: FONT_SM,
        textAlign: "center", border: `1px dashed ${colors.border.subtle}`, borderRadius: radius.md,
      }}>
        Bir source seçin.
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

  if (!source) return null;

  if (editMode) {
    return (
      <div style={PANEL_BOX}>
        <h3 style={{ margin: "0 0 1rem", fontSize: typography.size.lg, color: COLOR_DARK }}>Düzenle: {source.name}</h3>
        <SourceForm
          initial={source}
          onSubmit={(payload: SourceCreatePayload) => {
            updateMutate(payload, {
              onSuccess: () => setEditMode(false),
            });
          }}
          onCancel={() => setEditMode(false)}
          isPending={isUpdating}
          submitError={updateError instanceof Error ? updateError.message : null}
          submitLabel="Güncelle"
        />
      </div>
    );
  }

  return (
    <div style={PANEL_BOX}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: typography.size.lg, color: COLOR_DARK }}>{source.name}</h3>
        <button
          onClick={() => setEditMode(true)}
          disabled={readOnly}
          style={{
            padding: "0.25rem 0.75rem",
            background: "transparent",
            color: colors.brand[700],
            border: `1px solid ${colors.info.light}`,
            borderRadius: radius.sm,
            cursor: readOnly ? "not-allowed" : "pointer",
            fontSize: typography.size.base,
            opacity: readOnly ? 0.5 : 1,
          }}
        >
          Düzenle
        </button>
      </div>

      <Field label="Source Type" value={source.source_type} />
      <Field label="Status" value={source.status} />
      <Field label="Trust Level" value={source.trust_level} />
      <Field label="Scan Mode" value={source.scan_mode} />
      <Field label="Language" value={source.language} />
      <Field label="Category" value={source.category} />

      <div style={{ marginTop: "1rem", borderTop: `1px solid ${colors.neutral[100]}`, paddingTop: "1rem" }}>
        <UrlField label="Base URL" value={source.base_url} />
        <UrlField label="Feed URL" value={source.feed_url} />
        <UrlField label="API Endpoint" value={source.api_endpoint} />
      </div>

      {!isBlank(source.notes) && (
        <div style={SECTION_DIVIDER}>
          <Field label="Notes" value={source.notes} />
        </div>
      )}

      <div style={SECTION_DIVIDER}>
        <Field label="Created" value={formatDateTime(source.created_at)} />
        <Field label="Updated" value={formatDateTime(source.updated_at)} />
      </div>
    </div>
  );
}
