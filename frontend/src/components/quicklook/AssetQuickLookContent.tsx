/**
 * AssetQuickLookContent — Wave 1
 *
 * QuickLook preview for an asset item.
 * Shows file details, type, size, and quick actions.
 */

import React from "react";
import type { AssetItem } from "../../api/assetApi";
import { colors, typography, spacing, radius } from "../design-system/tokens";
import { StatusBadge, DetailGrid, Mono } from "../design-system/primitives";

interface AssetQuickLookContentProps {
  item: AssetItem;
  onReveal?: () => void;
  onDelete?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function AssetQuickLookContent({ item, onReveal, onDelete }: AssetQuickLookContentProps) {
  return (
    <div data-testid="quicklook-asset-item">
      {/* Header */}
      <div style={{ marginBottom: spacing[4] }}>
        <h4 style={{ margin: 0, fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.neutral[900], wordBreak: "break-all" }}>
          {item.name}
        </h4>
        <div style={{ display: "flex", gap: spacing[2], alignItems: "center", marginTop: spacing[2] }}>
          <StatusBadge status="info" label={item.asset_type} size="md" />
          <span style={{ fontSize: typography.size.sm, color: colors.neutral[500] }}>
            .{item.mime_ext}
          </span>
        </div>
      </div>

      {/* Details */}
      <DetailGrid
        items={[
          { label: "Boyut", value: formatBytes(item.size_bytes) },
          { label: "Tur", value: item.asset_type },
          { label: "Uzanti", value: <Mono>.{item.mime_ext}</Mono> },
          { label: "Kaynak", value: item.source_kind === "job_artifact" ? "Artifact" : "Preview" },
          { label: "Modul", value: item.module_type || "—" },
          { label: "Tarih", value: formatDate(item.discovered_at) },
        ]}
        testId="quicklook-asset-details"
      />

      {/* Relative path */}
      {item.file_path && (
        <div style={{ marginTop: spacing[3], padding: spacing[3], background: colors.neutral[50], borderRadius: radius.md }}>
          <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>Yol:</span>
          <p style={{ margin: `${spacing[1]} 0 0`, fontSize: typography.size.sm, fontFamily: typography.monoFamily, color: colors.neutral[700], wordBreak: "break-all" }}>
            {item.file_path}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: spacing[4], paddingTop: spacing[3], borderTop: `1px solid ${colors.border.subtle}`, display: "flex", gap: spacing[2] }}>
        {onReveal && (
          <button
            onClick={onReveal}
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
            data-testid="quicklook-asset-reveal"
          >
            Konum Goster
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              fontSize: typography.size.base,
              fontWeight: typography.weight.medium,
              color: colors.error.dark,
              background: colors.error.light,
              border: `1px solid ${colors.error.base}20`,
              borderRadius: radius.md,
              cursor: "pointer",
            }}
            data-testid="quicklook-asset-delete"
          >
            Sil
          </button>
        )}
      </div>
    </div>
  );
}
