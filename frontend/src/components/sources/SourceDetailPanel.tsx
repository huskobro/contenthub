import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSourceDetail } from "../../hooks/useSourceDetail";
import { useUpdateSource } from "../../hooks/useUpdateSource";
import { useReadOnly } from "../visibility/ReadOnlyGuard";
import { SourceForm } from "./SourceForm";
import { formatDateTime } from "../../lib/formatDate";
import { isBlank } from "../../lib/isBlank";
import type { SourceCreatePayload } from "../../api/sourcesApi";
import { createSourceScan, executeSourceScan } from "../../api/sourceScansApi";
import { useToast } from "../../hooks/useToast";
import { cn } from "../../lib/cn";

interface SourceDetailPanelProps {
  sourceId: string | null;
}

function Field({ label, value }: { label: string; value: string | null }) {
  const blank = isBlank(value);
  return (
    <div className="mb-1">
      <span className="text-sm font-semibold text-neutral-500">{label}: </span>
      <span className={cn("text-sm break-words [overflow-wrap:anywhere]", blank ? "text-neutral-600" : "text-neutral-800")}>
        {blank ? "—" : value}
      </span>
    </div>
  );
}

function UrlField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mb-1">
      <span className="text-sm font-semibold text-neutral-600">{label}: </span>
      {!isBlank(value) ? (
        <span className="text-base text-brand-700 break-all [overflow-wrap:anywhere] font-mono">
          {value}
        </span>
      ) : (
        <span className="text-sm text-neutral-500">—</span>
      )}
    </div>
  );
}

function ScanModeBadge({ scanMode }: { scanMode: string | null }) {
  if (!scanMode) return <span className="text-sm text-neutral-500">--</span>;

  const config: Record<string, { label: string; bg: string; text: string }> = {
    auto: { label: "Otomatik Tarama Aktif", bg: "bg-success-light", text: "text-success-dark" },
    manual: { label: "Manuel Tarama", bg: "bg-neutral-100", text: "text-neutral-700" },
    curated: { label: "Kuratorlu Tarama", bg: "bg-info-light", text: "text-info-dark" },
  };

  const c = config[scanMode] ?? { label: scanMode, bg: "bg-neutral-100", text: "text-neutral-700" };

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium", c.bg, c.text)}>
      {c.label}
    </span>
  );
}

export function SourceDetailPanel({ sourceId }: SourceDetailPanelProps) {
  const readOnly = useReadOnly();
  const [editMode, setEditMode] = useState(false);
  const { data: source, isLoading, isError, error } = useSourceDetail(sourceId);
  const { mutate: updateMutate, isPending: isUpdating, error: updateError } = useUpdateSource(sourceId ?? "");
  const toast = useToast();
  const queryClient = useQueryClient();

  const { mutate: scanNow, isPending: isScanning } = useMutation({
    mutationFn: async () => {
      if (!sourceId) throw new Error("Kaynak secili degil");
      const scan = await createSourceScan({ source_id: sourceId, scan_mode: "manual" });
      return executeSourceScan(scan.id, false);
    },
    onSuccess: (result) => {
      toast.success(`Tarama tamamlandi: ${result.new_count} yeni haber kaydedildi`);
      queryClient.invalidateQueries({ queryKey: ["source-scans"] });
      queryClient.invalidateQueries({ queryKey: ["news-items"] });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || "Tarama basarisiz";
      toast.error(`Tarama hatasi: ${detail}`);
    },
  });

  // Reset edit mode when selected source changes
  const [prevSourceId, setPrevSourceId] = useState(sourceId);
  if (sourceId !== prevSourceId) {
    setPrevSourceId(sourceId);
    setEditMode(false);
  }

  if (!sourceId) {
    return (
      <div className="p-8 text-neutral-500 text-sm text-center border border-dashed border-border-subtle rounded-md">
        Bir source seçin.
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

  if (!source) return null;

  if (editMode) {
    return (
      <div>
        <h3 className="m-0 mb-4 text-lg font-semibold text-neutral-900">Düzenle: {source.name}</h3>
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
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="m-0 text-lg font-semibold text-neutral-900">{source.name}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scanNow()}
            disabled={isScanning || source.source_type !== "rss"}
            title={source.source_type !== "rss" ? "Şu an yalnızca RSS kaynaklar taranabilir" : undefined}
            className={cn(
              "px-3 py-1 bg-transparent border rounded-sm text-sm",
              source.source_type !== "rss"
                ? "text-neutral-400 border-neutral-200 cursor-not-allowed opacity-50"
                : isScanning
                ? "text-success-dark border-success cursor-not-allowed opacity-50"
                : "text-success-dark border-success cursor-pointer hover:bg-success-light transition-colors duration-fast"
            )}
          >
            {isScanning ? "Taraniyor..." : "Şimdi Tara"}
          </button>
          <button
            onClick={() => setEditMode(true)}
            disabled={readOnly}
            className={cn(
              "px-3 py-1 bg-transparent text-brand-700 border border-info-light rounded-sm text-base",
              readOnly ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-info-light transition-colors duration-fast"
            )}
          >
            Düzenle
          </button>
        </div>
      </div>

      <Field label="Source Type" value={source.source_type} />
      <Field label="Status" value={source.status} />
      <Field label="Trust Level" value={source.trust_level} />
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-semibold text-neutral-500">Scan Mode: </span>
        <ScanModeBadge scanMode={source.scan_mode} />
      </div>
      <Field label="Language" value={source.language} />
      <Field label="Category" value={source.category} />

      <div className="mt-2 border-t border-border-subtle pt-2">
        <UrlField label="Base URL" value={source.base_url} />
        <UrlField label="Feed URL" value={source.feed_url} />
        <UrlField label="API Endpoint" value={source.api_endpoint} />
      </div>

      {!isBlank(source.notes) && (
        <div className="mt-2 border-t border-border-subtle pt-2">
          <Field label="Notes" value={source.notes} />
        </div>
      )}

      {/* M41c: Son tarama ve otomatik tarama bilgisi */}
      <div className="mt-2 border-t border-border-subtle pt-2">
        {source.last_scan_finished_at && (
          <Field label="Son Tarama" value={formatDateTime(source.last_scan_finished_at)} />
        )}
        {!source.last_scan_finished_at && (
          <div className="mb-1">
            <span className="text-sm font-semibold text-neutral-500">Son Tarama: </span>
            <span className="text-sm text-neutral-500">Henüz taranmadı</span>
          </div>
        )}
        {source.last_scan_status && (
          <div className="mb-1">
            <span className="text-sm font-semibold text-neutral-500">Son Tarama Sonucu: </span>
            <span className={cn(
              "text-sm font-medium",
              source.last_scan_status === "completed" ? "text-success-dark" :
              source.last_scan_status === "failed" ? "text-error" : "text-neutral-600"
            )}>
              {source.last_scan_status === "completed" ? "Başarılı" :
               source.last_scan_status === "failed" ? "Hata" :
               source.last_scan_status}
            </span>
          </div>
        )}
        {source.scan_mode === "auto" && source.last_scan_finished_at && (
          <div className="mb-1">
            <span className="text-sm font-semibold text-neutral-500">Sonraki Otomatik Tarama: </span>
            <span className="text-sm text-info-dark">
              {(() => {
                const last = new Date(source.last_scan_finished_at);
                const next = new Date(last.getTime() + 5 * 60 * 1000); // 5dk interval
                const now = new Date();
                if (next <= now) return "Yakında (bekleniyor)";
                const diffMs = next.getTime() - now.getTime();
                const mins = Math.ceil(diffMs / 60000);
                return `~${mins} dakika sonra`;
              })()}
            </span>
          </div>
        )}
        {source.scan_mode === "auto" && !source.last_scan_finished_at && (
          <div className="mb-1">
            <span className="text-sm font-semibold text-neutral-500">Otomatik Tarama: </span>
            <span className="text-sm text-info-dark">Uygulama başlayınca ilk tarama tetiklenir</span>
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-border-subtle pt-2">
        <Field label="Created" value={formatDateTime(source.created_at)} />
        <Field label="Updated" value={formatDateTime(source.updated_at)} />
      </div>
    </div>
  );
}
