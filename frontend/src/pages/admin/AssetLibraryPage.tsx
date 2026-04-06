import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAssetList } from "../../hooks/useAssetList";
import {
  refreshAssets,
  deleteAsset,
  revealAsset,
  uploadAsset,
  AssetItem,
  AssetRevealResponse,
} from "../../api/assetApi";
import {
  PageShell,
  SectionShell,
  DataTable,
  FilterBar,
  FilterInput,
  FilterSelect,
  ActionButton,
  StatusBadge,
  Pagination,
  Mono,
} from "../../components/design-system/primitives";
import { Sheet } from "../../components/design-system/Sheet";
import { QuickLook, useQuickLookTrigger } from "../../components/design-system/QuickLook";
import { ConfirmAction } from "../../components/design-system/ConfirmAction";
import { AssetQuickLookContent } from "../../components/quicklook/AssetQuickLookContent";
import { useScopedKeyboardNavigation } from "../../hooks/useScopedKeyboardNavigation";
import { useSearchFocus } from "../../hooks/useSearchFocus";
import { useToast } from "../../hooks/useToast";

const ASSET_TYPE_OPTIONS = [
  { value: "", label: "Tum Turler" },
  { value: "audio", label: "Ses" },
  { value: "video", label: "Video" },
  { value: "image", label: "Gorsel" },
  { value: "data", label: "Veri" },
  { value: "text", label: "Metin" },
  { value: "subtitle", label: "Altyazi" },
  { value: "document", label: "Dokuman" },
  { value: "other", label: "Diger" },
];

function typeColor(assetType: string): string {
  switch (assetType) {
    case "audio": return "info";
    case "video": return "processing";
    case "image": return "ready";
    case "data": return "warning";
    case "text": return "draft";
    case "subtitle": return "review";
    default: return "draft";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

const PAGE_SIZE = 50;

export function AssetLibraryPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revealData, setRevealData] = useState<AssetRevealResponse | null>(null);
  const [revealSheetOpen, setRevealSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [quickLookOpen, setQuickLookOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError } = useAssetList({ asset_type: typeFilter || undefined, search: searchQuery || undefined, limit: PAGE_SIZE, offset });
  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const { activeIndex, handleKeyDown } = useScopedKeyboardNavigation({ scopeId: "asset-library-table", scopeLabel: "Asset Library", itemCount: items.length, onSelect: (i) => { if (items[i]) setQuickLookOpen(true); }, enabled: !quickLookOpen && !revealSheetOpen });
  useQuickLookTrigger({ enabled: items.length > 0 && !quickLookOpen && !revealSheetOpen, onToggle: () => setQuickLookOpen(true), scopeId: "asset-library-table" });
  useSearchFocus(searchInputRef, { enabled: !quickLookOpen && !revealSheetOpen });

  const activeItem = items[activeIndex] ?? null;

  const handleRefresh = useCallback(async () => { setRefreshing(true); try { const result = await refreshAssets(); queryClient.invalidateQueries({ queryKey: ["assets"] }); toast.success(result.message); } catch { toast.error("Yenileme basarisiz oldu."); } finally { setRefreshing(false); } }, [queryClient, toast]);
  const handleDelete = useCallback(async (item: AssetItem) => { setDeletingId(item.id); try { const result = await deleteAsset(item.id); queryClient.invalidateQueries({ queryKey: ["assets"] }); toast.success(result.message); } catch (err: unknown) { const msg = err instanceof Error ? err.message : "Silme basarisiz oldu."; toast.error(msg); } finally { setDeletingId(null); } }, [queryClient, toast]);
  const handleReveal = useCallback(async (item: AssetItem) => { try { const result = await revealAsset(item.id); setRevealData(result); setRevealSheetOpen(true); } catch { toast.error("Konum bilgisi alinamadi."); } }, [toast]);
  const handleUpload = useCallback(async () => { const file = fileInputRef.current?.files?.[0]; if (!file) return; setUploading(true); try { const result = await uploadAsset(file); queryClient.invalidateQueries({ queryKey: ["assets"] }); toast.success(result.message || `"${result.name}" basariyla yuklendi.`); if (fileInputRef.current) fileInputRef.current.value = ""; } catch (err: unknown) { const msg = err instanceof Error ? err.message : "Dosya yukleme basarisiz oldu."; toast.error(msg); } finally { setUploading(false); } }, [queryClient, toast]);

  const columns = [
    { key: "name", header: "Dosya Adi", render: (item: AssetItem) => (<span><span className="font-medium">{item.name}</span><span className="text-xs text-neutral-500 ml-2">.{item.mime_ext}</span></span>) },
    { key: "type", header: "Tur", render: (item: AssetItem) => <StatusBadge status={typeColor(item.asset_type)} label={item.asset_type} /> },
    { key: "source", header: "Kaynak", render: (item: AssetItem) => <span className="text-sm text-neutral-600">{item.source_kind === "job_artifact" ? "Artifact" : "Preview"}</span> },
    { key: "size", header: "Boyut", align: "right" as const, render: (item: AssetItem) => <span className="tabular-nums">{formatBytes(item.size_bytes)}</span> },
    { key: "module", header: "Modul", render: (item: AssetItem) => <span className="text-sm text-neutral-600">{item.module_type || "—"}</span> },
    { key: "date", header: "Tarih", render: (item: AssetItem) => <span className="text-sm text-neutral-600">{formatDate(item.discovered_at)}</span> },
    { key: "actions", header: "Aksiyonlar", render: (item: AssetItem) => (
      <div className="flex gap-1" data-testid={`asset-actions-${item.id}`}>
        <ActionButton variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleReveal(item); }} title="Konum bilgisi" data-testid={`asset-reveal-${item.id}`}>Konum</ActionButton>
        <ConfirmAction label="Sil" confirmLabel="Evet, Sil" onConfirm={() => handleDelete(item)} variant="danger" size="sm" disabled={deletingId === item.id} testId={`asset-delete-${item.id}`} />
      </div>
    ) },
  ];

  return (
    <PageShell title="Varlik Kutuphanesi" subtitle="Workspace artifact ve preview dosyalari." testId="asset-library" actions={<ActionButton variant="secondary" size="sm" loading={refreshing} onClick={handleRefresh} data-testid="asset-refresh-btn">{refreshing ? "Taraniyor..." : "Yenile"}</ActionButton>}>
      <SectionShell title="Dosya Yukle" testId="asset-upload-area">
        <div data-testid="asset-upload-heading" className="hidden">Dosya Y&uuml;kle</div>
        <div className="flex gap-2 items-center">
          <input type="file" ref={fileInputRef} className="text-base" data-testid="asset-upload-input" disabled={uploading} />
          <ActionButton variant="primary" size="sm" loading={uploading} onClick={handleUpload} data-testid="asset-upload-btn">{uploading ? "Yükleniyor..." : "Yükle"}</ActionButton>
        </div>
      </SectionShell>

      <div data-testid="asset-filter-area" className="mb-4">
        <FilterBar testId="asset-filters-active">
          <FilterInput ref={searchInputRef} type="text" placeholder="Dosya adi ara... ( / )" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setOffset(0); }} data-testid="asset-search-input" />
          <FilterSelect value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }} data-testid="asset-type-filter">
            {ASSET_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </FilterSelect>
          {(searchQuery || typeFilter) && <ActionButton variant="secondary" size="sm" onClick={() => { setSearchQuery(""); setTypeFilter(""); setOffset(0); }} data-testid="asset-filter-clear">Temizle</ActionButton>}
        </FilterBar>
      </div>

      <div onKeyDown={handleKeyDown} tabIndex={0} className="outline-none">
        <SectionShell flush title={`Varliklar (${total})`} testId="asset-list-section">
          <span data-testid="asset-total-count" className="hidden">Toplam: {total}</span>
          {!isLoading && !isError && items.length === 0 ? (
            <div className="text-center py-8 px-4 text-neutral-500" data-testid="asset-library-empty-state">
              <p className="m-0 text-md">{total === 0 && !searchQuery && !typeFilter ? "Workspace dizinlerinde henuz artifact veya preview dosyasi bulunmuyor." : "Filtrelere uygun varlik bulunamadi."}</p>
            </div>
          ) : (
            <DataTable<AssetItem> columns={columns} data={items} keyFn={(item) => item.id} loading={isLoading} error={isError} errorMessage="Varliklar yuklenirken hata olustu." emptyMessage={total === 0 && !searchQuery && !typeFilter ? "Workspace dizinlerinde henuz artifact veya preview dosyasi bulunmuyor." : "Filtrelere uygun varlik bulunamadi."} testId="asset-table" />
          )}
          <div data-testid="asset-pagination"><Pagination offset={offset} limit={PAGE_SIZE} total={total} onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))} onNext={() => setOffset(offset + PAGE_SIZE)} /></div>
        </SectionShell>
      </div>

      <Sheet open={revealSheetOpen && !!revealData} onClose={() => setRevealSheetOpen(false)} title="Konum Bilgisi" testId="asset-reveal-sheet" width="440px">
        {revealData && (
          <div className="text-sm text-neutral-800">
            <p className="my-1"><strong>Dosya:</strong> <Mono>{revealData.absolute_path}</Mono></p>
            <p className="my-1"><strong>Dizin:</strong> <Mono>{revealData.directory}</Mono></p>
            <p className="my-1"><strong>Durum:</strong> {revealData.exists ? "Mevcut" : "Bulunamadi"}</p>
          </div>
        )}
      </Sheet>

      <QuickLook open={quickLookOpen} onClose={() => setQuickLookOpen(false)} title="Varlik On Izleme" testId="asset-quicklook">
        {activeItem && <AssetQuickLookContent item={activeItem} onReveal={() => { setQuickLookOpen(false); handleReveal(activeItem); }} onDelete={() => { setQuickLookOpen(false); handleDelete(activeItem); }} />}
      </QuickLook>
    </PageShell>
  );
}
