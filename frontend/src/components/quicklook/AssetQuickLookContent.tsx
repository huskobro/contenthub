/**
 * AssetQuickLookContent — Wave 1
 *
 * QuickLook preview for an asset item.
 * Shows file details, type, size, and quick actions.
 */

import React from "react";
import type { AssetItem } from "../../api/assetApi";
import { StatusBadge, DetailGrid, Mono } from "../design-system/primitives";
import { formatDateShort } from "../../lib/formatDate";

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
  return formatDateShort(iso, "\u2014");
}

export function AssetQuickLookContent({ item, onReveal, onDelete }: AssetQuickLookContentProps) {
  return (
    <div data-testid="quicklook-asset-item">
      {/* Header */}
      <div className="mb-4">
        <h4 className="m-0 text-md font-semibold text-neutral-900 break-all">
          {item.name}
        </h4>
        <div className="flex gap-2 items-center mt-2">
          <StatusBadge status="info" label={item.asset_type} size="md" />
          <span className="text-sm text-neutral-500">
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
          { label: "Modul", value: item.module_type || "\u2014" },
          { label: "Tarih", value: formatDate(item.discovered_at) },
        ]}
        testId="quicklook-asset-details"
      />

      {/* Relative path */}
      {item.file_path && (
        <div className="mt-3 p-3 bg-neutral-50 rounded-md">
          <span className="text-xs text-neutral-500">Yol:</span>
          <p className="mt-1 mb-0 text-sm font-mono text-neutral-700 break-all">
            {item.file_path}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-border-subtle flex gap-2">
        {onReveal && (
          <button
            onClick={onReveal}
            className="py-2 px-4 text-base font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-md cursor-pointer hover:bg-brand-100"
            data-testid="quicklook-asset-reveal"
          >
            Konum Goster
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="py-2 px-4 text-base font-medium text-error-dark bg-error-light border border-error-base/20 rounded-md cursor-pointer hover:bg-error-base/10"
            data-testid="quicklook-asset-delete"
          >
            Sil
          </button>
        )}
      </div>
    </div>
  );
}
