/**
 * ContentQuickLookContent — Wave 1
 *
 * QuickLook preview for a content library item.
 * Shows title, type, status, content flags, and quick actions.
 */

import React from "react";
import type { ContentLibraryItem } from "../../api/contentLibraryApi";
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
    return "\u2014";
  }
}

export function ContentQuickLookContent({ item, onNavigate, onClone }: ContentQuickLookContentProps) {
  const typeLabel = item.content_type === "standard_video" ? "Standart Video" : "Haber Bulteni";

  return (
    <div data-testid="quicklook-content-item">
      {/* Header */}
      <div className="mb-4">
        <h4 className="m-0 text-md font-semibold text-neutral-900">
          {item.title || item.topic}
        </h4>
        <div className="flex gap-2 items-center mt-2">
          <StatusBadge status={item.status} size="md" />
          <span className="text-sm text-neutral-600">{typeLabel}</span>
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
      <div className="mt-4 pt-3 border-t border-border-subtle flex gap-2">
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="py-2 px-4 text-base font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-md cursor-pointer hover:bg-brand-100"
            data-testid="quicklook-content-navigate"
          >
            Detay &rarr;
          </button>
        )}
        {onClone && (
          <button
            onClick={onClone}
            className="py-2 px-4 text-base font-medium text-neutral-700 bg-neutral-50 border border-border rounded-md cursor-pointer hover:bg-neutral-100"
            data-testid="quicklook-content-clone"
          >
            Klonla
          </button>
        )}
      </div>
    </div>
  );
}
