/**
 * ContentQuickLookContent — Wave 1
 *
 * QuickLook preview for a content library item.
 * Shows title, type, status, content flags, and quick actions.
 */

import React from "react";
import type { ContentLibraryItem } from "../../api/contentLibraryApi";
import { colors, typography, spacing, radius } from "../design-system/tokens";
import { StatusBadge, DetailGrid } from "../design-system/primitives";

interface ContentQuickLookContentProps {
  item: ContentLibraryItem;
  onNavigate?: () => void;
  onClone?: () => void;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function ContentQuickLookContent({ item, onNavigate, onClone }: ContentQuickLookContentProps) {
  const typeLabel = item.content_type === "standard_video" ? "Standart Video" : "Haber Bulteni";

  return (
    <div data-testid="quicklook-content-item">
      {/* Header */}
      <div style={{ marginBottom: spacing[4] }}>
        <h4 style={{ margin: 0, fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.neutral[900] }}>
          {item.title || item.topic}
        </h4>
        <div style={{ display: "flex", gap: spacing[2], alignItems: "center", marginTop: spacing[2] }}>
          <StatusBadge status={item.status} size="md" />
          <span style={{ fontSize: typography.size.sm, color: colors.neutral[600] }}>{typeLabel}</span>
        </div>
      </div>

      {/* Details */}
      <DetailGrid
        items={[
          { label: "Tur", value: typeLabel },
          { label: "Durum", value: <StatusBadge status={item.status} /> },
          { label: "Script", value: item.has_script ? "Var" : "Yok" },
          { label: "Metadata", value: item.has_metadata ? "Var" : "Yok" },
          { label: "Olusturulma", value: formatDate(item.created_at) },
        ]}
        testId="quicklook-content-details"
      />

      {/* Actions */}
      <div style={{ marginTop: spacing[4], paddingTop: spacing[3], borderTop: `1px solid ${colors.border.subtle}`, display: "flex", gap: spacing[2] }}>
        {onNavigate && (
          <button
            onClick={onNavigate}
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              fontSize: typography.size.base,
              fontWeight: typography.weight.medium,
              color: colors.brand[600],
              background: colors.brand[50],
              border: `1px solid ${colors.brand[200]}`,
              borderRadius: radius.md,
              cursor: "pointer",
            }}
            data-testid="quicklook-content-navigate"
          >
            Detay →
          </button>
        )}
        {onClone && (
          <button
            onClick={onClone}
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              fontSize: typography.size.base,
              fontWeight: typography.weight.medium,
              color: colors.neutral[700],
              background: colors.neutral[50],
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.md,
              cursor: "pointer",
            }}
            data-testid="quicklook-content-clone"
          >
            Klonla
          </button>
        )}
      </div>
    </div>
  );
}
