/**
 * PromptBlockDetailPanel — side panel for viewing and editing a prompt block.
 * Fixed position right panel with overlay backdrop.
 */

import { useState, useEffect } from "react";
import { useUpdatePromptBlock } from "../../hooks/usePromptBlocks";
import { useToast } from "../../hooks/useToast";
import { ActionButton } from "../design-system/primitives";
import type { PromptBlockResponse } from "../../api/promptAssemblyApi";
import { cn } from "../../lib/cn";

// Kinds that cannot be disabled
const PROTECTED_KINDS = new Set(["core_system", "output_contract"]);

interface PromptBlockDetailPanelProps {
  block: PromptBlockResponse;
  onClose: () => void;
  onUpdate: (updated: PromptBlockResponse) => void;
}

export function PromptBlockDetailPanel({ block, onClose, onUpdate }: PromptBlockDetailPanelProps) {
  const [overrideText, setOverrideText] = useState(block.admin_override_template ?? "");
  const [dirty, setDirty] = useState(false);
  const toast = useToast();
  const updateMutation = useUpdatePromptBlock();

  // Reset local state when block changes
  useEffect(() => {
    setOverrideText(block.admin_override_template ?? "");
    setDirty(false);
  }, [block.id, block.admin_override_template]);

  const isProtected = PROTECTED_KINDS.has(block.kind);
  const isSaving = updateMutation.isPending;

  function handleSave() {
    updateMutation.mutate(
      {
        id: block.id,
        payload: { admin_override_template: overrideText || null },
      },
      {
        onSuccess: (updated) => {
          toast.success("Override kaydedildi.");
          setDirty(false);
          onUpdate(updated);
        },
        onError: () => {
          toast.error("Kaydetme başarısız.");
        },
      }
    );
  }

  function handleReset() {
    updateMutation.mutate(
      {
        id: block.id,
        payload: { admin_override_template: null },
      },
      {
        onSuccess: (updated) => {
          toast.success("Override temizlendi, varsayılan aktif.");
          setOverrideText("");
          setDirty(false);
          onUpdate(updated);
        },
        onError: () => {
          toast.error("Sıfırlama başarısız.");
        },
      }
    );
  }

  function handleToggleStatus() {
    if (isProtected) return;
    const newStatus = block.status === "active" ? "disabled" : "active";
    updateMutation.mutate(
      {
        id: block.id,
        payload: { status: newStatus },
      },
      {
        onSuccess: (updated) => {
          toast.success(`Blok ${newStatus === "active" ? "aktif" : "devre dışı"} edildi.`);
          onUpdate(updated);
        },
        onError: () => {
          toast.error("Durum değişikliği başarısız.");
        },
      }
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
        data-testid="prompt-block-panel-backdrop"
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[420px] max-w-full bg-surface-card border-l border-border-subtle shadow-xl z-50 flex flex-col overflow-hidden"
        data-testid="prompt-block-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Prompt Bloğu: ${block.title}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border-subtle shrink-0">
          <div className="min-w-0">
            <h3 className="m-0 text-base font-bold text-neutral-900 truncate">
              {block.title}
            </h3>
            <code className="text-xs font-mono text-neutral-400 mt-0.5 block">
              {block.key}
            </code>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 ml-2 p-1 rounded hover:bg-surface-inset text-neutral-500 hover:text-neutral-800 transition-colors"
            aria-label="Kapat"
            data-testid="prompt-block-panel-close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-surface-inset rounded p-2">
              <span className="text-neutral-500 text-xs font-medium block mb-0.5">Kind</span>
              <span className="font-mono text-neutral-800 text-xs">{block.kind}</span>
            </div>
            <div className="bg-surface-inset rounded p-2">
              <span className="text-neutral-500 text-xs font-medium block mb-0.5">Order</span>
              <span className="font-mono text-neutral-800 text-xs">{block.order_index}</span>
            </div>
            <div className="bg-surface-inset rounded p-2">
              <span className="text-neutral-500 text-xs font-medium block mb-0.5">Condition</span>
              <span className="font-mono text-neutral-800 text-xs">{block.condition_type}</span>
            </div>
            <div className="bg-surface-inset rounded p-2">
              <span className="text-neutral-500 text-xs font-medium block mb-0.5">Version</span>
              <span className="font-mono text-neutral-800 text-xs">v{block.version}</span>
            </div>
          </div>

          {/* Help text */}
          {block.help_text && (
            <p className="text-sm text-neutral-600 bg-info-light border border-info rounded p-3 m-0">
              {block.help_text}
            </p>
          )}

          {/* Status control */}
          <div className="flex items-center justify-between py-2 px-3 bg-surface-inset rounded border border-border-subtle">
            <div>
              <span className="text-sm font-medium text-neutral-800">Durum</span>
              <span
                className={cn(
                  "ml-2 text-xs font-semibold px-2 py-0.5 rounded-full",
                  block.status === "active"
                    ? "bg-success-light text-success-text"
                    : "bg-error-light text-error-text"
                )}
              >
                {block.status === "active" ? "Aktif" : "Devre Dışı"}
              </span>
            </div>
            {isProtected ? (
              <span className="text-xs text-neutral-400">Korumalı — değiştirilemez</span>
            ) : (
              <ActionButton
                variant="ghost"
                size="sm"
                onClick={handleToggleStatus}
                disabled={isSaving}
                data-testid="prompt-block-toggle-status"
              >
                {block.status === "active" ? "Devre Dışı Bırak" : "Aktifleştir"}
              </ActionButton>
            )}
          </div>

          {/* Default template (read-only) */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1.5">
              Varsayılan Şablon (salt okunur)
            </label>
            <textarea
              readOnly
              value={block.content_template}
              rows={6}
              className="w-full py-2 px-3 border border-border-subtle rounded-md text-xs font-mono bg-surface-inset text-neutral-700 outline-none resize-y opacity-80 cursor-default"
            />
          </div>

          {/* Admin override template */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1.5">
              Admin Override
              {block.admin_override_template && (
                <span className="ml-2 text-info-text text-xs font-normal normal-case bg-info-light px-1.5 py-0.5 rounded">
                  Aktif
                </span>
              )}
            </label>
            <textarea
              value={overrideText}
              onChange={(e) => {
                setOverrideText(e.target.value);
                setDirty(true);
              }}
              rows={6}
              placeholder="Override şablonu giriniz. Boş bırakırsanız varsayılan kullanılır."
              disabled={isSaving}
              className="w-full py-2 px-3 border border-border-subtle rounded-md text-xs font-mono bg-surface-card text-neutral-800 outline-none resize-y transition-all focus:border-brand-400 focus:ring-[3px] focus:ring-brand-100"
              data-testid="prompt-block-override-textarea"
            />
          </div>

          {/* Condition config JSON (if present) */}
          {block.condition_config_json && (
            <div>
              <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1.5">
                Condition Config
              </label>
              <pre className="text-xs font-mono bg-surface-inset border border-border-subtle rounded p-2 overflow-auto max-h-[100px] m-0">
                {block.condition_config_json}
              </pre>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-border-subtle flex gap-2 shrink-0 bg-surface-card">
          {block.admin_override_template && (
            <ActionButton
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
              data-testid="prompt-block-reset-override"
            >
              Varsayılana Sıfırla
            </ActionButton>
          )}
          <ActionButton
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!dirty || isSaving}
            loading={isSaving}
            data-testid="prompt-block-save-override"
            className="ml-auto"
          >
            Override Kaydet
          </ActionButton>
        </div>
      </div>
    </>
  );
}
